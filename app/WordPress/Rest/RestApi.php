<?php
/**
 * REST API endpoints for WP React UI.
 *
 * @package WP_React_UI
 */

use WpReactUi\Chat\ChatConfig;
use WpReactUi\Rest\Controllers\ActivityRouteController;
use WpReactUi\Rest\Controllers\BrandingRouteController;
use WpReactUi\Rest\Controllers\ChatConversationRouteController;
use WpReactUi\Rest\Controllers\DashboardRouteController;
use WpReactUi\Rest\Controllers\LicenseRouteController;
use WpReactUi\Rest\Controllers\LicenseWebhookRouteController;
use WpReactUi\Rest\Controllers\MenuCountsRouteController;
use WpReactUi\Rest\Controllers\MenuRouteController;
use WpReactUi\Rest\Controllers\PreferencesRouteController;
use WpReactUi\Rest\Controllers\ThemeRouteController;
use WpReactUi\Rest\RestValidator;

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
		$menu_controller            = new MenuRouteController();
		$theme_controller           = new ThemeRouteController();
		$branding_controller        = new BrandingRouteController();
		$chat_controller            = new ChatConversationRouteController();
		$preferences_controller     = new PreferencesRouteController();
		$menu_counts_controller     = new MenuCountsRouteController();
		$dashboard_controller       = new DashboardRouteController();
		$activity_controller        = new ActivityRouteController();
		$license_controller         = new LicenseRouteController();
		$license_webhook_controller = new LicenseWebhookRouteController();

		// Menu endpoint — enables client-side refresh without full page reload.
		// Initial menu data is inlined via wp_localize_script.
		// Permission: read (any authenticated dashboard user).
		register_rest_route(
			'wp-react-ui/v1',
			'/menu',
			array(
				'methods'             => 'GET',
				'callback'            => array( $menu_controller, 'index' ),
				'permission_callback' => array( $menu_controller, 'can_read' ),
			)
		);

		// Theme preference endpoints — GET reads, POST writes user meta.
		register_rest_route(
			'wp-react-ui/v1',
			'/theme',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $theme_controller, 'show' ),
					'permission_callback' => array( $theme_controller, 'is_authenticated' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $theme_controller, 'update' ),
					'permission_callback' => array( $theme_controller, 'is_authenticated' ),
					'args'                => array(
						'theme' => array(
							'required'          => true,
							'type'              => 'string',
							'enum'              => array( 'light', 'dark', 'system' ),
							'sanitize_callback' => 'sanitize_text_field',
							'validate_callback' => function ( $value ) {
								return RestValidator::validate_enum( $value, array( 'light', 'dark', 'system' ) );
							},
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
					'callback'            => array( $branding_controller, 'show' ),
					'permission_callback' => array( $branding_controller, 'can_manage_options' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $branding_controller, 'update' ),
					'permission_callback' => array( $branding_controller, 'can_manage_options' ),
				),
			)
		);

		register_rest_route(
			'wp-react-ui/v1',
			'/chat/bootstrap',
			array(
				'methods'             => 'POST',
				'callback'            => array( $chat_controller, 'bootstrap' ),
				'permission_callback' => array( $chat_controller, 'can_read' ),
				'args'                => array(
					'selectedThreadId' => array(
						'required'          => false,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $value ) {
							return RestValidator::validate_optional_integer( $value, 0, PHP_INT_MAX );
						},
					),
				),
			)
		);

		register_rest_route(
			'wp-react-ui/v1',
			'/chat/poll',
			array(
				'methods'             => 'POST',
				'callback'            => array( $chat_controller, 'poll' ),
				'permission_callback' => array( $chat_controller, 'can_read' ),
				'args'                => array(
					'selectedThreadId' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $value ) {
							return RestValidator::validate_integer( $value, 0, PHP_INT_MAX );
						},
					),
					'afterMessageId'   => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $value ) {
							return RestValidator::validate_integer( $value, 0, PHP_INT_MAX );
						},
					),
				),
			)
		);

		register_rest_route(
			'wp-react-ui/v1',
			'/chat/send',
			array(
				'methods'             => 'POST',
				'callback'            => array( $chat_controller, 'send' ),
				'permission_callback' => array( $chat_controller, 'can_read' ),
				'args'                => array(
					'selectedThreadId' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $value ) {
							return RestValidator::validate_integer( $value, 0, PHP_INT_MAX );
						},
					),
					'message'          => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_textarea_field',
						'validate_callback' => function ( $value ) {
							return RestValidator::validate_mb_string( $value, 1, ChatConfig::MAX_MESSAGE_LENGTH );
						},
					),
				),
			)
		);

		register_rest_route(
			'wp-react-ui/v1',
			'/chat/archive',
			array(
				'methods'             => 'POST',
				'callback'            => array( $chat_controller, 'archive' ),
				'permission_callback' => array( $chat_controller, 'can_manage_options' ),
				'args'                => array(
					'selectedThreadId' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $value ) {
							return RestValidator::validate_integer( $value, 1, PHP_INT_MAX );
						},
					),
				),
			)
		);

		register_rest_route(
			'wp-react-ui/v1',
			'/chat/delete',
			array(
				'methods'             => 'POST',
				'callback'            => array( $chat_controller, 'delete_thread' ),
				'permission_callback' => array( $chat_controller, 'can_manage_options' ),
				'args'                => array(
					'selectedThreadId' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $value ) {
							return RestValidator::validate_integer( $value, 1, PHP_INT_MAX );
						},
					),
				),
			)
		);

		register_rest_route(
			'wp-react-ui/v1',
			'/chat/unarchive',
			array(
				'methods'             => 'POST',
				'callback'            => array( $chat_controller, 'unarchive' ),
				'permission_callback' => array( $chat_controller, 'can_manage_options' ),
				'args'                => array(
					'selectedThreadId' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $value ) {
							return RestValidator::validate_integer( $value, 1, PHP_INT_MAX );
						},
					),
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
					'callback'            => array( $preferences_controller, 'show' ),
					'permission_callback' => array( $preferences_controller, 'is_authenticated' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $preferences_controller, 'update' ),
					'permission_callback' => array( $preferences_controller, 'is_authenticated' ),
					'args'                => array(
						'density'              => array(
							'required'          => false,
							'type'              => 'string',
							'sanitize_callback' => 'sanitize_text_field',
							'validate_callback' => function ( $value ) {
								return RestValidator::validate_optional_string( $value, 32 );
							},
						),
						'themePreset'          => array(
							'required'          => false,
							'type'              => 'string',
							'sanitize_callback' => 'sanitize_text_field',
							'validate_callback' => function ( $value ) {
								return RestValidator::validate_optional_string( $value, 64 );
							},
						),
						'customPresetColor'    => array(
							'required'          => false,
							'type'              => 'string',
							'sanitize_callback' => 'sanitize_text_field',
							'validate_callback' => function ( $value ) {
								return RestValidator::validate_optional_string( $value, 32 );
							},
						),
						'sidebarCollapsed'     => array(
							'required'          => false,
							'type'              => 'boolean',
							'validate_callback' => function ( $value ) {
								return RestValidator::validate_boolean( $value );
							},
						),
						'highContrast'         => array(
							'required'          => false,
							'type'              => 'boolean',
							'validate_callback' => function ( $value ) {
								return RestValidator::validate_boolean( $value );
							},
						),
						'favorites'            => array(
							'required' => false,
							'type'     => 'array',
							'items'    => array( 'type' => 'string' ),
						),
						'recentPages'          => array(
							'required'          => false,
							'type'              => 'array',
							'validate_callback' => function ( $value ) {
								if ( ! is_array( $value ) ) {
									return new \WP_Error( 'invalid_recent_pages', 'recentPages must be an array.', array( 'status' => 400 ) );
								}
								if ( count( $value ) > 20 ) {
									return new \WP_Error( 'too_many_pages', 'recentPages may not exceed 20 items.', array( 'status' => 400 ) );
								}
								foreach ( $value as $item ) {
									if ( ! isset( $item['pageUrl'] ) || ! is_string( $item['pageUrl'] ) ) {
										return new \WP_Error( 'invalid_page', 'Each page must have a string pageUrl.', array( 'status' => 400 ) );
									}
									if ( ! isset( $item['title'] ) || ! is_string( $item['title'] ) ) {
										return new \WP_Error( 'invalid_page', 'Each page must have a string title.', array( 'status' => 400 ) );
									}
									if ( isset( $item['visitedAt'] ) && ! is_numeric( $item['visitedAt'] ) ) {
										return new \WP_Error( 'invalid_page', 'visitedAt must be a number.', array( 'status' => 400 ) );
									}
								}
								return true;
							},
							'sanitize_callback' => function ( $value ) {
								return array_map(
									function ( $item ) {
										return array_intersect_key( $item, array( 'pageUrl' => 1, 'title' => 1, 'visitedAt' => 1 ) );
									},
									$value
								);
							},
						),
						'dashboardWidgetOrder' => array(
							'required' => false,
							'type'     => 'array',
							'items'    => array( 'type' => 'string' ),
						),
						'hiddenWidgets'        => array(
							'required' => false,
							'type'     => 'array',
							'items'    => array( 'type' => 'string' ),
						),
					),
				),
			)
		);

		// Menu counts endpoint — lightweight badge count refresh.
		register_rest_route(
			'wp-react-ui/v1',
			'/menu-counts',
			array(
				'methods'             => 'GET',
				'callback'            => array( $menu_counts_controller, 'index' ),
				'permission_callback' => array( $menu_counts_controller, 'can_read' ),
			)
		);

		// Dashboard data endpoint — aggregated stats for the React dashboard.
		register_rest_route(
			'wp-react-ui/v1',
			'/dashboard',
			array(
				'methods'             => 'GET',
				'callback'            => array( $dashboard_controller, 'show' ),
				'permission_callback' => array( $dashboard_controller, 'can_read' ),
			)
		);

		// Activity log endpoint — paginated audit trail.
		register_rest_route(
			'wp-react-ui/v1',
			'/activity',
			array(
				'methods'             => 'GET',
				'callback'            => array( $activity_controller, 'index' ),
				'permission_callback' => array( $activity_controller, 'can_manage_options' ),
				'args'                => array(
					'page'    => array(
						'required'          => false,
						'type'              => 'integer',
						'default'           => 1,
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $value ) {
							return RestValidator::validate_integer( $value, 1, PHP_INT_MAX );
						},
					),
					'perPage' => array(
						'required'          => false,
						'type'              => 'integer',
						'default'           => 20,
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $value ) {
							return RestValidator::validate_integer( $value, 1, 50 );
						},
					),
					'userId'  => array(
						'required'          => false,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $value ) {
							return RestValidator::validate_optional_integer( $value, 0, PHP_INT_MAX );
						},
					),
					'action'  => array(
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => function ( $value ) {
							return RestValidator::validate_optional_string( $value, 255 );
						},
					),
				),
			)
		);

		// License status and lifecycle endpoints — restricted to administrators.
		register_rest_route(
			'wp-react-ui/v1',
			'/license',
			array(
				'methods'             => 'GET',
				'callback'            => array( $license_controller, 'show' ),
				'permission_callback' => array( $license_controller, 'can_manage_options' ),
			)
		);

		register_rest_route(
			'wp-react-ui/v1',
			'/license/settings',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $license_controller, 'show_settings' ),
					'permission_callback' => array( $license_controller, 'can_manage_options' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $license_controller, 'update_settings' ),
					'permission_callback' => array( $license_controller, 'can_manage_options' ),
					'args'                => array(
						'serverUrl' => array(
							'required'          => false,
							'type'              => 'string',
							'format'            => 'uri',
							'sanitize_callback' => 'esc_url_raw',
							'validate_callback' => function ( $value ) {
								return RestValidator::validate_optional_url( $value );
							},
						),
					),
				),
			)
		);

		register_rest_route(
			'wp-react-ui/v1',
			'/license/activate',
			array(
				'methods'             => 'POST',
				'callback'            => array( $license_controller, 'activate' ),
				'permission_callback' => array( $license_controller, 'can_manage_options' ),
				'args'                => array(
					'licenseKey' => array(
						'required'          => true,
						'type'              => 'string',
						'minLength'         => 8,
						'maxLength'         => 512,
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => function ( $value ) {
							return RestValidator::validate_license_key( $value );
						},
					),
				),
			)
		);

		register_rest_route(
			'wp-react-ui/v1',
			'/license/deactivate',
			array(
				'methods'             => 'POST',
				'callback'            => array( $license_controller, 'deactivate' ),
				'permission_callback' => array( $license_controller, 'can_manage_options' ),
			)
		);

		register_rest_route(
			'wp-react-ui/v1',
			'/license-webhook',
			array(
				'methods'             => 'POST',
				'callback'            => array( $license_webhook_controller, 'handle' ),
				'permission_callback' => array( __CLASS__, 'permission_webhook_request' ),
			)
		);
	}

	/**
	 * Validates the incoming license-webhook request via a shared secret.
	 *
	 * Reads the secret from the X-Webhook-Secret header and compares it
	 * against the value defined in WP_CUSTOM_DASHBOARD_WEBHOOK_SECRET or
	 * stored in the wp_custom_dashboard_webhook_secret option.
	 *
	 * @param WP_REST_Request $request The incoming REST request.
	 * @return bool|WP_Error True on success, WP_Error on failure.
	 */
	private static function permission_webhook_request( WP_REST_Request $request ): bool|WP_Error {
		$provided = (string) $request->get_header( 'x-webhook-secret' );
		$expected = defined( 'WP_CUSTOM_DASHBOARD_WEBHOOK_SECRET' )
			? WP_CUSTOM_DASHBOARD_WEBHOOK_SECRET
			: get_option( 'wp_custom_dashboard_webhook_secret', '' );

		if ( '' === $expected ) {
			error_log( 'WP Custom Dashboard: webhook secret is not configured.' ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			return new WP_Error(
				'rest_forbidden',
				__( 'Webhook secret not configured.', 'wp-custom-dashboard' ),
				array( 'status' => 403 )
			);
		}

		if ( hash_equals( $expected, $provided ) ) {
			return true;
		}

		return new WP_Error(
			'rest_forbidden',
			__( 'Invalid webhook secret.', 'wp-custom-dashboard' ),
			array( 'status' => 403 )
		);
	}
}
