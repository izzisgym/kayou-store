import crypto from "node:crypto";

import { ensureSyncTables, hasProcessedEvent, recordProcessedEvent } from "@/lib/db";
import { relistProductOnEbay } from "@/lib/ebay";
import {
  getProductBySku,
  updateProductAfterSale,
  updateProductSyncMeta,
} from "@/lib/woocommerce";

export type ParsedSaleEvent = {
  eventId: string;
  orderId?: string;
  sku: string;
  quantity: number;
};

function parseLineItem(item: Record<string, unknown>) {
  const sku =
    typeof item.sku === "string"
      ? item.sku
      : typeof item.merchantSku === "string"
        ? item.merchantSku
        : null;

  const quantity =
    typeof item.quantity === "number"
      ? item.quantity
      : typeof item.lineItemQuantity === "number"
        ? item.lineItemQuantity
        : 1;

  if (!sku) return null;

  return { sku, quantity };
}

export function extractSaleEvents(payload: unknown): ParsedSaleEvent[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const body = payload as Record<string, unknown>;

  if (typeof body.sku === "string") {
    return [
      {
        eventId:
          typeof body.eventId === "string"
            ? body.eventId
            : typeof body.notificationId === "string"
              ? body.notificationId
              : crypto.randomUUID(),
        orderId: typeof body.orderId === "string" ? body.orderId : undefined,
        sku: body.sku,
        quantity: typeof body.quantity === "number" ? body.quantity : 1,
      },
    ];
  }

  const metadata = (body.metadata ?? {}) as Record<string, unknown>;
  const data = (body.data ?? {}) as Record<string, unknown>;
  const lineItems = Array.isArray(data.lineItems)
    ? data.lineItems
    : Array.isArray(body.lineItems)
      ? body.lineItems
      : [];

  const baseEventId =
    typeof metadata.notificationId === "string"
      ? metadata.notificationId
      : typeof body.notificationId === "string"
        ? body.notificationId
        : crypto.randomUUID();

  const orderId =
    typeof data.orderId === "string"
      ? data.orderId
      : typeof body.orderId === "string"
        ? body.orderId
        : undefined;

  const parsed: ParsedSaleEvent[] = [];

  lineItems.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const line = parseLineItem(item as Record<string, unknown>);
    if (!line) return;

    parsed.push({
      eventId: `${baseEventId}:${index}`,
      orderId,
      sku: line.sku,
      quantity: line.quantity,
    });
  });

  return parsed;
}

export async function processSaleEvent(event: ParsedSaleEvent, rawPayload: string) {
  await ensureSyncTables();

  if (await hasProcessedEvent(event.eventId)) {
    return {
      skipped: true,
      reason: "already_processed",
      eventId: event.eventId,
    };
  }

  const product = await getProductBySku(event.sku);

  if (!product) {
    await recordProcessedEvent({
      eventId: event.eventId,
      orderId: event.orderId,
      sku: event.sku,
      quantity: event.quantity,
      status: "missing_product",
      rawPayload,
    });

    throw new Error(`No WooCommerce product found for SKU ${event.sku}`);
  }

  const updatedProduct = await updateProductAfterSale(product, event.quantity);

  let listingUrl = "";
  let offerId = "";
  let listingId = "";

  if ((updatedProduct.stock_quantity ?? 0) > 0) {
    const ebayResult = await relistProductOnEbay(
      updatedProduct,
      updatedProduct.stock_quantity ?? 0,
    );

    offerId = ebayResult.offerId;
    listingId = ebayResult.listingId;
    listingUrl = ebayResult.listingUrl;

    await updateProductSyncMeta(updatedProduct, {
      _kayou_ebay_offer_id: offerId,
      _kayou_ebay_listing_id: listingId,
      _kayou_ebay_listing_url: listingUrl,
      _kayou_ebay_last_synced_at: new Date().toISOString(),
    });
  }

  await recordProcessedEvent({
    eventId: event.eventId,
    orderId: event.orderId,
    sku: event.sku,
    quantity: event.quantity,
    status: "processed",
    rawPayload,
  });

  return {
    skipped: false,
    productId: updatedProduct.id,
    sku: event.sku,
    remainingStock: updatedProduct.stock_quantity ?? 0,
    relisted: (updatedProduct.stock_quantity ?? 0) > 0,
    offerId,
    listingId,
    listingUrl,
  };
}
