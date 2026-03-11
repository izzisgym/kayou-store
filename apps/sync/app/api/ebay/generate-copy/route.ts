import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { generateEbayListingCopy } from "@/lib/claude";
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

  if (!env.anthropicApiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the sync app" },
      { status: 503 },
    );
  }

  const product = await getProductBySku(payload.sku);

  if (!product) {
    return NextResponse.json(
      { error: `No WooCommerce product found for SKU: ${payload.sku}` },
      { status: 404 },
    );
  }

  const copy = await generateEbayListingCopy(product);

  return NextResponse.json({ ok: true, ...copy });
}
