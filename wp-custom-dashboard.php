<?php
/**
 * Plugin Name: WP React UI
 * Description: Replaces Navbar and Sidebar with React + Ant Design
 * Version: 1.0.0
 */

defined('ABSPATH') || exit;

require_once __DIR__ . '/includes/class-asset-loader.php';

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

    if (isset($_GET['flush_react_cache']) && current_user_can('manage_options')) {
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

    $manifest_path = plugin_dir_path(__FILE__) . 'dist/.vite/manifest.json';
    if (file_exists($manifest_path)) {
        $manifest = json_decode(file_get_contents($manifest_path), true);
        $entry    = $manifest['src/main.tsx'] ?? null;

        global $pagenow;
        $editor_pages = ['post.php', 'post-new.php', 'site-editor.php'];
        if (in_array($pagenow, $editor_pages, true)) {
            return; // Output nothing — let WordPress render natively
        }

        if (!empty($entry['css'])) {
            foreach ($entry['css'] as $css_file) {
                $css_url = plugin_dir_url(__FILE__) . 'dist/' . $css_file;
                echo '<link rel="preload" href="' . esc_url($css_url) . '" as="style">' . "\n";
            }
        }

        foreach ($manifest as $chunk) {
            if (empty($chunk['file']) || !str_ends_with($chunk['file'], '.js')) continue;
            $chunk_url = plugin_dir_url(__FILE__) . 'dist/' . $chunk['file'];
            echo '<link rel="modulepreload" href="' . esc_url($chunk_url) . '">' . "\n";
        }
    }

    echo '<style id="wp-react-ui-critical">

        /* ── Inter font everywhere ── */
        html, body, input, button, select, textarea {
            font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif !important;
        }

        /* ── Hide native WordPress chrome ── */
        #adminmenuback,
        #adminmenuwrap,
        #adminmenumain,
        #wpadminbar {
            display: none !important;
        }

        html.wp-toolbar {
            padding-top: 0 !important;
        }

        html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            overflow: hidden !important;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif !important;
        }

        /* ── CSS variable driven by JS on collapse/expand ── */
        :root {
            --sidebar-width: 240px;
            --sidebar-transition: 0.3s ease;
        }

        #wpwrap {
            display: grid !important;
            grid-template-columns: var(--sidebar-width, 240px) 1fr !important;
            grid-template-rows: 64px 1fr !important;
            grid-template-areas:
                "sidebar navbar"
                "sidebar content" !important;
            height: 100vh !important;
            min-height: 100vh !important;
            padding: 0 !important;
            overflow: hidden !important;
            transition: grid-template-columns var(--sidebar-transition) !important;
        }

        /* ── Sidebar ── */
        #react-sidebar-root {
            grid-area: sidebar !important;
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
            width: 100% !important;
            min-width: 0 !important;
            overflow: hidden !important;
        }

        /* ── Navbar ── */
        #react-navbar-root {
            grid-area: navbar !important;
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            min-height: 64px !important;
            min-width: 0 !important;
            background: transparent !important;
            z-index: 100 !important;
        }

        /* ── Content ── */
        #wpcontent,
        #wpfooter {
            grid-area: content !important;
            margin-left: 0 !important;
            min-width: 0 !important;
            overflow-y: auto !important;
            visibility: hidden !important;
            opacity: 0 !important;
            transition: opacity 0.15s ease !important;
        }

        /* ── Reveal content once React is ready ── */
        #wpwrap.react-ready #wpcontent,
        #wpwrap.react-ready #wpfooter {
            visibility: visible !important;
            opacity: 1 !important;
        }

        /* ── Skeleton shimmer ── */
        @keyframes wp-react-skeleton {
            0%, 100% { opacity: 0.5; }
            50%       { opacity: 1;   }
        }

        #react-navbar-root:not(.mounted)::before {
            content: "";
            display: block;
            height: 64px;
            background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
            background-size: 200% 100%;
            animation: wp-react-skeleton 1.5s ease-in-out infinite;
        }

        #react-sidebar-root:not(.mounted)::before {
            content: "";
            display: block;
            margin: 20px 16px;
            height: 18px;
            width: 60%;
            border-radius: 6px;
            background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
            background-size: 200% 100%;
            animation: wp-react-skeleton 1.5s ease-in-out infinite;
        }

        #react-navbar-root.mounted::before,
        #react-sidebar-root.mounted::before {
            display: none !important;
        }

    </style>';

}, 1);

// ─── REST API ─────────────────────────────────────────────────────────────────

add_action('rest_api_init', function () {

    // ── Menu endpoint ────────────────────────────────────────────────────────
    register_rest_route('wp-react-ui/v1', '/menu', [
        'methods'             => 'GET',
        'callback'            => function () {
            return rest_ensure_response([
                'menu' => WP_React_UI_Asset_Loader::get_menu_data(),
            ]);
        },
        'permission_callback' => fn() => current_user_can('manage_options'),
    ]);

    // ── Theme preference ─────────────────────────────────────────────────────
    register_rest_route('wp-react-ui/v1', '/theme', [
        [
            'methods'             => 'GET',
            'callback'            => function () {
                $theme = get_user_meta(get_current_user_id(), 'wp_react_ui_theme', true);
                return rest_ensure_response(['theme' => $theme ?: 'light']);
            },
            'permission_callback' => fn() => is_user_logged_in(),
        ],
        [
            'methods'             => 'POST',
            'callback'            => function (WP_REST_Request $request) {
                $theme = $request->get_param('theme') === 'dark' ? 'dark' : 'light';
                update_user_meta(get_current_user_id(), 'wp_react_ui_theme', $theme);
                return rest_ensure_response(['theme' => $theme]);
            },
            'permission_callback' => fn() => is_user_logged_in(),
            'args'                => [
                'theme' => [
                    'required'          => true,
                    'sanitize_callback' => 'sanitize_text_field',
                ],
            ],
        ],
    ]);
});

// ─── Enqueue Scripts + Localize Data ─────────────────────────────────────────

add_action('admin_enqueue_scripts', function () {
    global $pagenow;
    if (in_array($pagenow, ['post.php', 'post-new.php'], true)) {
        return;
    }

    WP_React_UI_Asset_Loader::enqueue();

    $user  = wp_get_current_user();
    $theme = get_user_meta($user->ID, 'wp_react_ui_theme', true) ?: 'light';

    wp_localize_script('wp-react-ui', 'wpReactUi', [
    'menu'        => WP_React_UI_Asset_Loader::get_menu_data(),
    'menuVersion' => time(),
    'siteName'    => get_bloginfo('name'),
    'theme'       => $theme,
    'adminUrl'    => admin_url(),
    'nonce'       => wp_create_nonce('wp_rest'),
    'restUrl'     => rest_url('wp-react-ui/v1'),
    'logoutUrl'   => wp_logout_url(admin_url()),
    'logoutNonce' => wp_create_nonce('log-out'),
    'assetsUrl' => plugin_dir_url(__FILE__) . 'dist/', // For hashed assets
    'publicUrl' => plugin_dir_url(__FILE__) . 'dist/', // Same in prod
    'cssUrls'     => WP_React_UI_Asset_Loader::$css_urls, // ← add this
    'user'        => [
        'name'   => $user->display_name,
        'role'   => implode(', ', $user->roles),
        'avatar' => get_avatar_url($user->ID, ['size' => 80]),
    ],
]);
});