<?php
/**
 * Dashboard REST controller.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Controllers;

use WpReactUi\Rest\Services\DashboardDataService;

defined( 'ABSPATH' ) || exit;

/**
 * Handles transport concerns for the dashboard endpoint.
 */
final class DashboardRouteController {

	private DashboardDataService $service;

	public function __construct( ?DashboardDataService $service = null ) {
		$this->service = $service ?? new DashboardDataService();
	}

	public function can_read(): bool {
		return current_user_can( 'read' );
	}

	public function show() {
		return rest_ensure_response( $this->service->get_dashboard_payload() );
	}
}
