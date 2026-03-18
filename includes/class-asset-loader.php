<?php

class WP_React_UI_Asset_Loader {

    private static string $dev_url  = 'http://localhost:5173';
    private static string $dist_dir = '';
    private static string $dist_url = '';

    private const CACHE_MANIFEST = 'wp_react_ui_manifest';
    private const CACHE_DEV      = 'wp_react_ui_is_dev';
    private const CACHE_MENU     = 'wp_react_ui_menu';
    private const CACHE_SIDEBAR_SHELL = 'wp_react_ui_sidebar_shell';

    private static ?array $manifest_request_cache = null;
    private static ?array $menu_request_cache = null;
    private static array $sidebar_shell_request_cache = [];
    public static array $css_urls = [];

    // ─── Init ─────────────────────────────────────────────────────────────────

    public static function init(): void {
        self::$dist_dir = plugin_dir_path(__DIR__) . 'dist/';
        self::$dist_url = plugin_dir_url(__DIR__)  . 'dist/';
    }

    // ─── Dev mode detection ───────────────────────────────────────────────────

    public static function is_dev(): bool {
        if (!defined('WP_DEBUG') || !WP_DEBUG) return false;

        $cached = get_transient(self::CACHE_DEV);
        if ($cached !== false) {
            return (bool) $cached;
        }

        $response = @file_get_contents(self::$dev_url . '/@vite/client');
        $is_dev   = $response !== false;

        set_transient(self::CACHE_DEV, $is_dev ? '1' : '0', 10);
        return $is_dev;
    }

    // ─── Manifest ─────────────────────────────────────────────────────────────

    private static function get_manifest(): ?array {
        if (self::$manifest_request_cache !== null) {
            return self::$manifest_request_cache;
        }

        $cached = get_transient(self::CACHE_MANIFEST);
        if ($cached !== false) {
            self::$manifest_request_cache = $cached;
            return self::$manifest_request_cache;
        }

        $manifest_path = self::$dist_dir . '.vite/manifest.json';
        if (!file_exists($manifest_path)) return null;

        $manifest = json_decode(file_get_contents($manifest_path), true);
        if (!$manifest) return null;

        set_transient(self::CACHE_MANIFEST, $manifest, DAY_IN_SECONDS);
        self::$manifest_request_cache = $manifest;
        return self::$manifest_request_cache;
    }

    public static function get_preload_assets(): array {
        self::init();

        $manifest = self::get_manifest();
        if (!$manifest) {
            return [
                'css' => [],
                'js'  => [],
            ];
        }

        $entry = $manifest['src/main.tsx'] ?? null;
        $css_urls = [];
        $js_urls  = [];

        if (!empty($entry['css'])) {
            foreach ($entry['css'] as $css_file) {
                $css_urls[] = self::$dist_url . $css_file;
            }
        }

        foreach ($manifest as $chunk) {
            if (empty($chunk['file']) || !str_ends_with($chunk['file'], '.js')) {
                continue;
            }

            $js_urls[] = self::$dist_url . $chunk['file'];
        }

        return [
            'css' => $css_urls,
            'js'  => $js_urls,
        ];
    }

    // ─── Cache clearing ───────────────────────────────────────────────────────

    /**
     * Clears only the menu transient for the current user.
     * Called on plugin activation / deactivation / theme switch.
     */
    public static function clear_menu_cache(): void {
        global $wpdb;

        $prefix = self::CACHE_MENU;
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options}
                 WHERE option_name LIKE %s
                 OR    option_name LIKE %s",
                '_transient_' . $prefix . '_%',
                '_transient_timeout_' . $prefix . '_%'
            )
        );

        self::$menu_request_cache = null;
        self::clear_sidebar_shell_cache();
    }

    public static function clear_sidebar_shell_cache(): void {
        global $wpdb;

        $prefix = self::CACHE_SIDEBAR_SHELL;
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options}
                 WHERE option_name LIKE %s
                 OR    option_name LIKE %s",
                '_transient_' . $prefix . '_%',
                '_transient_timeout_' . $prefix . '_%'
            )
        );

        self::$sidebar_shell_request_cache = [];
    }

    /**
     * Clears everything — manifest, dev flag, and all menu caches.
     */
    public static function clear_cache(): void {
        delete_transient(self::CACHE_MANIFEST);
        delete_transient(self::CACHE_DEV);
        self::$manifest_request_cache = null;
        self::clear_menu_cache();
    }

    // ─── Enqueue ──────────────────────────────────────────────────────────────

    public static function enqueue(): void {
        self::init();
        if (self::is_dev()) {
            self::enqueue_dev();
        } else {
            self::enqueue_prod();
        }
    }

    private static function enqueue_dev(): void {
        wp_enqueue_script(
            'vite-client',
            self::$dev_url . '/@vite/client',
            [], null, false
        );
        wp_enqueue_script(
            'wp-react-ui',
            self::$dev_url . '/src/main.tsx',
            ['vite-client'], null, false
        );
        add_filter('script_loader_tag', function ($tag, $handle) {
            if (in_array($handle, ['vite-client', 'wp-react-ui'])) {
                $tag = str_replace('<script ', '<script type="module" ', $tag);
            }
            return $tag;
        }, 10, 2);

        // In dev mode outside.css is handled by Vite HMR — no separate enqueue needed
    }

    private static function enqueue_prod(): void {
        $manifest = self::get_manifest();
        if (!$manifest) return;

        $entry = $manifest['src/main.tsx'] ?? null;
        if (!$entry) return;

        wp_enqueue_script(
            'wp-react-ui',
            self::$dist_url . $entry['file'],
            [], null, false
        );

        // ── Collect CSS URLs — DO NOT enqueue globally.
        // Pass them to JS so mount.tsx injects them only into shadow roots.
        $css_urls = [];
        foreach (($entry['css'] ?? []) as $css_file) {
            $css_urls[] = self::$dist_url . $css_file;
        }

        // Store on wpReactUi.cssUrls — consumed by mount.tsx
        // (wp_localize_script is called later in wp-react-ui.php,
        //  so we stash the URLs in a static property for pickup there)
        self::$css_urls = $css_urls;

        // ── outside.css still goes into <head> — that's intentional
        $outside_entry = $manifest['src/outside.css'] ?? null;
        if (!empty($outside_entry['file'])) {
            wp_enqueue_style(
                'wp-react-ui-outside',
                self::$dist_url . $outside_entry['file'],
                [], null
            );
        }

        add_filter('script_loader_tag', function ($tag, $handle) {
            if ($handle === 'wp-react-ui') {
                $tag = str_replace(
                    '<script ',
                    '<script type="module" crossorigin ',
                    $tag
                );
            }
            return $tag;
        }, 10, 2);
    }
    // ─── Comments enabled check ───────────────────────────────────────────────

    /**
     * Returns true if comments are effectively enabled on this site.
     *
     * Checks all public post types for comments support via post_type_supports().
     * SNN-BRX disables comments by calling remove_post_type_support() on all
     * public post types, so this check catches it without hardcoding any
     * third-party option key.
     */
    private static function are_comments_enabled(): bool {
        $post_types = get_post_types(['public' => true]);

        foreach ($post_types as $pt) {
            if (post_type_supports($pt, 'comments')) {
                return true;
            }
        }

        return false;
    }

    // ─── Menu data ────────────────────────────────────────────────────────────

    public static function get_menu_data(): array {
        if (self::$menu_request_cache !== null) {
            return self::$menu_request_cache;
        }

        $user_id   = get_current_user_id();
        $cache_key = self::CACHE_MENU . '_' . $user_id;
        $cached    = get_transient($cache_key);

        if ($cached !== false) {
            self::$menu_request_cache = $cached;
            return self::$menu_request_cache;
        }

        global $menu, $submenu;
        $items = [];

        // Dynamically detect whether comments are enabled — works with SNN-BRX,
        // Disable Comments plugin, or any other mechanism that calls
        // remove_post_type_support().
        $comments_enabled = self::are_comments_enabled();

        foreach ((array) $menu as $item) {
            if (empty($item[0])) continue;

            // Hide the Comments menu item when comments are disabled site-wide
            if (!$comments_enabled && isset($item[2]) && $item[2] === 'edit-comments.php') {
                continue;
            }

            ['label' => $label, 'count' => $count] = self::parse_menu_label($item[0]);
            if (empty($label)) continue;

            $slug     = $item[2];
            $children = [];

            if (!empty($submenu[$slug])) {
                foreach ($submenu[$slug] as $sub) {
                    if (empty($sub[0])) continue;

                    ['label' => $sub_label, 'count' => $sub_count] = self::parse_menu_label($sub[0]);
                    if (empty($sub_label)) continue;

                    $children[] = [
                        'label' => $sub_label,
                        'count' => $sub_count,
                        'slug'  => $sub[2],
                        'cap'   => $sub[1],
                    ];
                }
            }

            $items[] = [
                'label'    => $label,
                'count'    => $count,
                'slug'     => $slug,
                'icon'     => $item[6] ?? '',
                'cap'      => $item[1],
                'children' => $children,
            ];
        }

        set_transient($cache_key, $items, HOUR_IN_SECONDS);
        self::$menu_request_cache = $items;
        return self::$menu_request_cache;
    }

    public static function get_sidebar_shell_html(array $branding, string $theme): string {
        $user_id    = get_current_user_id();
        $site_name = (string) ($branding['siteName'] ?? get_bloginfo('name'));
        $logo_url  = self::get_sidebar_shell_logo_url($branding, $theme);
        $menu_items = array_slice(self::get_menu_data(), 0, 10);
        $signature = md5((string) wp_json_encode([
            'branding' => $branding,
            'theme'    => $theme,
            'menu'     => $menu_items,
        ]));
        $cache_key = self::CACHE_SIDEBAR_SHELL . '_' . $user_id . '_' . $theme;

        if (isset(self::$sidebar_shell_request_cache[$cache_key], self::$sidebar_shell_request_cache[$cache_key]['signature'])
            && self::$sidebar_shell_request_cache[$cache_key]['signature'] === $signature) {
            return self::$sidebar_shell_request_cache[$cache_key]['html'];
        }

        $cached = get_transient($cache_key);
        if (is_array($cached)
            && isset($cached['signature'], $cached['html'])
            && $cached['signature'] === $signature
            && is_string($cached['html'])) {
            self::$sidebar_shell_request_cache[$cache_key] = $cached;
            return $cached['html'];
        }

        ob_start();
        ?>
        <div class="wp-react-ui-sidebar-shell" aria-hidden="true">
            <div class="wp-react-ui-sidebar-shell__header">
                <div class="wp-react-ui-sidebar-shell__brand">
                    <span class="wp-react-ui-sidebar-shell__logo">
                        <?php if ($logo_url !== '') : ?>
                            <img src="<?php echo esc_url($logo_url); ?>" alt="">
                        <?php else : ?>
                            <span class="wp-react-ui-sidebar-shell__logo-fallback">
                                <?php echo esc_html(strtoupper(substr($site_name, 0, 1) ?: 'S')); ?>
                            </span>
                        <?php endif; ?>
                    </span>

                    <span class="wp-react-ui-sidebar-shell__brand-copy">
                        <span class="wp-react-ui-sidebar-shell__site-name">
                            <?php echo esc_html($site_name); ?>
                        </span>
                        <span class="wp-react-ui-sidebar-shell__site-subtitle">Control Panel</span>
                    </span>
                </div>
            </div>

            <div class="wp-react-ui-sidebar-shell__menu">
                <?php foreach ($menu_items as $item) : ?>
                    <?php
                    $is_active = self::is_sidebar_shell_item_active($item);
                    $count     = isset($item['count']) ? (int) $item['count'] : 0;
                    ?>
                    <div class="wp-react-ui-sidebar-shell__item<?php echo $is_active ? ' is-active' : ''; ?>">
                        <span class="wp-react-ui-sidebar-shell__item-icon">
                            <?php echo self::render_sidebar_shell_icon($item); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                        </span>
                        <span class="wp-react-ui-sidebar-shell__item-label">
                            <?php echo esc_html((string) ($item['label'] ?? '')); ?>
                        </span>
                        <?php if ($count > 0) : ?>
                            <span class="wp-react-ui-sidebar-shell__item-count">
                                <?php echo esc_html((string) $count); ?>
                            </span>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php

        $html = trim((string) ob_get_clean());
        $payload = [
            'signature' => $signature,
            'html'      => $html,
        ];

        set_transient($cache_key, $payload, HOUR_IN_SECONDS);
        self::$sidebar_shell_request_cache[$cache_key] = $payload;

        return $html;
    }

    private static function get_sidebar_shell_logo_url(array $branding, string $theme): string {
        $logos = isset($branding['logos']) && is_array($branding['logos']) ? $branding['logos'] : [];
        $light_url = isset($logos['lightUrl']) ? (string) $logos['lightUrl'] : '';
        $dark_url = isset($logos['darkUrl']) ? (string) $logos['darkUrl'] : '';
        $default_url = isset($logos['defaultUrl']) ? (string) $logos['defaultUrl'] : '';

        if ($theme === 'dark') {
            return $dark_url !== '' ? $dark_url : ($light_url !== '' ? $light_url : $default_url);
        }

        return $light_url !== '' ? $light_url : $default_url;
    }

    private static function is_sidebar_shell_item_active(array $item): bool {
        if (empty($item['slug'])) {
            return false;
        }

        if (self::is_current_admin_slug((string) $item['slug'])) {
            return true;
        }

        foreach ((array) ($item['children'] ?? []) as $child) {
            if (!empty($child['slug']) && self::is_current_admin_slug((string) $child['slug'])) {
                return true;
            }
        }

        return false;
    }

    private static function is_current_admin_slug(string $slug): bool {
        global $pagenow;

        $page = isset($_GET['page']) ? sanitize_text_field(wp_unslash($_GET['page'])) : '';
        if ($page !== '') {
            return $page === $slug;
        }

        $current = (string) $pagenow;

        if (isset($_GET['post_type'])) {
            $current .= '?post_type=' . sanitize_key(wp_unslash($_GET['post_type']));
        }

        return $current === $slug;
    }

    private static function render_sidebar_shell_icon(array $item): string {
        $icon = isset($item['icon']) ? (string) $item['icon'] : '';
        $label = isset($item['label']) ? (string) $item['label'] : '';

        if ($icon !== '' && str_starts_with($icon, 'dashicons-')) {
            return '<span class="dashicons ' . esc_attr($icon) . '" aria-hidden="true"></span>';
        }

        $initial = strtoupper(substr($label, 0, 1) ?: '•');

        return '<span class="wp-react-ui-sidebar-shell__item-icon-fallback" aria-hidden="true">' . esc_html($initial) . '</span>';
    }

    /**
     * Parses a raw WordPress menu label into a clean label + optional count.
     *
     * WordPress renders notification bubbles like:
     *   Plugins <span class="update-plugins count-3">
     *              <span class="plugin-count">3</span>
     *            </span>
     *   Comments <span class="awaiting-mod count-12">
     *               <span class="pending-count">12</span>
     *             </span>
     *
     * Returns count as int when found, null when not present.
     * Count is never returned as 0 — a zero bubble is treated as no bubble.
     *
     * @return array{ label: string, count: int|null }
     */
    private static function parse_menu_label(string $raw): array {
        $count = null;

        if (preg_match('/<span[^>]*>\s*(\d+)\s*<\/span>/i', $raw, $matches)) {
            $parsed = (int) $matches[1];
            if ($parsed > 0) {
                $count = $parsed;
            }
        }

        $cleaned = preg_replace('/<span[^>]*>.*?<\/span>/is', '', $raw);
        $cleaned = preg_replace('/<span[^>]*>.*?<\/span>/is', '', $cleaned);
        $cleaned = wp_strip_all_tags($cleaned);
        $cleaned = trim(preg_replace('/\s+/', ' ', $cleaned));

        return [
            'label' => $cleaned,
            'count' => $count,
        ];
    }
}
