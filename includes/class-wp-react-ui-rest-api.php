<?php
/**
 * REST API endpoints for WP React UI.
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers REST API routes for menu data and theme preferences.
 */
class WP_React_UI_REST_API {

	/**
	 * Registers all REST API routes.
	 *
	 * @return void
	 */
	public static function register(): void {

		// Menu endpoint — enables client-side refresh without full page reload.
		// Initial menu data is inlined via wp_localize_script.
		// Permission: read (any authenticated dashboard user).
		register_rest_route(
			'wp-react-ui/v1',
			'/menu',
			array(
				'methods'             => 'GET',
				'callback'            => function () {
					return rest_ensure_response(
						array(
							'menu' => WP_React_UI_Menu_Repository::get_menu_data(),
						)
					);
				},
				'permission_callback' => fn() => current_user_can( 'read' ),
			)
		);

		// Theme preference endpoints — GET reads, POST writes user meta.
		register_rest_route(
			'wp-react-ui/v1',
			'/theme',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => function () {
						$theme = get_user_meta( get_current_user_id(), 'wp_react_ui_theme', true );
						if ( ! $theme ) {
							$theme = 'light';
						}
						return rest_ensure_response( array( 'theme' => $theme ) );
					},
					'permission_callback' => fn() => is_user_logged_in(),
				),
				array(
					'methods'             => 'POST',
					'callback'            => function ( WP_REST_Request $request ) {
						$theme = 'dark' === $request->get_param( 'theme' ) ? 'dark' : 'light';
						update_user_meta( get_current_user_id(), 'wp_react_ui_theme', $theme );
						return rest_ensure_response( array( 'theme' => $theme ) );
					},
					'permission_callback' => fn() => is_user_logged_in(),
					'args'                => array(
						'theme' => array(
							'required'          => true,
							'sanitize_callback' => 'sanitize_text_field',
						),
					),
				),
			)
		);

		// Branding settings endpoints — GET reads, POST writes.
		// Permission: manage_options (administrators only).
		register_rest_route(
			'wp-react-ui/v1',
			'/branding',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => function () {
						return rest_ensure_response( WP_React_UI_Branding_Settings::get_rest_data() );
					},
					'permission_callback' => fn() => current_user_can( 'manage_options' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => function ( WP_REST_Request $request ) {
						$input = array(
							'light_logo_id'          => $request->get_param( 'lightLogoId' ),
							'dark_logo_id'           => $request->get_param( 'darkLogoId' ),
							'long_logo_id'           => $request->get_param( 'longLogoId' ),
							'use_long_logo'          => $request->get_param( 'useLongLogo' ),
							'primary_color'          => $request->get_param( 'primaryColor' ),
							'font_preset'            => $request->get_param( 'fontPreset' ),
							'open_in_new_tab_patterns' => $request->get_param( 'openInNewTabPatterns' ),
						);

						$result = WP_React_UI_Branding_Settings::save_from_rest( $input );

						if ( is_wp_error( $result ) ) {
							return $result;
						}

						return rest_ensure_response( WP_React_UI_Branding_Settings::get_rest_data() );
					},
					'permission_callback' => fn() => current_user_can( 'manage_options' ),
				),
			)
		);
	}
}
