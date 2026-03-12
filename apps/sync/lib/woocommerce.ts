import { readRequired } from "@/lib/env";

export type WooMeta = {
  id?: number;
  key: string;
  value: string;
};

export type WooCategory = {
  id: number;
  name: string;
};

export type WooProduct = {
  id: number;
  name: string;
  sku: string;
  price?: string;
  regular_price?: string;
  stock_quantity: number | null;
  stock_status?: string;
  description?: string;
  short_description?: string;
  meta_data?: WooMeta[];
  categories?: WooCategory[];
};

function getAuthHeader() {
  const key = readRequired("WC_CONSUMER_KEY");
  const secret = readRequired("WC_CONSUMER_SECRET");
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

async function wcRequest<T>(
  method: string,
  endpoint: string,
  body?: unknown,
): Promise<T> {
  const baseUrl = readRequired("WC_BASE_URL");
  const response = await fetch(`${baseUrl}/wp-json/wc/v3/${endpoint}`, {
    method,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`WooCommerce API error ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getProductBySku(sku: string) {
  const products = await wcRequest<WooProduct[]>(
    "GET",
    `products?sku=${encodeURIComponent(sku)}`,
  );

  return products[0] ?? null;
}

export function getMetaValue(product: WooProduct, key: string) {
  return product.meta_data?.find((meta) => meta.key === key)?.value;
}

export async function updateProductAfterSale(product: WooProduct, quantitySold: number) {
  const nextStock = Math.max((product.stock_quantity ?? 0) - quantitySold, 0);

  return wcRequest<WooProduct>("PUT", `products/${product.id}`, {
    stock_quantity: nextStock,
    stock_status: nextStock > 0 ? "instock" : "outofstock",
    manage_stock: true,
  });
}

export async function updateProductSyncMeta(
  product: WooProduct,
  metaUpdates: Record<string, string>,
) {
  const existing = product.meta_data ?? [];
  const byKey = new Map(existing.map((item) => [item.key, item]));

  for (const [key, value] of Object.entries(metaUpdates)) {
    const current = byKey.get(key);
    byKey.set(key, current ? { ...current, value } : { key, value });
  }

  return wcRequest<WooProduct>("PUT", `products/${product.id}`, {
    meta_data: Array.from(byKey.values()),
  });
}
