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
		$menu_controller        = new MenuRouteController();
		$theme_controller       = new ThemeRouteController();
		$branding_controller    = new BrandingRouteController();
		$chat_controller       = new ChatConversationRouteController();
		$preferences_controller = new PreferencesRouteController();
		$menu_counts_controller = new MenuCountsRouteController();
		$dashboard_controller   = new DashboardRouteController();
		$activity_controller    = new ActivityRouteController();
		$license_controller     = new LicenseRouteController();
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
							'validate_callback' => function( $value ) {
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
						'validate_callback' => function( $value ) {
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
						'validate_callback' => function( $value ) {
							return RestValidator::validate_integer( $value, 0, PHP_INT_MAX );
						},
					),
					'afterMessageId'   => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => function( $value ) {
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
						'validate_callback' => function( $value ) {
							return RestValidator::validate_integer( $value, 0, PHP_INT_MAX );
						},
					),
					'message'          => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_textarea_field',
						'validate_callback' => function( $value ) {
							return RestValidator::validate_mb_string( $value, 1, ChatConfig::MAX_MESSAGE_LENGTH );
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
							'required' => false,
							'type'     => 'array',
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
						'validate_callback' => function( $value ) {
							return RestValidator::validate_integer( $value, 1, PHP_INT_MAX );
						},
					),
					'perPage' => array(
						'required'          => false,
						'type'              => 'integer',
						'default'           => 20,
						'sanitize_callback' => 'absint',
						'validate_callback' => function( $value ) {
							return RestValidator::validate_integer( $value, 1, 50 );
						},
					),
					'userId'  => array(
						'required'          => false,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => function( $value ) {
							return RestValidator::validate_optional_integer( $value, 0, PHP_INT_MAX );
						},
					),
					'action'  => array(
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => function( $value ) {
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
							'validate_callback' => function( $value ) {
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
						'validate_callback' => function( $value ) {
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
				'permission_callback' => '__return_true',
			)
		);
	}
}
