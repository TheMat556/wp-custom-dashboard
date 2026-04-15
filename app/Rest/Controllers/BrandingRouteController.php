<?php
/**
 * Branding settings REST controller.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Controllers;

use WP_REST_Request;
use WpReactUi\License\LicenseGate;
use WpReactUi\Rest\Services\BrandingSettingsService;

defined( 'ABSPATH' ) || exit;

/**
 * Handles transport concerns for the branding endpoints.
 */
final class BrandingRouteController {

	private BrandingSettingsService $service;

	public function __construct( ?BrandingSettingsService $service = null ) {
		$this->service = $service ?? new BrandingSettingsService();
	}

	public function can_manage_options(): bool {
		return current_user_can( 'manage_options' );
	}

	public function show() {
		if ( ! LicenseGate::has_valid_license() ) {
			return new \WP_Error(
				'license_feature_disabled',
				'Branding settings require an active license.',
				array(
					'status'  => 403,
					'feature' => 'branding',
				)
			);
		}

		return rest_ensure_response( $this->service->get_branding_payload() );
	}

	public function update( WP_REST_Request $request ) {
		if ( ! LicenseGate::has_valid_license() ) {
			return new \WP_Error(
				'license_feature_disabled',
				'Branding settings require an active license.',
				array(
					'status'  => 403,
					'feature' => 'branding',
				)
			);
		}

		$input  = array(
			'light_logo_id'           => $request->get_param( 'lightLogoId' ),
			'dark_logo_id'            => $request->get_param( 'darkLogoId' ),
			'long_logo_id'            => $request->get_param( 'longLogoId' ),
			'use_long_logo'           => $request->get_param( 'useLongLogo' ),
			'primary_color'           => $request->get_param( 'primaryColor' ),
			'font_preset'             => $request->get_param( 'fontPreset' ),
			'open_in_new_tab_patterns' => $request->get_param( 'openInNewTabPatterns' ),
		);
		$result = $this->service->save_branding_settings( $input );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( $result );
	}
}
