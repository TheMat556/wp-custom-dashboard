<?php
/**
 * License settings REST controller.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Controllers;

use WP_REST_Request;
use WpReactUi\Rest\RateLimiter;
use WpReactUi\Rest\Services\LicenseSettingsService;

defined( 'ABSPATH' ) || exit;

final class LicenseRouteController {
	private LicenseSettingsService $service;

	public function __construct( ?LicenseSettingsService $service = null ) {
		$this->service = $service ?? new LicenseSettingsService();
	}

	public function can_manage_options(): bool {
		return current_user_can( 'manage_options' );
	}

	public function show( WP_REST_Request $request ) {
		$force = (bool) $request->get_param( 'force' );
		return rest_ensure_response( $this->service->get_license_payload( $force ) );
	}

	public function show_settings() {
		return rest_ensure_response( $this->service->get_license_server_settings_payload() );
	}

	public function activate( WP_REST_Request $request ) {
		$rate_check = RateLimiter::enforce( 'license_activate', RateLimiter::LIMIT_LICENSE_ACTIVATE );
		if ( is_wp_error( $rate_check ) ) {
			return $rate_check;
		}

		$result = $this->service->activate_license( (string) $request->get_param( 'licenseKey' ) );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( $result );
	}

	public function deactivate() {
		$result = $this->service->deactivate_license();

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( $result );
	}

	public function update_settings( WP_REST_Request $request ) {
		$server_url = $request->get_param( 'serverUrl' );

		if ( null !== $server_url && ! is_string( $server_url ) ) {
			return new \WP_Error(
				'invalid_license_server_url',
				'License server URL must be a valid absolute URL.',
				array( 'status' => 400 )
			);
		}

		$result = $this->service->save_license_server_settings( $server_url );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( $result );
	}
}
