import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { searchSoldListings } from "@/lib/ebay";
import { getProductBySku } from "@/lib/woocommerce";

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

  const results = await searchSoldListings(product.name, 3);

  return NextResponse.json({ ok: true, results });
}
