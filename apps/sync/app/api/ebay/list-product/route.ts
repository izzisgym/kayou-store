import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { relistProductOnEbay } from "@/lib/ebay";
import { getMetaValue, getProductBySku, updateProductSyncMeta } from "@/lib/woocommerce";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = env.syncSharedSecret;

  if (expected) {
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (token !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const payload = (await request.json()) as { sku?: string };

  if (!payload.sku) {
    return NextResponse.json({ error: "Missing sku" }, { status: 400 });
  }

  const product = await getProductBySku(payload.sku);

  if (!product) {
    return NextResponse.json(
      { error: `No WooCommerce product found for SKU: ${payload.sku}` },
      { status: 404 },
    );
  }

  if ((product.stock_quantity ?? 0) <= 0) {
    return NextResponse.json(
      { error: "Product has no stock — cannot list on eBay" },
      { status: 422 },
    );
  }

  const existingListingId = getMetaValue(product, "_kayou_ebay_listing_id");

  const ebayResult = await relistProductOnEbay(product, product.stock_quantity ?? 0);

  await updateProductSyncMeta(product, {
    _kayou_ebay_offer_id: ebayResult.offerId,
    _kayou_ebay_listing_id: ebayResult.listingId,
    _kayou_ebay_listing_url: ebayResult.listingUrl,
    _kayou_ebay_last_synced_at: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    sku: product.sku,
    productId: product.id,
    offerId: ebayResult.offerId,
    listingId: ebayResult.listingId,
    listingUrl: ebayResult.listingUrl,
    wasRelisted: Boolean(existingListingId),
  });
}
