<?php
/**
 * Dashboard compatibility facade for the React shell.
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;


/**
 * Preserves the legacy static dashboard entrypoints while delegating internals.
 */
class WP_React_UI_Dashboard_Data {

	/**
	 * Registers dashboard page-view tracking hooks.
	 *
	 * @return void
	 */
	public static function init(): void {
		self::tracking_service()->register();
	}

	/**
	 * Tracks a frontend page view.
	 *
	 * @return void
	 */
	public static function track_page_view(): void {
		self::tracking_service()->track_page_view();
	}

	/**
	 * Returns the aggregated dashboard payload.
	 *
	 * @return array
	 */
	public static function get_dashboard_data(): array {
		return self::payload_service()->get_dashboard_data();
	}

	/**
	 * Returns the extracted dashboard tracking service.
	 *
	 * @return \WpReactUi\Dashboard\DashboardTrackingService
	 */
	private static function tracking_service(): \WpReactUi\Dashboard\DashboardTrackingService {
		return new \WpReactUi\Dashboard\DashboardTrackingService();
	}

	/**
	 * Returns the extracted dashboard payload service.
	 *
	 * @return \WpReactUi\Dashboard\DashboardPayloadService
	 */
	private static function payload_service(): \WpReactUi\Dashboard\DashboardPayloadService {
		$metrics  = new \WpReactUi\Dashboard\DashboardMetricsService();
		$calendar = new \WpReactUi\Dashboard\DashboardCalendarService();
		$status   = new \WpReactUi\Dashboard\DashboardStatusService( $metrics, $calendar );
		$actions  = new \WpReactUi\Dashboard\DashboardActionService();

		return new \WpReactUi\Dashboard\DashboardPayloadService(
			$metrics,
			$status,
			$actions,
			$calendar
		);
	}
}
