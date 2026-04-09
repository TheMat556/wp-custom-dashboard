<?php
/**
 * Tests for extracted dashboard payload compatibility.
 */

use WpReactUi\Dashboard\DashboardActionService;
use WpReactUi\Dashboard\DashboardCalendarService;
use WpReactUi\Dashboard\DashboardMetricsService;
use WpReactUi\Dashboard\DashboardPayloadService;
use WpReactUi\Dashboard\DashboardStatusService;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class DashboardDataTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
	}

	public function test_extracted_dashboard_payload_service_matches_legacy_facade(): void {
		global $wp_test_state;

		$wp_test_state['transients']['wp_react_ui_site_speed'] = array(
			'ms'        => 320,
			'status'    => 'good',
			'httpCode'  => 200,
			'checkedAt' => 1234567890,
			'history'   => array(
				array(
					'ts' => 1234567890,
					'ok' => true,
					'ms' => 320,
				),
			),
		);
		$wp_test_state['options']['wp_react_ui_speed_history'] = array(
			array(
				'ts' => 1234567890,
				'ok' => true,
				'ms' => 320,
			),
		);

		$metrics  = new DashboardMetricsService();
		$calendar = new DashboardCalendarService();
		$status   = new DashboardStatusService( $metrics, $calendar );
		$actions  = new DashboardActionService();
		$service  = new DashboardPayloadService( $metrics, $status, $actions, $calendar );

		$this->assertSame(
			WP_React_UI_Dashboard_Data::get_dashboard_data(),
			$service->get_dashboard_data()
		);
	}
}
