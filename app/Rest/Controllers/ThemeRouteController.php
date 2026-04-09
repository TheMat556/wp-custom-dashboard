<?php
/**
 * Theme preference REST controller.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Controllers;

use WP_REST_Request;
use WpReactUi\Rest\Services\ThemePreferenceService;

defined( 'ABSPATH' ) || exit;

/**
 * Handles transport concerns for the theme endpoints.
 */
final class ThemeRouteController {

	private ThemePreferenceService $service;

	public function __construct( ?ThemePreferenceService $service = null ) {
		$this->service = $service ?? new ThemePreferenceService();
	}

	public function is_authenticated(): bool {
		return is_user_logged_in();
	}

	public function show() {
		return rest_ensure_response( $this->service->get_theme_payload() );
	}

	public function update( WP_REST_Request $request ) {
		return rest_ensure_response( $this->service->save_theme( $request->get_param( 'theme' ) ) );
	}
}
