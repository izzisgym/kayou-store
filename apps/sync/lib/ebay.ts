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

  // Derive franchise from WooCommerce categories for eBay item specifics
  const franchise =
    product.categories?.find((c) => c.name.toLowerCase() !== "uncategorized")?.name ??
    "Kayou Trading Cards";

  const existingListingId = getMetaValue(product, "_kayou_ebay_listing_id");
  const categoryId = readRequired("EBAY_CATEGORY_ID");
  const fulfillmentPolicyId = readRequired("EBAY_FULFILLMENT_POLICY_ID");
  const paymentPolicyId = readRequired("EBAY_PAYMENT_POLICY_ID");
  const returnPolicyId = readRequired("EBAY_RETURN_POLICY_ID");

  const token = await getAccessToken(true);
  const tradingBaseUrl = env.ebaySandbox
    ? "https://api.sandbox.ebay.com/ws/api.dll"
    : "https://api.ebay.com/ws/api.dll";

  // Build picture URLs from WooCommerce product images
  const pictureXml =
    product.images && product.images.length > 0
      ? `<PictureDetails>${product.images
          .slice(0, 12)
          .map((img) => `<PictureURL>${escapeXml(img.src)}</PictureURL>`)
          .join("")}</PictureDetails>`
      : "";

  // Build item specifics XML
  const itemSpecificsXml = `
    <ItemSpecifics>
      <NameValueList><Name>Franchise</Name><Value>${escapeXml(franchise)}</Value></NameValueList>
      <NameValueList><Name>Brand</Name><Value>Kayou</Value></NameValueList>
      <NameValueList><Name>Card Condition</Name><Value>Near Mint or Better</Value></NameValueList>
      <NameValueList><Name>Condition</Name><Value>Near Mint or Better</Value></NameValueList>
      <NameValueList><Name>Type</Name><Value>Trading Card</Value></NameValueList>
    </ItemSpecifics>`;

  // Best offer settings
  const bestOfferXml = `
    <BestOfferDetails>
      <BestOfferEnabled>true</BestOfferEnabled>
    </BestOfferDetails>`;

  const callName = existingListingId ? "ReviseFixedPriceItem" : "AddFixedPriceItem";
  const listingIdXml = existingListingId ? `<ItemID>${existingListingId}</ItemID>` : "";

  const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<${callName}Request xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token}</eBayAuthToken>
  </RequesterCredentials>
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>Low</WarningLevel>
  <Item>
    ${listingIdXml}
    <Title>${escapeXml(title)}</Title>
    <Description>${escapeXml(description)}</Description>
    <PrimaryCategory><CategoryID>${categoryId}</CategoryID></PrimaryCategory>
    <StartPrice>${price}</StartPrice>
    <CategoryMappingAllowed>true</CategoryMappingAllowed>
    <Country>US</Country>
    <Currency>USD</Currency>
    <Location>Los Angeles, CA</Location>
    <PostalCode>90001</PostalCode>
    <ConditionID>4000</ConditionID>
    <ConditionDescription>Near Mint - never played, handled with care</ConditionDescription>
    <ListingDuration>GTC</ListingDuration>
    <ListingType>FixedPriceItem</ListingType>
    <Quantity>${availableQuantity}</Quantity>
    <SKU>${escapeXml(sku)}</SKU>
    <SellerProfiles>
      <SellerShippingProfile>
        <ShippingProfileID>${fulfillmentPolicyId}</ShippingProfileID>
      </SellerShippingProfile>
      <SellerPaymentProfile>
        <PaymentProfileID>${paymentPolicyId}</PaymentProfileID>
      </SellerPaymentProfile>
      <SellerReturnProfile>
        <ReturnProfileID>${returnPolicyId}</ReturnProfileID>
      </SellerReturnProfile>
    </SellerProfiles>
    ${pictureXml}
    ${itemSpecificsXml}
    ${bestOfferXml}
  </Item>
</${callName}Request>`;

  const response = await fetch(tradingBaseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml",
      "X-EBAY-API-SITEID": "0",
      "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
      "X-EBAY-API-CALL-NAME": callName,
      "X-EBAY-API-APP-NAME": readRequired("EBAY_CLIENT_ID"),
      "X-EBAY-API-DEV-NAME": readRequired("EBAY_DEV_ID"),
      "X-EBAY-API-CERT-NAME": readRequired("EBAY_CLIENT_SECRET"),
    },
    body: xmlBody,
    cache: "no-store",
  });

  const xml = await response.text();

  // Parse out Ack and errors
  const ack = xml.match(/<Ack>(.*?)<\/Ack>/)?.[1] ?? "Failure";
  if (ack === "Failure") {
    const errorMessages = [...xml.matchAll(/<LongMessage>(.*?)<\/LongMessage>/g)].map(
      (m) => m[1],
    );
    throw new Error(
      `eBay Trading API error: ${errorMessages.join("; ") || "Unknown error"}\n\nFull response: ${xml.slice(0, 500)}`,
    );
  }

  // Log any warnings but continue
  if (ack === "Warning" || ack === "PartialFailure") {
    const warnings = [...xml.matchAll(/<ShortMessage>(.*?)<\/ShortMessage>/g)].map((m) => m[1]);
    console.warn("[ebay] Trading API warnings:", warnings.join("; "));
  }

  const listingId = xml.match(/<ItemID>(.*?)<\/ItemID>/)?.[1] ?? "";
  const listingUrl = listingId
    ? `https://www.ebay.com/itm/${listingId}`
    : "";

  // For the offer ID we return the listing ID (Trading API doesn't have offer IDs)
  return {
    offerId: listingId,
    listingId,
    listingUrl,
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
