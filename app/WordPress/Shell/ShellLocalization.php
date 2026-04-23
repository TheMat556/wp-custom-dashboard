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
		$can_manage    = current_user_can( 'manage_options' );
		$license       = self::get_public_license_payload( $can_manage );
		$preferences   = WP_React_UI_Branding_Settings::get_navigation_preferences();
		$special_pages = wp_react_ui_get_special_page_config();

		if ( ! $theme ) {
			$theme = 'light';
		}

		return array(
			'menu'        => WP_React_UI_Menu_Repository::get_menu_data(),
			'siteName'    => $branding['siteName'],
			'branding'    => $branding,
			'theme'       => $theme,
			'adminUrl'    => admin_url(),
			'publicUrl'   => home_url( '/' ),
			'navigation'  => array(
				'fullReloadPageParams' => array_values( $special_pages['full_reload_page_params'] ),
				'shellDisabledPagenow' => array_values( $special_pages['shell_disabled_pagenow'] ),
				'breakoutPagenow'      => array_values( $special_pages['breakout_pagenow'] ),
				'openInNewTabPatterns' => array_values( $preferences['openInNewTabPatterns'] ),
			),
			'nonce'       => wp_create_nonce( 'wp_rest' ),
			'restUrl'     => rest_url( 'wp-react-ui/v1' ),
			'logoutUrl'   => wp_logout_url( admin_url() ),
			'assetsUrl'   => plugins_url( 'dist/', dirname( __DIR__, 3 ) . '/wp-custom-dashboard.php' ),
			'locale'      => get_locale(),
			'user'        => array(
				'name'             => $user->display_name,
				'canManageOptions' => $can_manage,
				'canEditPosts'     => current_user_can( 'edit_posts' ),
			),
			'license'     => $license,
			'shellRoutes' => self::get_shell_routes(),
		);
	}

	/**
	 * Returns the list of shell-managed page slugs.
	 *
	 * @return array<int, string>
	 */
	public static function get_shell_route_slugs(): array {
		$routes = self::get_shell_routes();
		$slugs  = array_map(
			static function ( array $route ): string {
				return sanitize_key( $route['slug'] ?? '' );
			},
			$routes
		);

		if ( current_user_can( 'manage_options' ) ) {
			$slugs[] = WP_React_UI_Branding_Settings::get_page_slug();
			$slugs[] = \WpReactUi\WordPress\License\LicenseSettings::get_page_slug();
		}

		$slugs[] = \WpReactUi\WordPress\Chat\ChatPage::get_page_slug();

		return array_values( array_filter( array_unique( $slugs ) ) );
	}

	/**
	 * Collects plugin-registered shell routes via the wp_react_ui_shell_routes filter.
	 *
	 * Third-party plugins register routes like:
	 *   add_filter( 'wp_react_ui_shell_routes', function( $routes ) {
	 *       $routes[] = array(
	 *           'slug'           => 'my-plugin-page',
	 *           'label'          => 'My Plugin',
	 *           'capability'     => 'manage_options',
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
		 *   - capability     (string, optional) Required capability to access the shell page. Defaults to manage_options.
		 *   - entrypoint_url (string) Full URL to the JS module that exports a default React component.
		 *
		 * @param array $routes Default empty array.
		 * @return array
		 */
		$routes = apply_filters( 'wp_react_ui_shell_routes', array() );

		if ( ! is_array( $routes ) ) {
			return array();
		}

		$site_host = wp_parse_url( home_url(), PHP_URL_HOST );

		$sanitized = array();
		foreach ( $routes as $route ) {
			if (
				is_array( $route ) &&
				! empty( $route['slug'] ) &&
				! empty( $route['entrypoint_url'] )
			) {
				$capability = sanitize_key( (string) ( $route['capability'] ?? 'manage_options' ) );

				if ( '' === $capability || ! current_user_can( $capability ) ) {
					continue;
				}

				$entrypoint_url = esc_url_raw( $route['entrypoint_url'] );
				$parsed_host    = wp_parse_url( $entrypoint_url, PHP_URL_HOST );

				// Block cross-origin entrypoints: only allow same-host or relative URLs.
				if ( is_string( $parsed_host ) && strtolower( $parsed_host ) !== strtolower( (string) $site_host ) ) {
					if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
						// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
						error_log( 'WP React UI: blocked cross-origin shell route entrypoint_url from host ' . $parsed_host );
					}
					continue;
				}

				$sanitized[] = array(
					'slug'           => sanitize_key( $route['slug'] ),
					'label'          => sanitize_text_field( $route['label'] ?? $route['slug'] ),
					'entrypoint_url' => $entrypoint_url,
				);
			}
		}

		return $sanitized;
	}

	/**
	 * Returns the license payload localized to the current user.
	 *
	 * Non-admin users receive only the site-level feature state needed to gate shell pages.
	 *
	 * @param bool $can_manage Whether the current user can manage plugin settings.
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, hasKey: bool, keyPrefix: ?string, serverConfigured: bool}
	 */
	private static function get_public_license_payload( bool $can_manage ): array {
		$payload = ( new \WpReactUi\License\LicenseManager() )->get_status_payload();

		if ( $can_manage ) {
			return $payload;
		}

		$payload['tier']             = null;
		$payload['expiresAt']        = null;
		$payload['hasKey']           = false;
		$payload['keyPrefix']        = null;
		$payload['serverConfigured'] = false;

		return $payload;
	}
}
