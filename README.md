# Kayou Card Marketplace

WooCommerce-based Kayou Trading Card store infrastructure, plus a standalone
Next.js sync service for eBay sale relisting.

## Current services

- `docker/wordpress/` - WordPress + WooCommerce on Railway
- `apps/sync/` - Next.js webhook/sync service for eBay sale handling
- `import_cards.py` - bulk WooCommerce importer for set lists

## Features

- Mobile-first storefront with ISR (fast page loads)
- Browse all cards by property (My Little Pony / Naruto) and rarity
- Protected admin UI to add cards, set prices, and manage inventory
- One-click eBay sync with Best Offer (auto-accept / auto-decline prices)
- WooCommerce as headless backend (products, stock, metadata)

## Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: WordPress + WooCommerce (REST API)
- **Database**: MySQL 8
- **eBay**: eBay Inventory REST API (OAuth 2.0)
- **Hosting**: Railway

## Local Development

### 1. Start WordPress + WooCommerce

```bash
docker-compose up -d
```

WordPress runs at `http://localhost:8080`. Complete the setup wizard, then:
1. Install the WooCommerce plugin
2. Go to **WooCommerce → Settings → Advanced → REST API**
3. Create an API key with read/write access
4. Copy the Consumer Key + Consumer Secret

### 2. Start the Next.js app

```bash
cd apps/web
cp .env.local.example .env.local
# Fill in WC_CONSUMER_KEY, WC_CONSUMER_SECRET, and ADMIN_PASSWORD
npm run dev
```

The app runs at `http://localhost:3000`.
Admin panel: `http://localhost:3000/admin`

### 3. Configure eBay (optional for local dev)

Set `EBAY_SANDBOX=true` in `.env.local` and fill in your eBay sandbox credentials from the [eBay Developer Program](https://developer.ebay.com).

You'll need:
- Client ID + Secret (from your app in eBay Developer Portal)
- Fulfillment, Payment, and Return policy IDs (from eBay Seller Hub → Business Policies)
- A merchant location key (created via eBay Inventory API)

## Railway Deployment

### WordPress service
1. Create a new Railway project
2. Add a **MySQL** plugin
3. Add a new service → **Deploy from Docker image** → `wordpress:latest`
4. Set env vars: `WORDPRESS_DB_HOST`, `WORDPRESS_DB_USER`, `WORDPRESS_DB_PASSWORD`, `WORDPRESS_DB_NAME`
5. Add a custom domain and configure it in WordPress Admin → Settings → General

### Next.js service
1. In the same Railway project, add a service from **GitHub repo**
2. Set the root directory to `apps/web`
3. Railway will detect the Dockerfile and build it
4. Set all env vars from `.env.local.example` (with production values)
5. Set `NEXTAUTH_URL` to your Railway public domain

## Environment Variables

See `apps/web/.env.local.example` for all required variables.

| Variable | Description |
|---|---|
| `WC_BASE_URL` | Full URL of your WordPress install |
| `WC_CONSUMER_KEY` | WooCommerce REST API consumer key |
| `WC_CONSUMER_SECRET` | WooCommerce REST API consumer secret |
| `EBAY_CLIENT_ID` | eBay app Client ID |
| `EBAY_CLIENT_SECRET` | eBay app Client Secret |
| `EBAY_MARKETPLACE_ID` | e.g. `EBAY_US` |
| `EBAY_CATEGORY_ID` | eBay category for trading cards (183454 = CCG) |
| `EBAY_MERCHANT_LOCATION_KEY` | Your eBay inventory location key |
| `EBAY_FULFILLMENT_POLICY_ID` | eBay business policy ID |
| `EBAY_PAYMENT_POLICY_ID` | eBay business policy ID |
| `EBAY_RETURN_POLICY_ID` | eBay business policy ID |
| `ADMIN_PASSWORD` | Password for the admin panel |
| `NEXTAUTH_SECRET` | Random secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Full URL of your deployed Next.js app |
| `EBAY_SANDBOX` | Set to `true` for sandbox testing |

## Card SKU Format

Cards are assigned a SKU automatically:
- My Little Pony: `MLP-YHF01-045`
- Naruto: `NRT-NT001-012`

## eBay eBay Best Offer Flow

1. Open a card in `/admin/cards/{id}/edit`
2. Set the card price
3. Optionally set Auto-Accept and Auto-Decline prices
4. Click **Sync to eBay**

The sync will:
1. Create/update an inventory item on eBay
2. Create/update an offer with Best Offer enabled
3. Publish the offer to make the listing live
4. Save the listing ID and URL back to the card in WooCommerce
