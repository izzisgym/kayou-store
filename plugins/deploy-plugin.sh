#!/bin/bash
# Deploy the Kayou eBay Listing plugin via the WordPress REST API.
# Usage: ./deploy-plugin.sh
#
# Requires:
#   WP_URL    - WordPress site URL (e.g. https://kayou.izzisgym.com)
#   WP_USER   - WordPress admin username
#   WP_PASS   - WordPress admin password or application password
#
# You can set these as env vars or hardcode them below.

set -e

WP_URL="${WP_URL:-https://kayou.izzisgym.com}"
WP_USER="${WP_USER:-}"
WP_PASS="${WP_PASS:-}"

PLUGIN_ZIP="$(cd "$(dirname "$0")" && pwd)/kayou-ebay-listing.zip"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -z "$WP_USER" ] || [ -z "$WP_PASS" ]; then
  echo "Error: WP_USER and WP_PASS must be set."
  echo "Usage: WP_USER=admin WP_PASS=yourpassword ./deploy-plugin.sh"
  exit 1
fi

# Re-zip the plugin fresh
echo "Zipping plugin..."
rm -f "$PLUGIN_ZIP"
cd "$SCRIPT_DIR"
zip -r kayou-ebay-listing.zip kayou-ebay-listing/
echo "Zipped: $PLUGIN_ZIP"

# Upload and install via WordPress REST API
echo "Uploading to $WP_URL..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$WP_URL/wp-json/wp/v2/plugins" \
  -u "$WP_USER:$WP_PASS" \
  -F "plugin=@$PLUGIN_ZIP" \
  -F "status=active")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "Plugin installed and activated successfully."
elif echo "$BODY" | grep -q "already_installed"; then
  # Plugin exists — delete and reinstall
  echo "Plugin already installed, updating..."
  curl -s -X DELETE "$WP_URL/wp-json/wp/v2/plugins/kayou-ebay-listing/kayou-ebay-listing" \
    -u "$WP_USER:$WP_PASS" > /dev/null

  RESPONSE2=$(curl -s -w "\n%{http_code}" \
    -X POST "$WP_URL/wp-json/wp/v2/plugins" \
    -u "$WP_USER:$WP_PASS" \
    -F "plugin=@$PLUGIN_ZIP" \
    -F "status=active")

  HTTP_CODE2=$(echo "$RESPONSE2" | tail -1)
  if [ "$HTTP_CODE2" = "200" ] || [ "$HTTP_CODE2" = "201" ]; then
    echo "Plugin updated and activated successfully."
  else
    echo "Error updating plugin (HTTP $HTTP_CODE2):"
    echo "$RESPONSE2" | head -n -1
    exit 1
  fi
else
  echo "Error uploading plugin (HTTP $HTTP_CODE):"
  echo "$BODY"
  exit 1
fi

echo "Done."
