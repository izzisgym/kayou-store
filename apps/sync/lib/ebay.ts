import crypto from "node:crypto";

import { env, readRequired } from "@/lib/env";
import { generateEbayListingCopy } from "@/lib/claude";
import { getMetaValue } from "@/lib/woocommerce";
import type { WooProduct } from "@/lib/woocommerce";

type EbayOffer = {
  offerId: string;
  listingId?: string;
  listingUri?: string;
};

type PublicKeyResponse = {
  key?: string;
  publicKey?: string;
};

const SELL_SCOPES = [
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  "https://api.ebay.com/oauth/api_scope/sell.account",
].join(" ");

function ebayBaseUrl() {
  return env.ebaySandbox ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
}

async function getAccessToken() {
  const clientId = readRequired("EBAY_CLIENT_ID");
  const clientSecret = readRequired("EBAY_CLIENT_SECRET");

  const response = await fetch(`${ebayBaseUrl()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: SELL_SCOPES,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`eBay token error ${response.status}`);
  }

  const json = (await response.json()) as { access_token: string };
  return json.access_token;
}

async function ebayRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${ebayBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`eBay API error ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export function buildChallengeResponse(challengeCode: string, endpoint: string) {
  const verificationToken = readRequired("EBAY_NOTIFICATION_VERIFICATION_TOKEN");
  const hash = crypto.createHash("sha256");
  hash.update(challengeCode);
  hash.update(verificationToken);
  hash.update(endpoint);
  return hash.digest("hex");
}

export async function verifyEbayNotificationSignature(
  rawBody: string,
  signatureHeader: string,
) {
  const decoded = JSON.parse(
    Buffer.from(signatureHeader, "base64").toString("utf8"),
  ) as {
    alg?: string;
    kid?: string;
    signature?: string;
    digest?: string;
  };

  if (!decoded.kid || !decoded.signature) {
    throw new Error("Missing eBay signature key data");
  }

  const key = await ebayRequest<PublicKeyResponse>(
    "GET",
    `/commerce/notification/v1/public_key/${decoded.kid}`,
  );
  const publicKey = key.publicKey ?? key.key;

  if (!publicKey) {
    throw new Error("Unable to fetch eBay public key");
  }

  const algorithm = decoded.digest?.toLowerCase() === "sha1" ? "sha1" : "sha256";

  return crypto.verify(
    algorithm,
    Buffer.from(rawBody, "utf8"),
    publicKey,
    Buffer.from(decoded.signature, "base64"),
  );
}

export async function relistProductOnEbay(product: WooProduct, availableQuantity: number) {
  const sku = product.sku;
  const price = product.regular_price || product.price || "0.00";

  // Priority: manual meta override → AI-generated → raw WooCommerce fields
  const manualTitle = getMetaValue(product, "_kayou_ebay_title");
  const manualDescription = getMetaValue(product, "_kayou_ebay_description");

  let title: string;
  let description: string;

  if (manualTitle && manualDescription) {
    title = manualTitle.slice(0, 80);
    description = manualDescription;
  } else if (env.anthropicApiKey) {
    const generated = await generateEbayListingCopy(product);
    title = manualTitle ? manualTitle.slice(0, 80) : generated.title;
    description = manualDescription ?? generated.description;
  } else {
    title = (manualTitle ?? product.name).slice(0, 80);
    description =
      manualDescription ||
      product.short_description ||
      product.description ||
      product.name;
  }

  await ebayRequest(
    "PUT",
    `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
    {
      availability: {
        shipToLocationAvailability: {
          quantity: availableQuantity,
        },
      },
      condition: "NEW",
      product: {
        title,
        description,
      },
    },
  );

  const offerBody = {
    sku,
    marketplaceId: env.ebayMarketplaceId,
    format: "FIXED_PRICE",
    availableQuantity: availableQuantity,
    categoryId: readRequired("EBAY_CATEGORY_ID"),
    merchantLocationKey: readRequired("EBAY_MERCHANT_LOCATION_KEY"),
    listingDescription: description,
    pricingSummary: {
      price: {
        value: price,
        currency: "USD",
      },
    },
    listingPolicies: {
      fulfillmentPolicyId: readRequired("EBAY_FULFILLMENT_POLICY_ID"),
      paymentPolicyId: readRequired("EBAY_PAYMENT_POLICY_ID"),
      returnPolicyId: readRequired("EBAY_RETURN_POLICY_ID"),
    },
  };

  const existingOfferId = getMetaValue(product, "_kayou_ebay_offer_id");

  let offer: EbayOffer;
  if (existingOfferId) {
    await ebayRequest("PUT", `/sell/inventory/v1/offer/${existingOfferId}`, offerBody);
    offer = { offerId: existingOfferId };
  } else {
    offer = await ebayRequest<EbayOffer>("POST", "/sell/inventory/v1/offer", offerBody);
  }

  const published = await ebayRequest<EbayOffer>(
    "POST",
    `/sell/inventory/v1/offer/${offer.offerId}/publish`,
  );

  return {
    offerId: published.offerId ?? offer.offerId,
    listingId: published.listingId ?? offer.listingId ?? "",
    listingUrl: published.listingUri ?? offer.listingUri ?? "",
  };
}
