import { NextResponse } from "next/server";

import { hasDatabaseEnv, hasEbayEnv, hasWooEnv } from "@/lib/env";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "kayou-sync",
    env: {
      woo: hasWooEnv(),
      ebay: hasEbayEnv(),
      database: hasDatabaseEnv(),
    },
  });
}
