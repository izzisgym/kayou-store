import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { processSaleEvent } from "@/lib/sync";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = env.syncSharedSecret;

  if (expected) {
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (token !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const payload = (await request.json()) as {
    eventId?: string;
    orderId?: string;
    sku?: string;
    quantity?: number;
  };

  if (!payload.sku) {
    return NextResponse.json({ error: "Missing sku" }, { status: 400 });
  }

  const result = await processSaleEvent(
    {
      eventId: payload.eventId ?? crypto.randomUUID(),
      orderId: payload.orderId,
      sku: payload.sku,
      quantity: payload.quantity ?? 1,
    },
    JSON.stringify(payload),
  );

  return NextResponse.json({ ok: true, result });
}
