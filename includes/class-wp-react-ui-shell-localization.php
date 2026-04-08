<?php
/**
 * Shell localization payload builder for WP React UI.
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Builds the frontend boot payload for the React shell.
 */
class WP_React_UI_Shell_Localization {

	/**
	 * Returns the localized payload passed to the React shell.
	 *
	 * @return array
	 */
	public static function get_payload(): array {
		$user          = wp_get_current_user();
		$theme         = get_user_meta( $user->ID, 'wp_react_ui_theme', true );
		$branding      = WP_React_UI_Branding_Settings::get_frontend_branding();
		$preferences   = WP_React_UI_Branding_Settings::get_navigation_preferences();
		$special_pages = wp_react_ui_get_special_page_config();

		if ( ! $theme ) {
			$theme = 'light';
		}

		return array(
			'menu'      => WP_React_UI_Menu_Repository::get_menu_data(),
			'siteName'  => $branding['siteName'],
			'branding'  => $branding,
			'theme'     => $theme,
			'adminUrl'  => admin_url(),
			'publicUrl' => home_url( '/' ),
			'navigation' => array(
				'fullReloadPageParams' => array_values( $special_pages['full_reload_page_params'] ),
				'shellDisabledPagenow' => array_values( $special_pages['shell_disabled_pagenow'] ),
				'breakoutPagenow'      => array_values( $special_pages['breakout_pagenow'] ),
				'openInNewTabPatterns' => array_values( $preferences['openInNewTabPatterns'] ),
			),
			'nonce'     => wp_create_nonce( 'wp_rest' ),
			'restUrl'   => rest_url( 'wp-react-ui/v1' ),
			'logoutUrl' => wp_logout_url( admin_url() ),
			'assetsUrl' => plugins_url( 'dist/', dirname( __DIR__ ) . '/wp-custom-dashboard.php' ),
			'user'      => array(
				'name' => $user->display_name,
				'role' => implode( ', ', $user->roles ),
			),
			'shellRoutes' => self::get_shell_routes(),
		);
	}

	/**
	 * Collects plugin-registered shell routes via the wp_react_ui_shell_routes filter.
	 *
	 * Third-party plugins register routes like:
	 *   add_filter( 'wp_react_ui_shell_routes', function( $routes ) {
	 *       $routes[] = array(
	 *           'slug'           => 'my-plugin-page',
	 *           'label'          => 'My Plugin',
	 *           'entrypoint_url' => plugins_url( 'dist/shell-page.js', __FILE__ ),
	 *       );
	 *       return $routes;
	 *   } );
	 *
	 * @return array<int, array{slug: string, label: string, entrypoint_url: string}>
	 */
	private static function get_shell_routes(): array {
		/**
		 * Filters the list of plugin-provided shell routes.
		 *
		 * Each route is an associative array with:
		 *   - slug           (string) The ?page= parameter value.
		 *   - label          (string) Human-readable label (for UI or errors).
		 *   - entrypoint_url (string) Full URL to the JS module that exports a default React component.
		 *
		 * @param array $routes Default empty array.
		 * @return array
		 */
		$routes = apply_filters( 'wp_react_ui_shell_routes', array() );

		if ( ! is_array( $routes ) ) {
			return array();
		}

		$sanitized = array();
		foreach ( $routes as $route ) {
			if (
				is_array( $route ) &&
				! empty( $route['slug'] ) &&
				! empty( $route['entrypoint_url'] )
			) {
				$sanitized[] = array(
					'slug'           => sanitize_key( $route['slug'] ),
					'label'          => sanitize_text_field( $route['label'] ?? $route['slug'] ),
					'entrypoint_url' => esc_url_raw( $route['entrypoint_url'] ),
				);
			}
		}

		return $sanitized;
	}
}
