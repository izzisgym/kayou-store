#!/bin/bash
set -e

# Wait for WordPress to be ready
until wp core is-installed --path=/var/www/html --allow-root 2>/dev/null; do
  echo "Waiting for WordPress to finish installing..."
  sleep 3
done

echo "WordPress is ready. Running setup..."

# Install WooCommerce
wp plugin install woocommerce --activate --path=/var/www/html --allow-root || true

# Install WooCommerce REST API auth helper
wp plugin install jwt-authentication-for-wp-rest-api --activate --path=/var/www/html --allow-root || true

# Set permalink structure (required for REST API)
wp rewrite structure '/%postname%/' --path=/var/www/html --allow-root

echo "WooCommerce setup complete."
