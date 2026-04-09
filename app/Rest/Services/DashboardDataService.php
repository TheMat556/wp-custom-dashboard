<?php
/**
 * Dashboard data service for REST transport extraction.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Services;

use WpReactUi\Dashboard\DashboardActionService;
use WpReactUi\Dashboard\DashboardCalendarService;
use WpReactUi\Dashboard\DashboardMetricsService;
use WpReactUi\Dashboard\DashboardPayloadService;
use WpReactUi\Dashboard\DashboardStatusService;

defined( 'ABSPATH' ) || exit;

/**
 * Coordinates dashboard REST reads through extracted dashboard services.
 */
final class DashboardDataService {
	private DashboardPayloadService $payload_service;

	public function __construct( ?DashboardPayloadService $payload_service = null ) {
		if ( $payload_service ) {
			$this->payload_service = $payload_service;
			return;
		}

		$metrics  = new DashboardMetricsService();
		$calendar = new DashboardCalendarService();
		$status   = new DashboardStatusService( $metrics, $calendar );
		$actions  = new DashboardActionService();

		$this->payload_service = new DashboardPayloadService(
			$metrics,
			$status,
			$actions,
			$calendar
		);
	}

	/**
	 * Returns the REST-ready dashboard payload.
	 *
	 * @return array
	 */
	public function get_dashboard_payload(): array {
		return $this->payload_service->get_dashboard_data();
	}
}
