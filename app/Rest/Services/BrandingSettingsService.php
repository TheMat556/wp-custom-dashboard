<?php
/**
 * Branding settings service for REST transport extraction.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Services;

use WpReactUi\Branding\BrandingMediaLibraryAdapter;
use WpReactUi\Branding\BrandingPayloadService;
use WpReactUi\Branding\BrandingSanitizer;
use WpReactUi\Branding\BrandingSettingsManager;
use WpReactUi\Branding\BrandingSettingsRepository;

defined( 'ABSPATH' ) || exit;

/**
 * Coordinates branding REST behavior through extracted branding services.
 */
final class BrandingSettingsService {
	private BrandingPayloadService $payload_service;
	private BrandingSettingsManager $settings_manager;

	public function __construct(
		?BrandingPayloadService $payload_service = null,
		?BrandingSettingsManager $settings_manager = null
	) {
		if ( $payload_service && $settings_manager ) {
			$this->payload_service  = $payload_service;
			$this->settings_manager = $settings_manager;
			return;
		}

		$repository    = new BrandingSettingsRepository();
		$media_library = new BrandingMediaLibraryAdapter();
		$sanitizer     = new BrandingSanitizer( $media_library );

		$this->payload_service  = $payload_service ?? new BrandingPayloadService( $repository, $media_library, $sanitizer );
		$this->settings_manager = $settings_manager ?? new BrandingSettingsManager( $repository, $sanitizer );
	}

	/**
	 * Returns the branding REST payload.
	 *
	 * @return array
	 */
	public function get_branding_payload(): array {
		return $this->payload_service->get_rest_data();
	}

	/**
	 * Saves branding settings and returns the refreshed REST payload.
	 *
	 * @param array $input REST-normalized branding input.
	 * @return array|\WP_Error
	 */
	public function save_branding_settings( array $input ) {
		$result = $this->settings_manager->save_from_rest( $input );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return $this->get_branding_payload();
	}
}
