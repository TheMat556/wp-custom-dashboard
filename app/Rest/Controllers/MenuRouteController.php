<?php
/**
 * Menu REST controller.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Controllers;

use WpReactUi\Rest\Services\MenuReadService;

defined( 'ABSPATH' ) || exit;

/**
 * Handles transport concerns for the menu REST endpoint.
 */
final class MenuRouteController {

	private MenuReadService $service;

	public function __construct( ?MenuReadService $service = null ) {
		$this->service = $service ?? new MenuReadService();
	}

	public function can_read(): bool {
		return current_user_can( 'read' );
	}

	public function index() {
		return rest_ensure_response( $this->service->get_menu_payload() );
	}
}
