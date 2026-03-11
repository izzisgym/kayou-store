import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import {
  buildChallengeResponse,
  verifyEbayNotificationSignature,
} from "@/lib/ebay";
import { extractSaleEvents, processSaleEvent } from "@/lib/sync";

function endpointFromRequest(request: NextRequest) {
  return request.nextUrl.origin + request.nextUrl.pathname;
}

export async function GET(request: NextRequest) {
  const challengeCode = request.nextUrl.searchParams.get("challenge_code");

  if (!challengeCode) {
    return NextResponse.json({
      ok: true,
      message: "eBay notifications endpoint is live",
    });
  }

  const challengeResponse = buildChallengeResponse(
    challengeCode,
    endpointFromRequest(request),
  );

  return NextResponse.json({ challengeResponse });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-ebay-signature");

  if (env.ebayValidateSignature) {
    if (!signature) {
      return NextResponse.json(
        { error: "Missing X-EBAY-SIGNATURE header" },
        { status: 412 },
      );
    }

    const isValid = await verifyEbayNotificationSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid eBay signature" }, { status: 412 });
    }
  }

  const payload = JSON.parse(rawBody);
  const events = extractSaleEvents(payload);

  if (events.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No sale events found in payload" },
      { status: 400 },
    );
  }

  const results = [];
  for (const event of events) {
    results.push(await processSaleEvent(event, rawBody));
  }

  return NextResponse.json({ ok: true, processed: results });
}
