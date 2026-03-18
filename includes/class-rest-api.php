<?php

defined('ABSPATH') || exit;

class WP_React_UI_REST_API {

    public static function register(): void {

        // ── Menu endpoint ────────────────────────────────────────────────────
        register_rest_route('wp-react-ui/v1', '/menu', [
            'methods'             => 'GET',
            'callback'            => function () {
                return rest_ensure_response([
                    'menu' => WP_React_UI_Asset_Loader::get_menu_data(),
                ]);
            },
            'permission_callback' => fn() => current_user_can('manage_options'),
        ]);

        // ── Theme preference ─────────────────────────────────────────────────
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
    }
}
