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

		// User preferences endpoint — syncs shell preferences across devices.
		// Stores as a single JSON blob in user meta.
		register_rest_route(
			'wp-react-ui/v1',
			'/preferences',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => function () {
						$raw = get_user_meta( get_current_user_id(), 'wp_react_ui_preferences', true );
						$prefs = is_array( $raw ) ? $raw : array();
						return rest_ensure_response( array( 'preferences' => $prefs ) );
					},
					'permission_callback' => fn() => is_user_logged_in(),
				),
				array(
					'methods'             => 'POST',
					'callback'            => function ( WP_REST_Request $request ) {
						$input = $request->get_json_params();
						if ( ! is_array( $input ) ) {
							return new WP_Error( 'invalid_data', 'Expected JSON object', array( 'status' => 400 ) );
						}

						$user_id = get_current_user_id();
						$existing = get_user_meta( $user_id, 'wp_react_ui_preferences', true );
						$prefs = is_array( $existing ) ? $existing : array();

						// Sanitize known keys and merge.
						$allowed_string_keys  = array( 'density', 'themePreset', 'customPresetColor' );
						$allowed_bool_keys    = array( 'sidebarCollapsed', 'highContrast' );
						$allowed_array_keys   = array( 'favorites', 'recentPages', 'dashboardWidgetOrder', 'hiddenWidgets' );

						foreach ( $allowed_string_keys as $key ) {
							if ( isset( $input[ $key ] ) ) {
								$prefs[ $key ] = sanitize_text_field( $input[ $key ] );
							}
						}

						foreach ( $allowed_bool_keys as $key ) {
							if ( isset( $input[ $key ] ) ) {
								$prefs[ $key ] = (bool) $input[ $key ];
							}
						}

						foreach ( $allowed_array_keys as $key ) {
							if ( isset( $input[ $key ] ) && is_array( $input[ $key ] ) ) {
								$prefs[ $key ] = $input[ $key ];
							}
						}

						update_user_meta( $user_id, 'wp_react_ui_preferences', $prefs );
						return rest_ensure_response( array( 'preferences' => $prefs ) );
					},
					'permission_callback' => fn() => is_user_logged_in(),
				),
			)
		);

		// Menu counts endpoint — lightweight badge count refresh.
		register_rest_route(
			'wp-react-ui/v1',
			'/menu-counts',
			array(
				'methods'             => 'GET',
				'callback'            => function () {
					$counts = array();

					// Comment counts.
					$comments = wp_count_comments();
					$pending  = isset( $comments->moderated ) ? (int) $comments->moderated : 0;
					if ( $pending > 0 ) {
						$counts['edit-comments.php'] = $pending;
					}

					// Plugin/theme/core update counts.
					$update_data = wp_get_update_data();
					$total_updates = isset( $update_data['counts']['total'] ) ? (int) $update_data['counts']['total'] : 0;
					if ( $total_updates > 0 ) {
						$counts['update-core.php'] = $total_updates;
					}

					$plugin_updates = isset( $update_data['counts']['plugins'] ) ? (int) $update_data['counts']['plugins'] : 0;
					if ( $plugin_updates > 0 ) {
						$counts['plugins.php'] = $plugin_updates;
					}

					$theme_updates = isset( $update_data['counts']['themes'] ) ? (int) $update_data['counts']['themes'] : 0;
					if ( $theme_updates > 0 ) {
						$counts['themes.php'] = $theme_updates;
					}

					return rest_ensure_response( array( 'counts' => $counts ) );
				},
				'permission_callback' => fn() => current_user_can( 'read' ),
			)
		);

		// Dashboard data endpoint — aggregated stats for the React dashboard.
		register_rest_route(
			'wp-react-ui/v1',
			'/dashboard',
			array(
				'methods'             => 'GET',
				'callback'            => function () {
					return rest_ensure_response( WP_React_UI_Dashboard_Data::get_dashboard_data() );
				},
				'permission_callback' => fn() => current_user_can( 'read' ),
			)
		);

		// Activity log endpoint — paginated audit trail.
		register_rest_route(
			'wp-react-ui/v1',
			'/activity',
			array(
				'methods'             => 'GET',
				'callback'            => function ( WP_REST_Request $request ) {
					$page     = max( 1, (int) $request->get_param( 'page' ) );
					$per_page = min( 50, max( 1, (int) ( $request->get_param( 'perPage' ) ?: 20 ) ) );
					$user_id  = $request->get_param( 'userId' ) ? (int) $request->get_param( 'userId' ) : null;
					$action   = $request->get_param( 'action' ) ? sanitize_text_field( $request->get_param( 'action' ) ) : null;

					$all = get_option( 'wp_react_ui_activity_log', array() );
					if ( ! is_array( $all ) ) {
						$all = array();
					}

					// Filter.
					if ( $user_id ) {
						$all = array_filter( $all, fn( $e ) => isset( $e['user_id'] ) && (int) $e['user_id'] === $user_id );
					}
					if ( $action ) {
						$all = array_filter( $all, fn( $e ) => isset( $e['action'] ) && $e['action'] === $action );
					}

					$all   = array_values( $all );
					$total = count( $all );
					$offset = ( $page - 1 ) * $per_page;
					$entries = array_slice( $all, $offset, $per_page );

					return rest_ensure_response( array(
						'entries' => $entries,
						'total'   => $total,
						'page'    => $page,
						'perPage' => $per_page,
					) );
				},
				'permission_callback' => fn() => current_user_can( 'manage_options' ),
			)
		);
	}
}
