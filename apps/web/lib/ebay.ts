import type { KayouCard, EbaySyncResult } from '@/types';

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID!;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET!;
const EBAY_MARKETPLACE_ID = process.env.EBAY_MARKETPLACE_ID ?? 'EBAY_US';
const EBAY_API_BASE = process.env.EBAY_SANDBOX === 'true'
  ? 'https://api.sandbox.ebay.com'
  : 'https://api.ebay.com';

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

export async function getEbayToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  const credentials = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${EBAY_API_BASE}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope%2Fsell.inventory',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`eBay token request failed: ${body}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return tokenCache.token;
}

async function ebayFetch<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const token = options?.token ?? (await getEbayToken());
  const url = `${EBAY_API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Language': 'en-US',
      'Accept-Language': 'en-US',
      ...((options?.headers as Record<string, string>) ?? {}),
    },
  });

  if (!res.ok && res.status !== 204) {
    const body = await res.text();
    throw new Error(`eBay API error ${res.status} at ${path}: ${body}`);
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export interface EbayInventoryItemPayload {
  sku: string;
  product: {
    title: string;
    description: string;
    imageUrls: string[];
  };
  condition: string;
  availability: {
    shipToLocationAvailability: {
      quantity: number;
    };
  };
}

export async function upsertInventoryItem(card: KayouCard): Promise<void> {
  const payload: EbayInventoryItemPayload = {
    sku: card.sku,
    product: {
      title: card.name,
      description: card.description || `${card.name} - Kayou Trading Card | ${card.property === 'my-little-pony' ? 'My Little Pony' : 'Naruto'} | ${card.rarity} Rarity | Card #${card.cardNumber} | Set: ${card.set}`,
      imageUrls: card.images.map((img) => img.src).filter(Boolean),
    },
    condition: 'NEW',
    availability: {
      shipToLocationAvailability: {
        quantity: card.stockQuantity,
      },
    },
  };

  await ebayFetch(`/sell/inventory/v1/inventory_item/${encodeURIComponent(card.sku)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export interface EbayOfferPayload {
  sku: string;
  marketplaceId: string;
  format: string;
  listingDescription: string;
  pricingSummary: {
    price: {
      value: string;
      currency: string;
    };
  };
  categoryId: string;
  merchantLocationKey: string;
  listingPolicies: {
    fulfillmentPolicyId: string;
    paymentPolicyId: string;
    returnPolicyId: string;
  };
  bestOfferTerms?: {
    bestOfferEnabled: boolean;
    autoAcceptPrice?: {
      value: string;
      currency: string;
    };
    autoDeclinePrice?: {
      value: string;
      currency: string;
    };
  };
}

export async function createOrUpdateOffer(
  card: KayouCard,
  opts: {
    categoryId: string;
    merchantLocationKey: string;
    fulfillmentPolicyId: string;
    paymentPolicyId: string;
    returnPolicyId: string;
  },
): Promise<{ offerId: string }> {
  const token = await getEbayToken();

  // Check if an offer already exists for this SKU
  const existingOffers = await ebayFetch<{ offers?: { offerId: string }[] }>(
    `/sell/inventory/v1/offer?sku=${encodeURIComponent(card.sku)}&marketplace_id=${EBAY_MARKETPLACE_ID}`,
    { token },
  );

  const payload: EbayOfferPayload = {
    sku: card.sku,
    marketplaceId: EBAY_MARKETPLACE_ID,
    format: 'FIXED_PRICE',
    listingDescription: card.description || `Official Kayou ${card.name} trading card. Rarity: ${card.rarity}. Set: ${card.set}. Card #${card.cardNumber}.`,
    pricingSummary: {
      price: { value: card.price, currency: 'USD' },
    },
    categoryId: opts.categoryId,
    merchantLocationKey: opts.merchantLocationKey,
    listingPolicies: {
      fulfillmentPolicyId: opts.fulfillmentPolicyId,
      paymentPolicyId: opts.paymentPolicyId,
      returnPolicyId: opts.returnPolicyId,
    },
    bestOfferTerms: {
      bestOfferEnabled: true,
      ...(card.ebayAutoAcceptPrice
        ? { autoAcceptPrice: { value: card.ebayAutoAcceptPrice, currency: 'USD' } }
        : {}),
      ...(card.ebayAutoDeclinePrice
        ? { autoDeclinePrice: { value: card.ebayAutoDeclinePrice, currency: 'USD' } }
        : {}),
    },
  };

  if (existingOffers?.offers?.length) {
    const offerId = existingOffers.offers[0].offerId;
    await ebayFetch(`/sell/inventory/v1/offer/${offerId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      token,
    });
    return { offerId };
  }

  const created = await ebayFetch<{ offerId: string }>('/sell/inventory/v1/offer', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });

  return { offerId: created.offerId };
}

export async function publishOffer(offerId: string): Promise<{ listingId: string }> {
  const result = await ebayFetch<{ listingId: string }>(
    `/sell/inventory/v1/offer/${offerId}/publish`,
    { method: 'POST', body: JSON.stringify({}) },
  );
  return result;
}

export function ebayListingUrl(listingId: string): string {
  const isSandbox = process.env.EBAY_SANDBOX === 'true';
  return isSandbox
    ? `https://sandbox.ebay.com/itm/${listingId}`
    : `https://www.ebay.com/itm/${listingId}`;
}

export async function syncCardToEbay(
  card: KayouCard,
  policies: {
    categoryId: string;
    merchantLocationKey: string;
    fulfillmentPolicyId: string;
    paymentPolicyId: string;
    returnPolicyId: string;
  },
): Promise<EbaySyncResult> {
  try {
    await upsertInventoryItem(card);
    const { offerId } = await createOrUpdateOffer(card, policies);
    const { listingId } = await publishOffer(offerId);
    const listingUrl = ebayListingUrl(listingId);

    return { success: true, listingId, listingUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
