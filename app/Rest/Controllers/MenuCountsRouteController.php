<?php
/**
 * Menu counts REST controller.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Controllers;

use WpReactUi\Rest\Services\MenuCountsService;

defined( 'ABSPATH' ) || exit;

/**
 * Handles transport concerns for the menu counts endpoint.
 */
final class MenuCountsRouteController {

	private MenuCountsService $service;

	public function __construct( ?MenuCountsService $service = null ) {
		$this->service = $service ?? new MenuCountsService();
	}

	public function can_read(): bool {
		return current_user_can( 'read' );
	}

	public function index() {
		return rest_ensure_response( $this->service->get_menu_counts_payload() );
	}
}
