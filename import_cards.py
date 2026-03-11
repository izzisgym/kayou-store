#!/usr/bin/env python3
"""
Kayou Card Bulk Importer
Reads a CSV set list and creates WooCommerce products via REST API.
Usage: python3 import_cards.py <path-to-csv>
"""

import csv
import sys
import time
import json
import urllib.request
import urllib.parse
import base64
import re

# ── WooCommerce credentials ──────────────────────────────────────────────────
WC_BASE_URL     = "https://wordpress-production-626e.up.railway.app"
CONSUMER_KEY    = "ck_9c5b3c51ac8569de1aa91bb454e1bfca44ca9467"
CONSUMER_SECRET = "cs_dc07d720fbb33c5a283c005986421fb5e7404a7b"

# ── Default prices by rarity ─────────────────────────────────────────────────
RARITY_PRICES = {
    "R":   "1.99",
    "SR":  "3.99",
    "SSR": "5.99",
    "HR":  "7.99",
    "UR":  "9.99",
    "LSR": "12.99",
    "ZR":  "19.99",
    "SGR": "24.99",
    "SC":  "29.99",
    "◇ZR": "34.99",
}

MLP_DEFAULT_DESCRIPTION = (
    "Kayou My Little Pony Moon Edition 2 collectible cards bring the magic of "
    "Equestria to life in stunning detail. Officially licensed and beautifully "
    "designed, each pack is a chance to discover rare foils, stunning character "
    "art, and the thrill of the chase. Perfect for fans of My Little Pony and "
    "blind box collectors alike. Contents vary — chase your favorites!"
)

def extract_rarity_code(rarity_str):
    """Pull the short code out of e.g. 'SSR (Super-Secret Rare)' → 'SSR'"""
    m = re.match(r'[◇]?[A-Z]+', rarity_str.strip())
    if m:
        return m.group(0)
    return "R"

def get_price(rarity_str):
    code = extract_rarity_code(rarity_str)
    return RARITY_PRICES.get(code, "9.99")

def wc_request(method, endpoint, data=None):
    url = f"{WC_BASE_URL}/wp-json/wc/v3/{endpoint}"
    credentials = base64.b64encode(f"{CONSUMER_KEY}:{CONSUMER_SECRET}".encode()).decode()
    headers = {
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json",
    }
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode()[:200]}")
        return None

def get_or_create_category(name, cache):
    if name in cache:
        return cache[name]
    # Search first
    existing = wc_request("GET", f"products/categories?search={urllib.parse.quote(name)}&per_page=10")
    if existing:
        for cat in existing:
            if cat["name"].lower() == name.lower():
                cache[name] = cat["id"]
                return cat["id"]
    # Create
    result = wc_request("POST", "products/categories", {"name": name})
    if result and "id" in result:
        cache[name] = result["id"]
        print(f"  Created category: {name} (id={result['id']})")
        return result["id"]
    return None

def create_product(row, category_cache):
    card_name   = row["Card Name (En)"].strip()
    sku         = row["Card Number"].strip()
    rarity_str  = row["Card Rarity"].strip()
    ip          = row["IP"].strip()          # e.g. "My Little Pony"
    series      = row["Series"].strip() if row["Series"].strip() else "US Series 2 (Moon 8)"
    year        = row["Release year"].strip() if row["Release year"].strip() else "2025"

    rarity_code = extract_rarity_code(rarity_str)
    price       = get_price(rarity_str)

    # Product title: "Card Name - Rarity Code - SKU"
    title = f"{card_name} [{rarity_code}] - {sku}"

    # Categories: IP + Rarity
    cat_ids = []
    for cat_name in [ip, f"{rarity_code} - {rarity_str.split('(')[-1].replace(')','').strip()}",
                     series]:
        cid = get_or_create_category(cat_name, category_cache)
        if cid:
            cat_ids.append({"id": cid})

    product = {
        "name": title,
        "type": "simple",
        "status": "publish",
        "sku": sku,
        "regular_price": price,
        "manage_stock": True,
        "stock_quantity": 0,
        "stock_status": "outofstock",
        "categories": cat_ids,
        "attributes": [
            {
                "name": "IP",
                "options": [ip],
                "visible": True,
            },
            {
                "name": "Rarity",
                "options": [rarity_str],
                "visible": True,
            },
            {
                "name": "Series",
                "options": [series],
                "visible": True,
            },
            {
                "name": "Card Number",
                "options": [sku],
                "visible": True,
            },
            {
                "name": "Character",
                "options": [card_name],
                "visible": True,
            },
            {
                "name": "Release Year",
                "options": [year],
                "visible": True,
            },
        ],
        "description": "",
        "short_description": (
            MLP_DEFAULT_DESCRIPTION
            if ip == "My Little Pony"
            else f"{ip} | {series} | {rarity_str}"
        ),
    }

    return wc_request("POST", "products", product)

def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else \
        "/Users/christopherhamze/Downloads/KAYOU My Little Pony Moon Edition US _Set List.xlsx - US Series 2 (Moon 8) (1).csv"

    print(f"Reading: {csv_path}")
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = [r for r in reader if r["Card Number"].strip() and r["Card Number"].strip() != "/"]

    print(f"Found {len(rows)} cards to import\n")

    category_cache = {}
    success = 0
    failed  = 0
    skipped = 0

    for i, row in enumerate(rows, 1):
        sku  = row["Card Number"].strip()
        name = row["Card Name (En)"].strip()
        print(f"[{i}/{len(rows)}] {sku} — {name} ... ", end="", flush=True)

        # Check if SKU already exists
        existing = wc_request("GET", f"products?sku={urllib.parse.quote(sku)}")
        if existing and len(existing) > 0:
            print("already exists, skipping")
            skipped += 1
            continue

        result = create_product(row, category_cache)
        if result and "id" in result:
            print(f"✓ created (id={result['id']}, price=${result['regular_price']})")
            success += 1
        else:
            print("✗ FAILED")
            failed += 1

        # Small delay to avoid overwhelming the API
        time.sleep(0.3)

    print(f"\n{'='*50}")
    print(f"Done! Created: {success} | Skipped: {skipped} | Failed: {failed}")

if __name__ == "__main__":
    main()
