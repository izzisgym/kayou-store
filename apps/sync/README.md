# Kayou eBay Sync

Small Next.js service that listens for eBay sale events, decrements WooCommerce
stock by SKU, and relists the next single copy on eBay if inventory remains.

## What it does

1. Receive an eBay sale event
2. Find the matching WooCommerce product by `sku`
3. Reduce WooCommerce stock
4. If stock is still above `0`, create and publish a fresh eBay offer for the
   next copy
5. Save the latest eBay offer/listing IDs back to WooCommerce product meta

## Routes

- `GET /api/health`
- `GET /api/ebay/notifications`
- `POST /api/ebay/notifications`
- `POST /api/ebay/process-sale`

## Local setup

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

## Manual test

```bash
curl -X POST "http://localhost:3000/api/ebay/process-sale" \
  -H "Authorization: Bearer $SYNC_SHARED_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"sku":"MLPME02-R-001L1","quantity":1,"orderId":"test-order-1"}'
```

## Notes

- `POST /api/ebay/notifications` supports eBay destination challenge-response.
- Signature verification is supported when `EBAY_VALIDATE_SIGNATURE=true`.
- Processed events are stored in MySQL table `kayou_ebay_sale_events` for
  idempotency.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
