FROM --platform=linux/amd64 wordpress:6-apache

ARG CACHE_BUST=23

RUN echo 'ServerName localhost' >> /etc/apache2/apache2.conf

# Keep upload limits modest but usable for theme/plugin uploads.
RUN { \
    echo 'upload_max_filesize = 20M'; \
    echo 'post_max_size = 20M'; \
    echo 'memory_limit = 256M'; \
    echo 'max_execution_time = 300'; \
    echo 'max_input_time = 300'; \
} > /usr/local/etc/php/conf.d/uploads.ini

# Replace apache2-foreground with a runtime wrapper that:
# 1. Removes Railway-injected MPM modules
# 2. Remaps Apache to Railway's dynamic PORT
# 3. Writes the woo-cleanup mu-plugin
# 4. Starts Apache normally
RUN mv /usr/local/bin/apache2-foreground /usr/local/bin/apache2-foreground-orig && \
    cat > /usr/local/bin/apache2-foreground << 'WRAPPER'
#!/bin/sh
set -e

rm -f /etc/apache2/mods-enabled/mpm_event.conf
rm -f /etc/apache2/mods-enabled/mpm_event.load
rm -f /etc/apache2/mods-enabled/mpm_worker.conf
rm -f /etc/apache2/mods-enabled/mpm_worker.load

PORT="${PORT:-80}"
sed -i "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:[0-9]*>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-enabled/000-default.conf

mkdir -p /var/www/html/wp-content/mu-plugins
cat > /var/www/html/wp-content/mu-plugins/kayou-woo-cleanup.php <<'PHP'
<?php
/**
 * Plugin Name: Kayou Woo Cleanup
 * Description: Removes unwanted WooCommerce product tabs.
 */

add_filter('woocommerce_product_tabs', function ($tabs) {
    unset($tabs['additional_information']);
    unset($tabs['reviews']);
    return $tabs;
}, 98);
PHP

exec /usr/local/bin/apache2-foreground-orig "$@"
WRAPPER

RUN chmod +x /usr/local/bin/apache2-foreground

EXPOSE 80
