<?php
/**
 * Branding settings persistence for WP React UI.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Branding;

defined( 'ABSPATH' ) || exit;

/**
 * Handles branding settings persistence and option defaults.
 */
final class BrandingSettingsRepository {
	public const OPTION_NAME           = 'wp_react_ui_branding';
	public const DEFAULT_PRIMARY_COLOR = '#4f46e5';
	public const DEFAULT_FONT_PRESET   = 'inter';

	/**
	 * Returns the default branding settings.
	 *
	 * @return array
	 */
	public function get_default_settings(): array {
		return array(
			'light_logo_id'            => 0,
			'dark_logo_id'             => 0,
			'long_logo_id'             => 0,
			'use_long_logo'            => false,
			'primary_color'            => self::DEFAULT_PRIMARY_COLOR,
			'font_preset'              => self::DEFAULT_FONT_PRESET,
			'open_in_new_tab_patterns' => array(),
		);
	}

	/**
	 * Returns persisted settings merged with defaults.
	 *
	 * @return array
	 */
	public function get_settings(): array {
		$settings = get_option( self::OPTION_NAME, array() );

		if ( ! is_array( $settings ) ) {
			$settings = array();
		}

		return wp_parse_args( $settings, $this->get_default_settings() );
	}

	/**
	 * Returns the raw option value for strict compatibility checks.
	 *
	 * @return mixed
	 */
	public function get_persisted_value() {
		return get_option( self::OPTION_NAME, array() );
	}

	/**
	 * Persists sanitized settings.
	 *
	 * @param array $settings Sanitized settings.
	 * @return bool
	 */
	public function save_settings( array $settings ): bool {
		return update_option( self::OPTION_NAME, $settings );
	}

	/**
	 * Returns the stored attachment ID for a branding logo field.
	 *
	 * @param string $key Settings key.
	 * @return int
	 */
	public function get_logo_id( string $key ): int {
		$settings = $this->get_settings();

		return absint( $settings[ $key ] ?? 0 );
	}

	/**
	 * Returns whether long-logo mode is enabled.
	 *
	 * @return bool
	 */
	public function get_use_long_logo(): bool {
		$settings = $this->get_settings();

		return ! empty( $settings['use_long_logo'] );
	}

	/**
	 * Returns stored open-in-new-tab patterns.
	 *
	 * @return string[]
	 */
	public function get_open_in_new_tab_patterns(): array {
		$settings = $this->get_settings();
		$raw      = $settings['open_in_new_tab_patterns'] ?? array();

		if ( ! is_array( $raw ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map( 'strval', $raw ),
				static fn( string $pattern ): bool => '' !== trim( $pattern )
			)
		);
	}
}
