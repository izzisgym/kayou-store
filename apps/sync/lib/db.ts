import mysql, { type Pool } from "mysql2/promise";

import { env } from "@/lib/env";

let pool: Pool | null = null;

function createPool() {
  if (env.databaseUrl) {
    return mysql.createPool({
      uri: env.databaseUrl,
      connectionLimit: 4,
    });
  }

  if (!env.mysqlHost || !env.mysqlUser || !env.mysqlPassword || !env.mysqlDatabase) {
    throw new Error("Missing MySQL environment variables");
  }

  return mysql.createPool({
    host: env.mysqlHost,
    port: env.mysqlPort,
    user: env.mysqlUser,
    password: env.mysqlPassword,
    database: env.mysqlDatabase,
    connectionLimit: 4,
  });
}

export function getPool() {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

export async function ensureSyncTables() {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS kayou_ebay_sale_events (
      event_id VARCHAR(255) PRIMARY KEY,
      order_id VARCHAR(255) NULL,
      sku VARCHAR(255) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      status VARCHAR(50) NOT NULL DEFAULT 'processed',
      raw_payload LONGTEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

export async function hasProcessedEvent(eventId: string) {
  const db = getPool();
  const [rows] = await db.query(
    "SELECT event_id FROM kayou_ebay_sale_events WHERE event_id = ? LIMIT 1",
    [eventId],
  );

  return Array.isArray(rows) && rows.length > 0;
}

export async function recordProcessedEvent(input: {
  eventId: string;
  orderId?: string;
  sku: string;
  quantity: number;
  status: string;
  rawPayload: string;
}) {
  const db = getPool();

  await db.query(
    `
      INSERT INTO kayou_ebay_sale_events (
        event_id,
        order_id,
        sku,
        quantity,
        status,
        raw_payload
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        order_id = VALUES(order_id),
        sku = VALUES(sku),
        quantity = VALUES(quantity),
        status = VALUES(status),
        raw_payload = VALUES(raw_payload)
    `,
    [
      input.eventId,
      input.orderId ?? null,
      input.sku,
      input.quantity,
      input.status,
      input.rawPayload,
    ],
  );
}
