FROM --platform=linux/amd64 wordpress:6-apache

ARG CACHE_BUST=21

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
 * Description: Adds a List on eBay button and copy fields to WooCommerce product edit pages.
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

add_action('wp_ajax_kayou_save_ebay_copy', function () {
    check_ajax_referer('kayou_ebay_nonce', 'nonce');
    if (!current_user_can('edit_posts')) wp_die('Forbidden', 403);

    $post_id = intval($_POST['post_id'] ?? 0);
    if (!$post_id) wp_send_json_error('Missing post_id');

    update_post_meta($post_id, '_kayou_ebay_title',       sanitize_text_field($_POST['ebay_title'] ?? ''));
    update_post_meta($post_id, '_kayou_ebay_description', wp_kses_post($_POST['ebay_description'] ?? ''));

    wp_send_json_success();
});

function kayou_ebay_metabox_html($post) {
    $listing_id  = get_post_meta($post->ID, '_kayou_ebay_listing_id', true);
    $listing_url = get_post_meta($post->ID, '_kayou_ebay_listing_url', true);
    $synced_at   = get_post_meta($post->ID, '_kayou_ebay_last_synced_at', true);
    $ebay_title  = get_post_meta($post->ID, '_kayou_ebay_title', true);
    $ebay_desc   = get_post_meta($post->ID, '_kayou_ebay_description', true);
    $sku         = get_post_meta($post->ID, '_sku', true);
    $sync_url    = defined('KAYOU_SYNC_URL') ? rtrim(KAYOU_SYNC_URL, '/') : '';
    $secret      = defined('KAYOU_SYNC_SECRET') ? KAYOU_SYNC_SECRET : '';
    $nonce       = wp_create_nonce('kayou_ebay_nonce');
    $ajax_url    = admin_url('admin-ajax.php');
    ?>
    <div id="kayou-ebay-wrap" style="font-size:13px;">

        <?php if ($listing_id): ?>
            <p style="margin:0 0 4px;">
                <strong>Status:</strong>
                <span style="color:#3a9c3a;">&#10003; Listed</span>
            </p>
            <p style="margin:0 0 4px;word-break:break-all;">
                <strong>ID:</strong> <?php echo esc_html($listing_id); ?>
            </p>
            <?php if ($listing_url): ?>
                <p style="margin:0 0 4px;">
                    <a href="<?php echo esc_url($listing_url); ?>" target="_blank">View on eBay &#8599;</a>
                </p>
            <?php endif; ?>
            <?php if ($synced_at): ?>
                <p style="margin:0 0 10px;color:#888;">
                    Synced: <?php echo esc_html(date('M j, Y g:i a', strtotime($synced_at))); ?>
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

            <div style="margin-bottom:10px;">
                <label style="display:block;font-weight:600;margin-bottom:3px;">
                    eBay Title <span style="font-weight:400;color:#888;">(max 80 chars)</span>
                </label>
                <input
                    type="text"
                    id="kayou-ebay-title"
                    maxlength="80"
                    style="width:100%;box-sizing:border-box;"
                    value="<?php echo esc_attr($ebay_title); ?>"
                    placeholder="Leave blank to auto-generate"
                />
                <p id="kayou-title-count" style="margin:2px 0 0;color:#888;text-align:right;">
                    <?php echo strlen($ebay_title); ?>/80
                </p>
            </div>

            <div style="margin-bottom:10px;">
                <label style="display:block;font-weight:600;margin-bottom:3px;">eBay Description</label>
                <textarea
                    id="kayou-ebay-desc"
                    rows="5"
                    style="width:100%;box-sizing:border-box;font-family:monospace;font-size:11px;"
                    placeholder="Leave blank to auto-generate"
                ><?php echo esc_textarea($ebay_desc); ?></textarea>
            </div>

            <button
                type="button"
                id="kayou-autogen-btn"
                class="button"
                style="width:100%;margin-bottom:6px;"
                data-sku="<?php echo esc_attr($sku); ?>"
                data-sync-url="<?php echo esc_attr($sync_url); ?>"
                data-secret="<?php echo esc_attr($secret); ?>"
            >
                Auto-generate with AI
            </button>

            <button
                type="button"
                id="kayou-save-copy-btn"
                class="button"
                style="width:100%;margin-bottom:6px;"
                data-post-id="<?php echo esc_attr($post->ID); ?>"
                data-ajax-url="<?php echo esc_attr($ajax_url); ?>"
                data-nonce="<?php echo esc_attr($nonce); ?>"
            >
                Save Copy
            </button>

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
        var titleInput  = document.getElementById('kayou-ebay-title');
        var descInput   = document.getElementById('kayou-ebay-desc');
        var titleCount  = document.getElementById('kayou-title-count');
        var genBtn      = document.getElementById('kayou-autogen-btn');
        var saveBtn     = document.getElementById('kayou-save-copy-btn');
        var listBtn     = document.getElementById('kayou-ebay-list-btn');
        var statusEl    = document.getElementById('kayou-ebay-status');

        if (titleInput && titleCount) {
            titleInput.addEventListener('input', function () {
                titleCount.textContent = titleInput.value.length + '/80';
            });
        }

        function setStatus(msg, color, isHtml) {
            if (!statusEl) return;
            statusEl.style.display = 'block';
            statusEl.style.color = color || '#555';
            if (isHtml) {
                statusEl.innerHTML = msg;
            } else {
                statusEl.textContent = msg;
            }
        }

        function syncHeaders(secret) {
            var h = { 'Content-Type': 'application/json' };
            if (secret) h['Authorization'] = 'Bearer ' + secret;
            return h;
        }

        if (genBtn) {
            genBtn.addEventListener('click', function () {
                var sku      = genBtn.dataset.sku;
                var url      = genBtn.dataset.syncUrl + '/api/ebay/generate-copy';
                var secret   = genBtn.dataset.secret;

                genBtn.disabled = true;
                genBtn.textContent = 'Generating…';
                setStatus('Calling AI…', '#555');

                fetch(url, {
                    method: 'POST',
                    headers: syncHeaders(secret),
                    body: JSON.stringify({ sku: sku })
                })
                .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
                .then(function (result) {
                    if (result.ok && result.d.ok) {
                        if (titleInput) titleInput.value = result.d.title || '';
                        if (descInput)  descInput.value  = result.d.description || '';
                        if (titleCount && titleInput) titleCount.textContent = titleInput.value.length + '/80';
                        setStatus('Generated! Review and click Save Copy before listing.', '#3a9c3a');
                    } else {
                        setStatus('Error: ' + (result.d.error || 'Unknown error'), '#c00');
                    }
                    genBtn.disabled = false;
                    genBtn.textContent = 'Auto-generate with AI';
                })
                .catch(function (err) {
                    setStatus('Request failed: ' + err.message, '#c00');
                    genBtn.disabled = false;
                    genBtn.textContent = 'Auto-generate with AI';
                });
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                var postId   = saveBtn.dataset.postId;
                var ajaxUrl  = saveBtn.dataset.ajaxUrl;
                var nonce    = saveBtn.dataset.nonce;

                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving…';

                var body = new URLSearchParams({
                    action:           'kayou_save_ebay_copy',
                    nonce:            nonce,
                    post_id:          postId,
                    ebay_title:       titleInput ? titleInput.value : '',
                    ebay_description: descInput  ? descInput.value  : ''
                });

                fetch(ajaxUrl, { method: 'POST', body: body })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        setStatus('Copy saved.', '#3a9c3a');
                    } else {
                        setStatus('Save failed.', '#c00');
                    }
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save Copy';
                })
                .catch(function (err) {
                    setStatus('Save failed: ' + err.message, '#c00');
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save Copy';
                });
            });
        }

        if (listBtn) {
            listBtn.addEventListener('click', function () {
                var sku    = listBtn.dataset.sku;
                var url    = listBtn.dataset.syncUrl + '/api/ebay/list-product';
                var secret = listBtn.dataset.secret;

                listBtn.disabled = true;
                listBtn.textContent = 'Listing…';
                setStatus('Sending to eBay…', '#555');

                fetch(url, {
                    method: 'POST',
                    headers: syncHeaders(secret),
                    body: JSON.stringify({ sku: sku })
                })
                .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
                .then(function (result) {
                    if (result.ok && result.d.ok) {
                        var msg = result.d.wasRelisted ? 'Re-listed! ' : 'Listed! ';
                        if (result.d.listingUrl) {
                            msg += '<a href="' + result.d.listingUrl + '" target="_blank">View on eBay &#8599;</a>';
                        }
                        setStatus(msg, '#3a9c3a', true);
                        listBtn.textContent = 'Re-list on eBay';
                    } else {
                        setStatus('Error: ' + (result.d.error || 'Unknown error'), '#c00');
                        listBtn.textContent = 'Retry';
                    }
                    listBtn.disabled = false;
                })
                .catch(function (err) {
                    setStatus('Request failed: ' + err.message, '#c00');
                    listBtn.textContent = 'Retry';
                    listBtn.disabled = false;
                });
            });
        }
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
