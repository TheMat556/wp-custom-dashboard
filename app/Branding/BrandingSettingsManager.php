<?php
/**
 * Branding settings manager for WP React UI.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Branding;

defined( 'ABSPATH' ) || exit;

/**
 * Coordinates branding setting writes.
 */
final class BrandingSettingsManager {
	public function __construct(
		private BrandingSettingsRepository $repository,
		private BrandingSanitizer $sanitizer
	) {}

	/**
	 * Saves branding settings from REST-normalized input.
	 *
	 * @param array $input Branding input.
	 * @return true|\WP_Error
	 */
	public function save_from_rest( array $input ) {
		$sanitized = $this->sanitizer->sanitize_settings(
			array(
				'light_logo_id'            => $input['light_logo_id'] ?? 0,
				'dark_logo_id'             => $input['dark_logo_id'] ?? 0,
				'long_logo_id'             => $input['long_logo_id'] ?? 0,
				'use_long_logo'            => $input['use_long_logo'] ?? false,
				'primary_color'            => $input['primary_color'] ?? BrandingSettingsRepository::DEFAULT_PRIMARY_COLOR,
				'font_preset'              => $input['font_preset'] ?? BrandingSettingsRepository::DEFAULT_FONT_PRESET,
				'open_in_new_tab_patterns' => $input['open_in_new_tab_patterns'] ?? array(),
			)
		);

		if ( $this->repository->save_settings( $sanitized ) ) {
			return true;
		}

		if ( $this->repository->get_persisted_value() === $sanitized ) {
			return true;
		}

		return new \WP_Error( 'save_failed', 'Failed to save branding settings.', array( 'status' => 500 ) );
	}
}
