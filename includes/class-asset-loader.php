<?php

class WP_React_UI_Asset_Loader {

    private static string $dev_url  = 'http://localhost:5173';
    private static string $dist_dir = '';
    private static string $dist_url = '';

    private const CACHE_MANIFEST = 'wp_react_ui_manifest';
    private const CACHE_DEV      = 'wp_react_ui_is_dev';
    private const CACHE_MENU     = 'wp_react_ui_menu';

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
        $cached = get_transient(self::CACHE_MANIFEST);
        if ($cached !== false) {
            return $cached;
        }

        $manifest_path = self::$dist_dir . '.vite/manifest.json';
        if (!file_exists($manifest_path)) return null;

        $manifest = json_decode(file_get_contents($manifest_path), true);
        if (!$manifest) return null;

        set_transient(self::CACHE_MANIFEST, $manifest, DAY_IN_SECONDS);
        return $manifest;
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
    }

    public static function clear_cache(): void {
        delete_transient(self::CACHE_MANIFEST);
        delete_transient(self::CACHE_DEV);
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

        // Enqueue entry CSS globally (no shadow DOM)
        $css_index = 0;
        foreach (($entry['css'] ?? []) as $css_file) {
            wp_enqueue_style(
                'wp-react-ui-css-' . $css_index,
                self::$dist_url . $css_file,
                [], null
            );
            $css_index++;
        }

        // outside.css — WordPress content area tweaks
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
        $user_id   = get_current_user_id();
        $cache_key = self::CACHE_MENU . '_' . $user_id;
        $cached    = get_transient($cache_key);

        if ($cached !== false) {
            return $cached;
        }

        global $menu, $submenu;
        $items = [];

        $comments_enabled = self::are_comments_enabled();

        foreach ((array) $menu as $item) {
            if (empty($item[0])) continue;

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
        return $items;
    }

    /**
     * Parses a raw WordPress menu label into a clean label + optional count.
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
        $cleaned = wp_strip_all_tags($cleaned);
        $cleaned = trim(preg_replace('/\s+/', ' ', $cleaned));

        return [
            'label' => $cleaned,
            'count' => $count,
        ];
    }
}
