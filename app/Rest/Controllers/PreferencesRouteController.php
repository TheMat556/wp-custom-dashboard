<?php
/**
 * Shell preferences REST controller.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Controllers;

use WP_Error;
use WP_REST_Request;
use WpReactUi\Rest\RateLimiter;
use WpReactUi\Rest\Services\ShellPreferencesService;

defined( 'ABSPATH' ) || exit;

/**
 * Handles transport concerns for shell preferences endpoints.
 */
final class PreferencesRouteController {

	private ShellPreferencesService $service;

	public function __construct( ?ShellPreferencesService $service = null ) {
		$this->service = $service ?? new ShellPreferencesService();
	}

	public function is_authenticated(): bool {
		return is_user_logged_in();
	}

	public function show() {
		return rest_ensure_response( $this->service->get_preferences_payload() );
	}

	public function update( WP_REST_Request $request ) {
		$rate_check = RateLimiter::enforce( 'preferences_save', RateLimiter::LIMIT_PREFERENCES_SAVE );
		if ( is_wp_error( $rate_check ) ) {
			return $rate_check;
		}

		$input = $request->get_json_params();

		if ( ! is_array( $input ) ) {
			return new WP_Error( 'invalid_data', 'Expected JSON object', array( 'status' => 400 ) );
		}

		return rest_ensure_response( $this->service->save_preferences( $input ) );
	}
}
