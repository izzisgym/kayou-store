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
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  "https://api.ebay.com/oauth/api_scope/sell.account",
].join(" ");

function ebayBaseUrl() {
  return env.ebaySandbox ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
}

async function getAccessToken(useUserToken = false) {
  const clientId = readRequired("EBAY_CLIENT_ID");
  const clientSecret = readRequired("EBAY_CLIENT_SECRET");
  const basicAuth = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;

  // Read refresh token at call time (not module load time) to avoid caching issues
  const refreshToken = process.env["EBAY_REFRESH_TOKEN"];
  console.log("[ebay] getAccessToken useUserToken=%s hasRefreshToken=%s", useUserToken, Boolean(refreshToken));

  // Use refresh token for sell API calls if available
  if (useUserToken && refreshToken) {
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken);
    params.append("scope", SELL_SCOPES);

    const response = await fetch(`${ebayBaseUrl()}/identity/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: basicAuth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(`eBay token error ${response.status}: ${errBody}`);
    }

    const json = (await response.json()) as { access_token: string };
    return json.access_token;
  }

  // Fall back to client credentials for public scopes
  const response = await fetch(`${ebayBaseUrl()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`eBay token error ${response.status}: ${errBody}`);
  }

  const json = (await response.json()) as { access_token: string };
  return json.access_token;
}

async function ebayRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  useUserToken = false,
): Promise<T> {
  const token = await getAccessToken(useUserToken);
  const response = await fetch(`${ebayBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept-Language": "en-US",
      "Content-Language": "en-US",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`eBay API error ${response.status} on ${method} ${path}: ${errBody}`);
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

export type SoldListing = {
  title: string;
  soldPrice: string;
  soldDate: string;
  url: string;
};

export async function searchSoldListings(keywords: string, limit = 3): Promise<SoldListing[]> {
  const clientId = readRequired("EBAY_CLIENT_ID");

  const params = new URLSearchParams({
    "OPERATION-NAME": "findCompletedItems",
    "SERVICE-VERSION": "1.0.0",
    "SECURITY-APPNAME": clientId,
    "RESPONSE-DATA-FORMAT": "JSON",
    "REST-PAYLOAD": "",
    "GLOBAL-ID": "EBAY-US",
    keywords,
    "itemFilter(0).name": "SoldItemsOnly",
    "itemFilter(0).value": "true",
    "itemFilter(1).name": "LocatedIn",
    "itemFilter(1).value": "US",
    sortOrder: "EndTimeSoonest",
    "paginationInput.entriesPerPage": String(limit),
    "paginationInput.pageNumber": "1",
  });

  const response = await fetch(
    `https://svcs.ebay.com/services/search/FindingService/v1?${params.toString()}`,
    { cache: "no-store" },
  );

  const json = (await response.json()) as {
    errorMessage?: Array<{ error?: Array<{ message?: string[] }> }>;
    findCompletedItemsResponse?: Array<{
      ack?: string[];
      errorMessage?: Array<{ error?: Array<{ message?: string[] }> }>;
      searchResult?: Array<{
        item?: Array<{
          title?: string[];
          sellingStatus?: Array<{ currentPrice?: Array<{ __value__?: string }> }>;
          listingInfo?: Array<{ endTime?: string[] }>;
          viewItemURL?: string[];
        }>;
      }>;
    }>;
  };

  // Surface any top-level or response-level errors
  const topError = json.errorMessage?.[0]?.error?.[0]?.message?.[0];
  if (topError) throw new Error(`eBay Finding API: ${topError}`);

  const responseRoot = json.findCompletedItemsResponse?.[0];
  const responseError = responseRoot?.errorMessage?.[0]?.error?.[0]?.message?.[0];
  if (responseError) throw new Error(`eBay Finding API: ${responseError}`);

  const items = responseRoot?.searchResult?.[0]?.item ?? [];

  return items.slice(0, limit).map((item) => ({
    title: item.title?.[0] ?? "",
    soldPrice: item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ ?? "0.00",
    soldDate: item.listingInfo?.[0]?.endTime?.[0] ?? "",
    url: item.viewItemURL?.[0] ?? "",
  }));
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
      condition: "LIKE_NEW",
      product: {
        title,
        description,
        aspects: {},
      },
    },
    true,
  );

  const offerBody = {
    sku,
    marketplaceId: env.ebayMarketplaceId,
    format: "FIXED_PRICE",
    availableQuantity: availableQuantity,
    categoryId: readRequired("EBAY_CATEGORY_ID"),
    conditionId: "3000",
    merchantLocationKey: readRequired("EBAY_MERCHANT_LOCATION_KEY"),
    listingDescription: description,
    pricingSummary: {
      price: {
        value: price,
        currency: "USD",
      },
      bestOfferEnabled: true,
      ...(env.bestOfferAutoAcceptPrice && {
        bestOfferAutoAcceptPrice: { value: env.bestOfferAutoAcceptPrice, currency: "USD" },
      }),
      ...(env.bestOfferAutoDeclinePrice && {
        bestOfferAutoDeclinePrice: { value: env.bestOfferAutoDeclinePrice, currency: "USD" },
      }),
    },
    listingPolicies: {
      fulfillmentPolicyId: readRequired("EBAY_FULFILLMENT_POLICY_ID"),
      paymentPolicyId: readRequired("EBAY_PAYMENT_POLICY_ID"),
      returnPolicyId: readRequired("EBAY_RETURN_POLICY_ID"),
    },
  };

  const existingOfferId = getMetaValue(product, "_kayou_ebay_offer_id");

  // Also check eBay directly for an offer on this SKU in case WC meta is stale
  let resolvedOfferId = existingOfferId;
  if (!resolvedOfferId) {
    try {
      const offersResponse = await ebayRequest<{ offers?: Array<{ offerId: string }> }>(
        "GET",
        `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}`,
        undefined,
        true,
      );
      resolvedOfferId = offersResponse.offers?.[0]?.offerId;
    } catch {
      // No offer found — will create a new one
    }
  }

  let offer: EbayOffer;
  if (resolvedOfferId) {
    await ebayRequest("PUT", `/sell/inventory/v1/offer/${resolvedOfferId}`, offerBody, true);
    offer = { offerId: resolvedOfferId };
  } else {
    offer = await ebayRequest<EbayOffer>("POST", "/sell/inventory/v1/offer", offerBody, true);
  }

  const published = await ebayRequest<EbayOffer>(
    "POST",
    `/sell/inventory/v1/offer/${offer.offerId}/publish`,
    undefined,
    true,
  );

  return {
    offerId: published.offerId ?? offer.offerId,
    listingId: published.listingId ?? offer.listingId ?? "",
    listingUrl: published.listingUri ?? offer.listingUri ?? "",
  };
}
