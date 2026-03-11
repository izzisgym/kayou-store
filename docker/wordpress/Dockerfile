FROM --platform=linux/amd64 wordpress:6-apache

ARG CACHE_BUST=20

ENV KAYOU_SYNC_URL=https://sync-production-44fe.up.railway.app

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
# 3. Starts Apache normally
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

cat > /var/www/html/wp-content/mu-plugins/kayou-ebay-list.php <<'PHP'
<?php
/**
 * Plugin Name: Kayou eBay List Button
 * Description: Adds a List on eBay button to WooCommerce product edit pages.
 */

add_action('add_meta_boxes', function () {
    add_meta_box(
        'kayou_ebay_list',
        'eBay Listing',
        'kayou_ebay_metabox_html',
        'product',
        'side',
        'high'
    );
});

function kayou_ebay_metabox_html($post) {
    $listing_id  = get_post_meta($post->ID, '_kayou_ebay_listing_id', true);
    $listing_url = get_post_meta($post->ID, '_kayou_ebay_listing_url', true);
    $synced_at   = get_post_meta($post->ID, '_kayou_ebay_last_synced_at', true);
    $sku         = get_post_meta($post->ID, '_sku', true);
    $sync_url    = defined('KAYOU_SYNC_URL') ? rtrim(KAYOU_SYNC_URL, '/') : '';
    $secret      = defined('KAYOU_SYNC_SECRET') ? KAYOU_SYNC_SECRET : '';
    ?>
    <div id="kayou-ebay-wrap" style="font-size:13px;">
        <?php if ($listing_id): ?>
            <p style="margin:0 0 6px;">
                <strong>Status:</strong>
                <span style="color:#3a9c3a;">&#10003; Listed</span>
            </p>
            <p style="margin:0 0 6px;word-break:break-all;">
                <strong>Listing ID:</strong> <?php echo esc_html($listing_id); ?>
            </p>
            <?php if ($listing_url): ?>
                <p style="margin:0 0 6px;">
                    <a href="<?php echo esc_url($listing_url); ?>" target="_blank">View on eBay &#8599;</a>
                </p>
            <?php endif; ?>
            <?php if ($synced_at): ?>
                <p style="margin:0 0 10px;color:#888;">
                    Last synced: <?php echo esc_html(date('M j, Y g:i a', strtotime($synced_at))); ?>
                </p>
            <?php endif; ?>
        <?php else: ?>
            <p style="margin:0 0 10px;color:#888;">Not listed on eBay yet.</p>
        <?php endif; ?>

        <?php if (!$sync_url): ?>
            <p style="color:#c00;">KAYOU_SYNC_URL is not configured.</p>
        <?php elseif (!$sku): ?>
            <p style="color:#c00;">Product has no SKU — required to list on eBay.</p>
        <?php else: ?>
            <button
                type="button"
                id="kayou-ebay-list-btn"
                class="button button-primary"
                style="width:100%;"
                data-sku="<?php echo esc_attr($sku); ?>"
                data-sync-url="<?php echo esc_attr($sync_url); ?>"
                data-secret="<?php echo esc_attr($secret); ?>"
            >
                <?php echo $listing_id ? 'Re-list on eBay' : 'List on eBay'; ?>
            </button>
            <p id="kayou-ebay-status" style="margin:8px 0 0;font-style:italic;display:none;"></p>
        <?php endif; ?>
    </div>
    <script>
    (function () {
        var btn = document.getElementById('kayou-ebay-list-btn');
        if (!btn) return;

        btn.addEventListener('click', function () {
            var sku     = btn.dataset.sku;
            var url     = btn.dataset.syncUrl + '/api/ebay/list-product';
            var secret  = btn.dataset.secret;
            var status  = document.getElementById('kayou-ebay-status');

            btn.disabled = true;
            btn.textContent = 'Listing…';
            status.style.display = 'block';
            status.style.color = '#555';
            status.textContent = 'Sending to eBay…';

            var headers = { 'Content-Type': 'application/json' };
            if (secret) headers['Authorization'] = 'Bearer ' + secret;

            fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ sku: sku })
            })
            .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
            .then(function (result) {
                if (result.ok && result.data.ok) {
                    status.style.color = '#3a9c3a';
                    var msg = result.data.wasRelisted ? 'Re-listed! ' : 'Listed! ';
                    if (result.data.listingUrl) {
                        msg += '<a href="' + result.data.listingUrl + '" target="_blank">View on eBay &#8599;</a>';
                    }
                    status.innerHTML = msg;
                    btn.textContent = 'Re-list on eBay';
                    btn.disabled = false;
                } else {
                    status.style.color = '#c00';
                    status.textContent = 'Error: ' + (result.data.error || 'Unknown error');
                    btn.textContent = 'Retry';
                    btn.disabled = false;
                }
            })
            .catch(function (err) {
                status.style.color = '#c00';
                status.textContent = 'Request failed: ' + err.message;
                btn.textContent = 'Retry';
                btn.disabled = false;
            });
        });
    })();
    </script>
    <?php
}
PHP

# Inject KAYOU_SYNC_URL and KAYOU_SYNC_SECRET into wp-config.php if set
SYNC_URL="${KAYOU_SYNC_URL:-https://sync-production-44fe.up.railway.app}"
if [ -f /var/www/html/wp-config.php ]; then
    if ! grep -q 'KAYOU_SYNC_URL' /var/www/html/wp-config.php; then
        sed -i "s|/\* That's all, stop editing! \*/|define('KAYOU_SYNC_URL', '${SYNC_URL}');\ndefine('KAYOU_SYNC_SECRET', '${KAYOU_SYNC_SECRET:-}');\n/* That's all, stop editing! */|" /var/www/html/wp-config.php
    fi
fi

exec /usr/local/bin/apache2-foreground-orig "$@"
WRAPPER

RUN chmod +x /usr/local/bin/apache2-foreground

EXPOSE 80
