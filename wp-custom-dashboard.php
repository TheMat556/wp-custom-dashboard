<?php
/**
 * Plugin Name: WP React UI
 * Description: Replaces Navbar and Sidebar with React + Ant Design
 * Version: 1.0.0
 */

defined('ABSPATH') || exit;

require_once __DIR__ . '/includes/class-asset-loader.php';
require_once __DIR__ . '/includes/class-branding-settings.php';
require_once __DIR__ . '/includes/class-rest-api.php';

WP_React_UI_Branding_Settings::init();

add_action('update_option_wp_react_ui_branding', function () {
    WP_React_UI_Asset_Loader::clear_sidebar_shell_cache();
}, 10, 0);

// ─── Admin Init ───────────────────────────────────────────────────────────────

add_action('admin_init', function () {

    remove_action('in_admin_header', 'wp_admin_bar_render', 0);
    remove_action('wp_head', '_admin_bar_bump_cb');

    $manifest_path = plugin_dir_path(__FILE__) . 'dist/.vite/manifest.json';
    if (file_exists($manifest_path)) {
        $current_mtime = filemtime($manifest_path);
        $cached_mtime  = get_option('wp_react_ui_manifest_mtime', 0);
        if ($current_mtime !== (int) $cached_mtime) {
            WP_React_UI_Asset_Loader::clear_cache();
            update_option('wp_react_ui_manifest_mtime', $current_mtime);
        }
    }

    if (isset($_GET['flush_react_cache']) && current_user_can('manage_options')
        && wp_verify_nonce($_GET['_wpnonce'] ?? '', 'flush_react_cache')) {
        WP_React_UI_Asset_Loader::clear_cache();
        wp_redirect(admin_url());
        exit;
    }
});

// ─── Clear menu cache on plugin activation / deactivation ─────────────────────

add_action('activated_plugin', function () {
    WP_React_UI_Asset_Loader::clear_menu_cache();
});

add_action('deactivated_plugin', function () {
    WP_React_UI_Asset_Loader::clear_menu_cache();
});

add_action('after_switch_theme', function () {
    WP_React_UI_Asset_Loader::clear_menu_cache();
});

// ─── Admin Head ───────────────────────────────────────────────────────────────

add_action('admin_head', function () {

    echo '<link rel="preconnect" href="https://fonts.googleapis.com">' . "\n";
    echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' . "\n";
    echo '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">' . "\n";

    global $pagenow;
    $editor_pages = ['post.php', 'post-new.php', 'site-editor.php'];
    if (in_array($pagenow, $editor_pages, true)) {
        return; // Output nothing — let WordPress render natively
    }

    $preload_assets = WP_React_UI_Asset_Loader::get_preload_assets();

    foreach ($preload_assets['css'] as $css_url) {
        echo '<link rel="preload" href="' . esc_url($css_url) . '" as="style">' . "\n";
    }

    foreach ($preload_assets['js'] as $js_url) {
        echo '<link rel="modulepreload" href="' . esc_url($js_url) . '">' . "\n";
    }

    echo '<style id="wp-react-ui-critical">' . file_get_contents(__DIR__ . '/includes/critical.css') . '</style>';

}, 1);

// ─── REST API ─────────────────────────────────────────────────────────────────

add_action('rest_api_init', ['WP_React_UI_REST_API', 'register']);

// ─── Enqueue Scripts + Localize Data ─────────────────────────────────────────

add_action('admin_enqueue_scripts', function () {
    global $pagenow;
    if (in_array($pagenow, ['post.php', 'post-new.php'], true)) {
        return;
    }

    WP_React_UI_Asset_Loader::enqueue();

    $user     = wp_get_current_user();
    $theme    = get_user_meta($user->ID, 'wp_react_ui_theme', true) ?: 'light';
    $branding = WP_React_UI_Branding_Settings::get_frontend_branding();

    wp_localize_script('wp-react-ui', 'wpReactUi', [
        'menu'        => WP_React_UI_Asset_Loader::get_menu_data(),
        'menuVersion' => time(),
        'siteName'    => $branding['siteName'],
        'branding'    => $branding,
        'theme'       => $theme,
        'adminUrl'    => admin_url(),
        'nonce'       => wp_create_nonce('wp_rest'),
        'restUrl'     => rest_url('wp-react-ui/v1'),
        'logoutUrl'   => wp_logout_url(admin_url()),
        'logoutNonce' => wp_create_nonce('log-out'),
        'assetsUrl'   => plugin_dir_url(__FILE__) . 'dist/', // For hashed assets
        'publicUrl'   => plugin_dir_url(__FILE__) . 'dist/', // Same in prod
        'cssUrls'     => WP_React_UI_Asset_Loader::$css_urls, // ← add this
        'sidebarShellHtml' => WP_React_UI_Asset_Loader::get_sidebar_shell_html($branding, $theme),
        'user'        => [
            'name'   => $user->display_name,
            'role'   => implode(', ', $user->roles),
        ],
    ]);
});
