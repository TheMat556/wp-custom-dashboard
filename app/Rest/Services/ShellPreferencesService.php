<?php
/**
 * Shell preferences service for REST transport extraction.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Services;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes the current user's shell preferences.
 */
final class ShellPreferencesService {

	private const META_KEY = 'wp_react_ui_preferences';

	/**
	 * Returns the current preferences payload.
	 *
	 * @return array{preferences: array}
	 */
	public function get_preferences_payload(): array {
		$raw   = get_user_meta( get_current_user_id(), self::META_KEY, true );
		$prefs = is_array( $raw ) ? $raw : array();

		return array( 'preferences' => $prefs );
	}

	/**
	 * Merges and saves shell preferences.
	 *
	 * @param array $input JSON-decoded preferences object.
	 * @return array{preferences: array}
	 */
	public function save_preferences( array $input ): array {
		$user_id  = get_current_user_id();
		$existing = get_user_meta( $user_id, self::META_KEY, true );
		$prefs    = is_array( $existing ) ? $existing : array();

		$string_keys = array( 'density', 'themePreset', 'customPresetColor' );
		$bool_keys   = array( 'sidebarCollapsed', 'highContrast' );
		$array_keys  = array( 'favorites', 'recentPages', 'dashboardWidgetOrder', 'hiddenWidgets' );

		foreach ( $string_keys as $key ) {
			if ( isset( $input[ $key ] ) ) {
				$prefs[ $key ] = sanitize_text_field( $input[ $key ] );
			}
		}

		foreach ( $bool_keys as $key ) {
			if ( isset( $input[ $key ] ) ) {
				$prefs[ $key ] = (bool) $input[ $key ];
			}
		}

		foreach ( $array_keys as $key ) {
			if ( isset( $input[ $key ] ) && is_array( $input[ $key ] ) ) {
				$prefs[ $key ] = $input[ $key ];
			}
		}

		update_user_meta( $user_id, self::META_KEY, $prefs );

		return array( 'preferences' => $prefs );
	}
}
