<?php
/**
 * Branding settings sanitizer for WP React UI.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Branding;

defined( 'ABSPATH' ) || exit;

/**
 * Handles branding input normalization and validation.
 */
final class BrandingSanitizer {
	private const ALLOWED_FONT_PRESETS = array( 'inter', 'system', 'grotesk', 'serif' );

	public function __construct(
		private BrandingMediaLibraryAdapter $media_library
	) {}

	/**
	 * Sanitizes the full branding settings payload.
	 *
	 * @param mixed $input Raw input from Settings API or REST transport.
	 * @return array
	 */
	public function sanitize_settings( $input ): array {
		$input = is_array( $input ) ? $input : array();

		return array(
			'light_logo_id'            => $this->sanitize_logo_id( $input['light_logo_id'] ?? 0, 'light' ),
			'dark_logo_id'             => $this->sanitize_logo_id( $input['dark_logo_id'] ?? 0, 'dark' ),
			'long_logo_id'             => $this->sanitize_logo_id( $input['long_logo_id'] ?? 0, 'long' ),
			'use_long_logo'            => ! empty( $input['use_long_logo'] ),
			'primary_color'            => $this->sanitize_primary_color( $input['primary_color'] ?? BrandingSettingsRepository::DEFAULT_PRIMARY_COLOR ),
			'font_preset'              => $this->sanitize_font_preset( $input['font_preset'] ?? BrandingSettingsRepository::DEFAULT_FONT_PRESET ),
			'open_in_new_tab_patterns' => $this->sanitize_open_in_new_tab_patterns( $input['open_in_new_tab_patterns'] ?? '' ),
		);
	}

	/**
	 * Sanitizes a hex primary color value.
	 *
	 * @param mixed $value Raw color value.
	 * @return string
	 */
	public function sanitize_primary_color( $value ): string {
		$color = sanitize_hex_color( (string) $value );

		return is_string( $color ) ? strtolower( $color ) : BrandingSettingsRepository::DEFAULT_PRIMARY_COLOR;
	}

	/**
	 * Sanitizes a font preset key.
	 *
	 * @param mixed $value Raw preset value.
	 * @return string
	 */
	public function sanitize_font_preset( $value ): string {
		$preset = sanitize_key( (string) $value );

		return in_array( $preset, self::ALLOWED_FONT_PRESETS, true ) ? $preset : BrandingSettingsRepository::DEFAULT_FONT_PRESET;
	}

	/**
	 * Sanitizes open-in-new-tab patterns.
	 *
	 * @param mixed $value Raw textarea value.
	 * @return string[]
	 */
	public function sanitize_open_in_new_tab_patterns( $value ): array {
		if ( is_array( $value ) ) {
			$lines = $value;
		} else {
			$lines = preg_split( '/\r\n|\r|\n/', (string) $value );
		}

		$patterns = array();

		foreach ( (array) $lines as $line ) {
			$pattern = sanitize_text_field( wp_unslash( (string) $line ) );
			$pattern = trim( $pattern );

			if ( '' === $pattern ) {
				continue;
			}

			$patterns[] = strtolower( $pattern );
		}

		return array_values( array_unique( $patterns ) );
	}

	/**
	 * Sanitizes and validates a logo attachment ID.
	 *
	 * @param mixed  $value   Raw logo field value.
	 * @param string $variant Logo variant for error reporting.
	 * @return int
	 */
	private function sanitize_logo_id( $value, string $variant ): int {
		$attachment_id = absint( $value );

		if ( 0 === $attachment_id ) {
			return 0;
		}

		if ( ! $this->media_library->is_image_attachment( $attachment_id ) ) {
			add_settings_error(
				BrandingSettingsRepository::OPTION_NAME,
				'invalid_' . $variant . '_logo',
				sprintf( 'The selected %s logo must be an image attachment.', $variant )
			);

			return 0;
		}

		return $attachment_id;
	}
}
