<?php
/**
 * Controller behavior tests for additive REST extraction.
 */

use WpReactUi\Rest\Controllers\BrandingRouteController;
use WpReactUi\Rest\Controllers\ChatSettingsRouteController;
use WpReactUi\Rest\Controllers\DashboardRouteController;
use WpReactUi\Rest\Controllers\PreferencesRouteController;
use WpReactUi\Rest\Controllers\ThemeRouteController;
use WpReactUi\License\LicenseCache;
use WpReactUi\License\LicenseSettingsRepository;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class RestControllerBehaviorTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
		$this->seed_active_license( array( 'dashboard', 'white_label' ) );
	}

	public function test_theme_controller_returns_default_light_theme(): void {
		$controller = new ThemeRouteController();

		$response = $controller->show();

		$this->assertSame( array( 'theme' => 'light' ), $response );
	}

	public function test_theme_controller_updates_user_meta_and_normalizes_value(): void {
		$controller = new ThemeRouteController();
		$request    = new WP_REST_Request( array( 'theme' => 'anything-else' ) );

		$response = $controller->update( $request );

		$this->assertSame( array( 'theme' => 'light' ), $response );
		$this->assertSame( 'light', get_user_meta( get_current_user_id(), 'wp_react_ui_theme', true ) );
	}

	public function test_preferences_controller_returns_invalid_data_error_for_non_array_json(): void {
		$controller = new PreferencesRouteController();
		$request    = new WP_REST_Request( array(), null );

		$response = $controller->update( $request );

		$this->assertTrue( is_wp_error( $response ) );
		$this->assertSame( 'invalid_data', $response->get_error_code() );
		$this->assertSame( array( 'status' => 400 ), $response->get_error_data() );
	}

	public function test_preferences_controller_merges_and_saves_known_keys(): void {
		$controller = new PreferencesRouteController();
		$request    = new WP_REST_Request(
			array(),
			array(
				'density'           => ' compact ',
				'highContrast'      => true,
				'favourites'        => array( 'ignored' ),
				'favorites'         => array( 'index.php' ),
				'unknownPreference' => 'ignored',
			)
		);

		$response = $controller->update( $request );

		$this->assertSame(
			array(
				'preferences' => array(
					'density'      => 'compact',
					'highContrast' => true,
					'favorites'    => array( 'index.php' ),
				),
			),
			$response
		);
	}

	public function test_preferences_controller_strips_html_from_array_values(): void {
		$controller = new PreferencesRouteController();
		$request    = new WP_REST_Request(
			array(),
			array(
				'favorites'         => array( '<script>alert(1)</script>', 'plugins.php' ),
				'hiddenWidgets'     => array( '<img src=x onerror=alert(1)>', 'dashboard_primary' ),
				'recentPages'       => array(
					array(
						'pageUrl'   => 'http://localhost/wp-admin/plugins.php',
						'title'     => '<b>Plugins</b>',
						'visitedAt' => 1,
					),
				),
			)
		);

		$response = $controller->update( $request );

		$prefs = $response['preferences'];
		$this->assertSame( array( '', 'plugins.php' ), $prefs['favorites'] );
		$this->assertSame( array( '', 'dashboard_primary' ), $prefs['hiddenWidgets'] );
		$this->assertSame( 'Plugins', $prefs['recentPages'][0]['title'] );
	}

	public function test_branding_controller_returns_existing_rest_shape(): void {
		$controller = new BrandingRouteController();

		$response = $controller->show();

		$this->assertSame(
			array(
				'lightLogoId',
				'lightLogoUrl',
				'darkLogoId',
				'darkLogoUrl',
				'longLogoId',
				'longLogoUrl',
				'useLongLogo',
				'primaryColor',
				'fontPreset',
				'openInNewTabPatterns',
			),
			array_values( array_keys( $response ) )
		);
	}

	public function test_chat_settings_controller_returns_existing_rest_shape(): void {
		$controller = new ChatSettingsRouteController();

		$response = $controller->show();

		$this->assertSame(
			array(
				'provider',
				'effectiveProvider',
				'chatwootBaseUrl',
				'chatwootWebsiteToken',
				'tawkPropertyId',
				'tawkWidgetId',
			),
			array_values( array_keys( $response ) )
		);
	}

	public function test_dashboard_controller_returns_existing_rest_shape(): void {
		$controller = new DashboardRouteController();

		$response = $controller->show();

		$this->assertSame(
			array(
				'atAGlance',
				'siteHealth',
				'pendingUpdates',
				'visitorTrend',
				'countryStats',
				'siteSpeed',
				'pagesOverview',
				'actionItems',
				'seoOverview',
				'seoBasics',
				'legalCompliance',
				'businessFunctions',
				'onboardingChecklist',
				'siteReadinessScore',
				'calendarPreview',
			),
			array_values( array_keys( $response ) )
		);
	}

	public function test_license_settings_controller_returns_existing_rest_shape(): void {
		$controller = new \WpReactUi\Rest\Controllers\LicenseRouteController();

		$response = $controller->show_settings();

		$this->assertSame(
			array(
				'serverUrl',
				'serverConfigured',
				'storedLicenseKey',
			),
			array_values( array_keys( $response ) )
		);
	}

	public function test_license_settings_controller_rejects_non_string_server_url(): void {
		$controller = new \WpReactUi\Rest\Controllers\LicenseRouteController();
		$request    = new WP_REST_Request(
			array(
				'serverUrl' => array( 'https://licenses.example.test' ),
			)
		);

		$response = $controller->update_settings( $request );

		$this->assertTrue( is_wp_error( $response ) );
		$this->assertSame( 'invalid_license_server_url', $response->get_error_code() );
	}

	public function test_license_settings_controller_rejects_malformed_server_url(): void {
		$controller = new \WpReactUi\Rest\Controllers\LicenseRouteController();
		$request    = new WP_REST_Request(
			array(
				'serverUrl' => 'bad-url',
			)
		);

		$response = $controller->update_settings( $request );

		$this->assertTrue( is_wp_error( $response ) );
		$this->assertSame( 'invalid_license_server_url', $response->get_error_code() );
	}

	public function test_license_settings_controller_rejects_insecure_production_server_url(): void {
		$controller = new \WpReactUi\Rest\Controllers\LicenseRouteController();
		$request    = new WP_REST_Request(
			array(
				'serverUrl' => 'http://licenses.example.com',
			)
		);

		$response = $controller->update_settings( $request );

		$this->assertTrue( is_wp_error( $response ) );
		$this->assertSame( 'invalid_license_server_url', $response->get_error_code() );
	}

	public function test_branding_controller_returns_existing_rest_shape_without_white_label_feature(): void {
		$this->seed_active_license( array( 'dashboard' ) );
		$controller = new BrandingRouteController();

		$response = $controller->show();

		$this->assertSame(
			array(
				'lightLogoId',
				'lightLogoUrl',
				'darkLogoId',
				'darkLogoUrl',
				'longLogoId',
				'longLogoUrl',
				'useLongLogo',
				'primaryColor',
				'fontPreset',
				'openInNewTabPatterns',
			),
			array_values( array_keys( $response ) )
		);
	}

	public function test_branding_controller_requires_a_valid_license(): void {
		( new LicenseSettingsRepository() )->clear_license_key();
		( new LicenseCache() )->clear();
		$controller = new BrandingRouteController();

		$response = $controller->show();

		$this->assertTrue( is_wp_error( $response ) );
		$this->assertSame( 'license_feature_disabled', $response->get_error_code() );
	}

	public function test_dashboard_controller_returns_license_error_without_dashboard_feature(): void {
		$this->seed_active_license( array( 'white_label' ) );
		$controller = new DashboardRouteController();

		$response = $controller->show();

		$this->assertTrue( is_wp_error( $response ) );
		$this->assertSame( 'license_feature_disabled', $response->get_error_code() );
	}

	/**
	 * Seeds an active cached license for protected controller tests.
	 *
	 * @param array<int, string> $features Allowed features.
	 */
	private function seed_active_license( array $features ): void {
		$settings = new LicenseSettingsRepository();
		$cache    = new LicenseCache();

		$settings->save_license_key( 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789' );
		$cache->set(
			array(
				'status'             => LicenseCache::STATUS_ACTIVE,
				'tier'               => 'agency',
				'expiresAt'          => gmdate( 'Y-m-d H:i:s', time() + DAY_IN_SECONDS ),
				'features'           => $features,
				'graceDaysRemaining' => 0,
				'keyPrefix'          => $settings->get_key_prefix(),
				'lastValidatedAt'    => gmdate( 'Y-m-d H:i:s' ),
			)
		);
	}
}
