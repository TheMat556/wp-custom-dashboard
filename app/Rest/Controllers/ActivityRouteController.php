<?php
/**
 * Activity REST controller.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Controllers;

use WP_REST_Request;
use WpReactUi\Rest\Services\ActivityLogService;

defined( 'ABSPATH' ) || exit;

/**
 * Handles transport concerns for the activity endpoint.
 */
final class ActivityRouteController {

	private ActivityLogService $service;

	public function __construct( ?ActivityLogService $service = null ) {
		$this->service = $service ?? new ActivityLogService();
	}

	public function can_manage_options(): bool {
		return current_user_can( 'manage_options' );
	}

	public function index( WP_REST_Request $request ) {
		$page     = max( 1, (int) $request->get_param( 'page' ) );
		$per_page = min( 50, max( 1, (int) ( $request->get_param( 'perPage' ) ?: 20 ) ) );
		$user_id  = $request->get_param( 'userId' ) ? (int) $request->get_param( 'userId' ) : null;
		$action   = $request->get_param( 'action' ) ? sanitize_text_field( $request->get_param( 'action' ) ) : null;

		return rest_ensure_response( $this->service->get_activity_payload( $page, $per_page, $user_id, $action ) );
	}
}
