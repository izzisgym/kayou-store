import type { KayouCard, WooProduct, CreateCardInput, UpdateCardInput, PaginationMeta, Property } from '@/types';

const WC_BASE_URL = process.env.WC_BASE_URL!;
const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY!;
const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET!;

const CATEGORY_SLUGS: Record<Property, string> = {
  'my-little-pony': 'my-little-pony',
  naruto: 'naruto',
};

const CATEGORY_IDS: Record<Property, number | null> = {
  'my-little-pony': null,
  naruto: null,
};

function wcAuth(): HeadersInit {
  const credentials = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');
  return {
    Authorization: `Basic ${credentials}`,
    'Content-Type': 'application/json',
  };
}

async function wcFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${WC_BASE_URL}/wp-json/wc/v3${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...wcAuth(),
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WooCommerce API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

function mapProductToCard(product: WooProduct): KayouCard {
  const getMeta = (key: string) =>
    product.meta_data?.find((m) => m.key === key)?.value ?? '';

  const getAttr = (name: string) =>
    product.attributes?.find((a) => a.name.toLowerCase() === name.toLowerCase())?.options?.[0] ?? '';

  const categorySlug = product.categories?.[0]?.slug ?? '';
  const property: Property = categorySlug.includes('naruto') ? 'naruto' : 'my-little-pony';

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    property,
    set: getAttr('kayou_set'),
    cardNumber: getAttr('kayou_card_number'),
    rarity: getAttr('kayou_rarity') as KayouCard['rarity'],
    price: product.regular_price,
    stockQuantity: product.stock_quantity ?? 0,
    inStock: product.in_stock,
    description: product.description,
    images: product.images ?? [],
    ebayListingId: getMeta('ebay_listing_id'),
    ebayListingUrl: getMeta('ebay_listing_url'),
    ebayAutoAcceptPrice: getMeta('ebay_auto_accept_price'),
    ebayAutoDeclinePrice: getMeta('ebay_auto_decline_price'),
  };
}

async function ensureCategoryId(property: Property): Promise<number> {
  if (CATEGORY_IDS[property]) return CATEGORY_IDS[property]!;

  const slug = CATEGORY_SLUGS[property];
  const label = property === 'my-little-pony' ? 'My Little Pony' : 'Naruto';

  const existing = await wcFetch<{ id: number }[]>(`/products/categories?slug=${slug}`);
  if (existing.length > 0) {
    CATEGORY_IDS[property] = existing[0].id;
    return existing[0].id;
  }

  const created = await wcFetch<{ id: number }>('/products/categories', {
    method: 'POST',
    body: JSON.stringify({ name: label, slug }),
  });

  CATEGORY_IDS[property] = created.id;
  return created.id;
}

export async function getCards(options?: {
  property?: Property;
  page?: number;
  perPage?: number;
  search?: string;
  rarity?: string;
}): Promise<{ cards: KayouCard[]; pagination: PaginationMeta }> {
  const { page = 1, perPage = 24, property, search, rarity } = options ?? {};

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    status: 'publish',
  });

  if (property) {
    const slug = CATEGORY_SLUGS[property];
    params.set('category', slug);
  }
  if (search) params.set('search', search);
  if (rarity) params.set('attribute', 'kayou_rarity'), params.set('attribute_term', rarity);

  const url = `${WC_BASE_URL}/wp-json/wc/v3/products?${params}`;
  const credentials = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${credentials}` },
    next: { revalidate: 60 },
  });

  if (!res.ok) throw new Error(`WooCommerce API error ${res.status}`);

  const products: WooProduct[] = await res.json();
  const total = parseInt(res.headers.get('X-WP-Total') ?? '0', 10);
  const totalPages = parseInt(res.headers.get('X-WP-TotalPages') ?? '1', 10);

  return {
    cards: products.map(mapProductToCard),
    pagination: { total, totalPages, page, perPage },
  };
}

export async function getCardBySlug(slug: string): Promise<KayouCard | null> {
  const products = await wcFetch<WooProduct[]>(`/products?slug=${slug}&status=publish`);
  if (!products.length) return null;
  return mapProductToCard(products[0]);
}

export async function getCardById(id: number): Promise<KayouCard | null> {
  try {
    const product = await wcFetch<WooProduct>(`/products/${id}`);
    return mapProductToCard(product);
  } catch {
    return null;
  }
}

export async function createCard(input: CreateCardInput): Promise<KayouCard> {
  const categoryId = await ensureCategoryId(input.property);

  const sku = `${input.property === 'my-little-pony' ? 'MLP' : 'NRT'}-${input.set.replace(/\s+/g, '').toUpperCase()}-${input.cardNumber.padStart(3, '0')}`;

  const body: Record<string, unknown> = {
    name: input.name,
    sku,
    type: 'simple',
    status: 'publish',
    regular_price: input.price,
    manage_stock: true,
    stock_quantity: input.stockQuantity,
    description: input.description ?? '',
    categories: [{ id: categoryId }],
    attributes: [
      { name: 'kayou_set', visible: true, options: [input.set] },
      { name: 'kayou_rarity', visible: true, options: [input.rarity] },
      { name: 'kayou_card_number', visible: true, options: [input.cardNumber] },
    ],
  };

  if (input.imageUrl) {
    body.images = [{ src: input.imageUrl, alt: input.name }];
  }

  const product = await wcFetch<WooProduct>('/products', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return mapProductToCard(product);
}

export async function updateCard(id: number, input: UpdateCardInput): Promise<KayouCard> {
  const updates: Record<string, unknown> = {};

  if (input.price !== undefined) updates.regular_price = input.price;
  if (input.stockQuantity !== undefined) {
    updates.stock_quantity = input.stockQuantity;
    updates.manage_stock = true;
  }

  const metaUpdates: { key: string; value: string }[] = [];
  if (input.ebayAutoAcceptPrice !== undefined)
    metaUpdates.push({ key: 'ebay_auto_accept_price', value: input.ebayAutoAcceptPrice });
  if (input.ebayAutoDeclinePrice !== undefined)
    metaUpdates.push({ key: 'ebay_auto_decline_price', value: input.ebayAutoDeclinePrice });

  if (metaUpdates.length) updates.meta_data = metaUpdates;

  const product = await wcFetch<WooProduct>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

  return mapProductToCard(product);
}

export async function updateCardEbayMeta(
  id: number,
  listingId: string,
  listingUrl: string,
): Promise<void> {
  await wcFetch(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      meta_data: [
        { key: 'ebay_listing_id', value: listingId },
        { key: 'ebay_listing_url', value: listingUrl },
      ],
    }),
  });
}

export async function deleteCard(id: number): Promise<void> {
  await wcFetch(`/products/${id}?force=true`, { method: 'DELETE' });
}

export async function getAllCardSlugs(): Promise<string[]> {
  const params = new URLSearchParams({ per_page: '100', status: 'publish', _fields: 'slug' });
  const products = await wcFetch<{ slug: string }[]>(`/products?${params}`);
  return products.map((p) => p.slug);
}
