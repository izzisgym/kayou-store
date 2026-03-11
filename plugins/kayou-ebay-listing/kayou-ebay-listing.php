<?php
/**
 * Plugin Name: Kayou eBay Listing
 * Description: Adds an eBay Listing panel to WooCommerce product edit pages with AI-generated copy and one-click listing.
 * Version: 1.0.0
 * Author: Kayou Store
 * Requires Plugins: woocommerce
 */

if (!defined('ABSPATH')) exit;

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
    $sync_url    = defined('KAYOU_SYNC_URL') ? rtrim(KAYOU_SYNC_URL, '/') : get_option('kayou_sync_url', '');
    $secret      = defined('KAYOU_SYNC_SECRET') ? KAYOU_SYNC_SECRET : get_option('kayou_sync_secret', '');
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
            <p style="color:#c00;">
                Sync URL not configured. Go to
                <a href="<?php echo esc_url(admin_url('options-general.php?page=kayou-ebay')); ?>">Kayou eBay Settings</a>.
            </p>
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

            <button type="button" id="kayou-autogen-btn" class="button" style="width:100%;margin-bottom:6px;"
                data-sku="<?php echo esc_attr($sku); ?>"
                data-sync-url="<?php echo esc_attr($sync_url); ?>"
                data-secret="<?php echo esc_attr($secret); ?>">
                Auto-generate with AI
            </button>

            <button type="button" id="kayou-save-copy-btn" class="button" style="width:100%;margin-bottom:6px;"
                data-post-id="<?php echo esc_attr($post->ID); ?>"
                data-ajax-url="<?php echo esc_attr($ajax_url); ?>"
                data-nonce="<?php echo esc_attr($nonce); ?>">
                Save Copy
            </button>

            <button type="button" id="kayou-ebay-list-btn" class="button button-primary" style="width:100%;"
                data-sku="<?php echo esc_attr($sku); ?>"
                data-sync-url="<?php echo esc_attr($sync_url); ?>"
                data-secret="<?php echo esc_attr($secret); ?>">
                <?php echo $listing_id ? 'Re-list on eBay' : 'List on eBay'; ?>
            </button>

            <p id="kayou-ebay-status" style="margin:8px 0 0;font-style:italic;display:none;"></p>

        <?php endif; ?>
    </div>
    <script>
    (function () {
        var titleInput = document.getElementById('kayou-ebay-title');
        var descInput  = document.getElementById('kayou-ebay-desc');
        var titleCount = document.getElementById('kayou-title-count');
        var genBtn     = document.getElementById('kayou-autogen-btn');
        var saveBtn    = document.getElementById('kayou-save-copy-btn');
        var listBtn    = document.getElementById('kayou-ebay-list-btn');
        var statusEl   = document.getElementById('kayou-ebay-status');

        if (titleInput && titleCount) {
            titleInput.addEventListener('input', function () {
                titleCount.textContent = titleInput.value.length + '/80';
            });
        }

        function setStatus(msg, color, isHtml) {
            if (!statusEl) return;
            statusEl.style.display = 'block';
            statusEl.style.color = color || '#555';
            isHtml ? (statusEl.innerHTML = msg) : (statusEl.textContent = msg);
        }

        function syncHeaders(secret) {
            var h = { 'Content-Type': 'application/json' };
            if (secret) h['Authorization'] = 'Bearer ' + secret;
            return h;
        }

        if (genBtn) {
            genBtn.addEventListener('click', function () {
                genBtn.disabled = true;
                genBtn.textContent = 'Generating…';
                setStatus('Calling AI…', '#555');

                fetch(genBtn.dataset.syncUrl + '/api/ebay/generate-copy', {
                    method: 'POST',
                    headers: syncHeaders(genBtn.dataset.secret),
                    body: JSON.stringify({ sku: genBtn.dataset.sku })
                })
                .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
                .then(function (res) {
                    if (res.ok && res.d.ok) {
                        if (titleInput) titleInput.value = res.d.title || '';
                        if (descInput)  descInput.value  = res.d.description || '';
                        if (titleCount && titleInput) titleCount.textContent = titleInput.value.length + '/80';
                        setStatus('Generated! Review then click Save Copy.', '#3a9c3a');
                    } else {
                        setStatus('Error: ' + (res.d.error || 'Unknown error'), '#c00');
                    }
                    genBtn.disabled = false;
                    genBtn.textContent = 'Auto-generate with AI';
                })
                .catch(function (e) {
                    setStatus('Request failed: ' + e.message, '#c00');
                    genBtn.disabled = false;
                    genBtn.textContent = 'Auto-generate with AI';
                });
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving…';

                var body = new URLSearchParams({
                    action:           'kayou_save_ebay_copy',
                    nonce:            saveBtn.dataset.nonce,
                    post_id:          saveBtn.dataset.postId,
                    ebay_title:       titleInput ? titleInput.value : '',
                    ebay_description: descInput  ? descInput.value  : ''
                });

                fetch(saveBtn.dataset.ajaxUrl, { method: 'POST', body: body })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    setStatus(data.success ? 'Copy saved.' : 'Save failed.', data.success ? '#3a9c3a' : '#c00');
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save Copy';
                })
                .catch(function (e) {
                    setStatus('Save failed: ' + e.message, '#c00');
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save Copy';
                });
            });
        }

        if (listBtn) {
            listBtn.addEventListener('click', function () {
                listBtn.disabled = true;
                listBtn.textContent = 'Listing…';
                setStatus('Sending to eBay…', '#555');

                fetch(listBtn.dataset.syncUrl + '/api/ebay/list-product', {
                    method: 'POST',
                    headers: syncHeaders(listBtn.dataset.secret),
                    body: JSON.stringify({ sku: listBtn.dataset.sku })
                })
                .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
                .then(function (res) {
                    if (res.ok && res.d.ok) {
                        var msg = (res.d.wasRelisted ? 'Re-listed! ' : 'Listed! ');
                        if (res.d.listingUrl) msg += '<a href="' + res.d.listingUrl + '" target="_blank">View on eBay &#8599;</a>';
                        setStatus(msg, '#3a9c3a', true);
                        listBtn.textContent = 'Re-list on eBay';
                    } else {
                        setStatus('Error: ' + (res.d.error || 'Unknown error'), '#c00');
                        listBtn.textContent = 'Retry';
                    }
                    listBtn.disabled = false;
                })
                .catch(function (e) {
                    setStatus('Request failed: ' + e.message, '#c00');
                    listBtn.textContent = 'Retry';
                    listBtn.disabled = false;
                });
            });
        }
    })();
    </script>
    <?php
}

// Settings page so the sync URL and secret can be configured from wp-admin
add_action('admin_menu', function () {
    add_options_page('Kayou eBay Settings', 'Kayou eBay', 'manage_options', 'kayou-ebay', 'kayou_ebay_settings_page');
});

add_action('admin_init', function () {
    register_setting('kayou_ebay', 'kayou_sync_url');
    register_setting('kayou_ebay', 'kayou_sync_secret');
});

function kayou_ebay_settings_page() {
    ?>
    <div class="wrap">
        <h1>Kayou eBay Settings</h1>
        <form method="post" action="options.php">
            <?php settings_fields('kayou_ebay'); ?>
            <table class="form-table">
                <tr>
                    <th><label for="kayou_sync_url">Sync App URL</label></th>
                    <td>
                        <input type="url" id="kayou_sync_url" name="kayou_sync_url"
                            value="<?php echo esc_attr(get_option('kayou_sync_url', '')); ?>"
                            class="regular-text" placeholder="https://sync-production-xxxx.up.railway.app" />
                    </td>
                </tr>
                <tr>
                    <th><label for="kayou_sync_secret">Sync Secret</label></th>
                    <td>
                        <input type="password" id="kayou_sync_secret" name="kayou_sync_secret"
                            value="<?php echo esc_attr(get_option('kayou_sync_secret', '')); ?>"
                            class="regular-text" />
                        <p class="description">Must match SYNC_SHARED_SECRET on the sync app.</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}
