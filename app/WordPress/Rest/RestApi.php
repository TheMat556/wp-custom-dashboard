<?php
/**
 * REST API endpoints for WP React UI.
 *
 * @package WP_React_UI
 */

use WpReactUi\Rest\Controllers\ActivityRouteController;
use WpReactUi\Rest\Controllers\BrandingRouteController;
use WpReactUi\Rest\Controllers\DashboardRouteController;
use WpReactUi\Rest\Controllers\MenuCountsRouteController;
use WpReactUi\Rest\Controllers\MenuRouteController;
use WpReactUi\Rest\Controllers\PreferencesRouteController;
use WpReactUi\Rest\Controllers\ThemeRouteController;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/Rest/Services/MenuReadService.php';
require_once dirname( __DIR__, 2 ) . '/Rest/Services/ThemePreferenceService.php';
require_once dirname( __DIR__, 2 ) . '/Rest/Services/BrandingSettingsService.php';
require_once dirname( __DIR__, 2 ) . '/Rest/Services/ShellPreferencesService.php';
require_once dirname( __DIR__, 2 ) . '/Rest/Services/MenuCountsService.php';
require_once dirname( __DIR__, 2 ) . '/Rest/Services/DashboardDataService.php';
require_once dirname( __DIR__, 2 ) . '/Rest/Services/ActivityLogService.php';
require_once dirname( __DIR__, 2 ) . '/Rest/Controllers/MenuRouteController.php';
require_once dirname( __DIR__, 2 ) . '/Rest/Controllers/ThemeRouteController.php';
require_once dirname( __DIR__, 2 ) . '/Rest/Controllers/BrandingRouteController.php';
require_once dirname( __DIR__, 2 ) . '/Rest/Controllers/PreferencesRouteController.php';
require_once dirname( __DIR__, 2 ) . '/Rest/Controllers/MenuCountsRouteController.php';
require_once dirname( __DIR__, 2 ) . '/Rest/Controllers/DashboardRouteController.php';
require_once dirname( __DIR__, 2 ) . '/Rest/Controllers/ActivityRouteController.php';

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
		$preferences_controller = new PreferencesRouteController();
		$menu_counts_controller = new MenuCountsRouteController();
		$dashboard_controller   = new DashboardRouteController();
		$activity_controller    = new ActivityRouteController();

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
			)
		);
	}
}
