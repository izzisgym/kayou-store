#!/bin/bash
# Deploy the Kayou eBay Listing plugin to WordPress via WP-CLI over Railway SSH.
# Usage: ./deploy-plugin.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_PHP="$SCRIPT_DIR/kayou-ebay-listing/kayou-ebay-listing.php"
PLUGIN_DEST="/var/www/html/wp-content/plugins/kayou-ebay-listing/kayou-ebay-listing.php"

RAILWAY_PROJECT="d0653483-af9a-4cd9-bd6b-7b08d8c5d4be"
RAILWAY_ENV="production"
RAILWAY_SERVICE="wordpress"

echo "Re-zipping plugin..."
cd "$SCRIPT_DIR"
rm -f kayou-ebay-listing.zip
zip -r kayou-ebay-listing.zip kayou-ebay-listing/
echo "Done."

echo "Uploading plugin to WordPress via Railway SSH..."

# Encode the file as base64, pipe it into the container in one SSH session,
# decode it, and activate the plugin — all in a single command.
PLUGIN_B64=$(base64 -i "$PLUGIN_PHP")

railway ssh \
  --project "$RAILWAY_PROJECT" \
  --environment "$RAILWAY_ENV" \
  --service "$RAILWAY_SERVICE" \
  "mkdir -p /var/www/html/wp-content/plugins/kayou-ebay-listing && echo '$PLUGIN_B64' | base64 -d > $PLUGIN_DEST && echo 'File written.' && (wp plugin activate kayou-ebay-listing --allow-root --path=/var/www/html 2>/dev/null && echo 'Plugin activated.') || echo 'Activate manually if needed.'"

echo "Done."
