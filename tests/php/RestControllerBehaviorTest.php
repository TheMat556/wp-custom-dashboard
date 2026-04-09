<?php
/**
 * Controller behavior tests for additive REST extraction.
 */

use WpReactUi\Rest\Controllers\BrandingRouteController;
use WpReactUi\Rest\Controllers\DashboardRouteController;
use WpReactUi\Rest\Controllers\PreferencesRouteController;
use WpReactUi\Rest\Controllers\ThemeRouteController;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class RestControllerBehaviorTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
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
}
