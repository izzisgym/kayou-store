import { hasDatabaseEnv, hasEbayEnv, hasWooEnv } from "@/lib/env";

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "1rem",
  background: "#fff",
} as const;

export default function Home() {
  const statuses = [
    { label: "WooCommerce API", ready: hasWooEnv() },
    { label: "eBay API", ready: hasEbayEnv() },
    { label: "MySQL event store", ready: hasDatabaseEnv() },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#0f172a",
        padding: "3rem 1.25rem",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>Kayou eBay Sync</h1>
        <p style={{ marginBottom: "1.5rem", lineHeight: 1.6 }}>
          This service listens for eBay sale events, decrements WooCommerce stock by
          SKU, and relists the next copy on eBay if inventory remains.
        </p>

        <section style={{ ...cardStyle, marginBottom: "1rem" }}>
          <h2 style={{ marginBottom: "0.75rem", fontSize: "1.1rem" }}>Environment</h2>
          <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.8 }}>
            {statuses.map((status) => (
              <li key={status.label}>
                {status.label}: {status.ready ? "ready" : "missing config"}
              </li>
            ))}
          </ul>
        </section>

        <section style={{ ...cardStyle, marginBottom: "1rem" }}>
          <h2 style={{ marginBottom: "0.75rem", fontSize: "1.1rem" }}>Endpoints</h2>
          <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.8 }}>
            <li>
              <code>GET /api/health</code> - service health and env readiness
            </li>
            <li>
              <code>GET /api/ebay/notifications</code> - eBay destination challenge
              verification
            </li>
            <li>
              <code>POST /api/ebay/notifications</code> - process eBay notification
              payloads
            </li>
            <li>
              <code>POST /api/ebay/process-sale</code> - manual test endpoint for a
              single SKU sale event
            </li>
          </ul>
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginBottom: "0.75rem", fontSize: "1.1rem" }}>Manual test</h2>
          <pre
            style={{
              overflowX: "auto",
              background: "#0f172a",
              color: "#e2e8f0",
              padding: "1rem",
              borderRadius: "8px",
              fontSize: "0.9rem",
            }}
          >
            {`curl -X POST "$APP_URL/api/ebay/process-sale" \\
  -H "Authorization: Bearer $SYNC_SHARED_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{"sku":"MLPME02-R-001L1","quantity":1,"orderId":"test-order-1"}'`}
          </pre>
        </section>
      </div>
    </main>
  );
}
