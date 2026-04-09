<?php
/**
 * Theme preference service for REST transport extraction.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Services;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes the current user's theme preference.
 */
final class ThemePreferenceService {

	private const META_KEY = 'wp_react_ui_theme';

	/**
	 * Returns the current theme payload.
	 *
	 * @return array{theme: string}
	 */
	public function get_theme_payload(): array {
		$theme = get_user_meta( get_current_user_id(), self::META_KEY, true );

		if ( ! $theme ) {
			$theme = 'light';
		}

		return array( 'theme' => $theme );
	}

	/**
	 * Saves the current theme and returns the REST-ready payload.
	 *
	 * @param mixed $requested_theme Requested theme value.
	 * @return array{theme: string}
	 */
	public function save_theme( $requested_theme ): array {
		$theme = 'dark' === $requested_theme ? 'dark' : 'light';
		update_user_meta( get_current_user_id(), self::META_KEY, $theme );

		return array( 'theme' => $theme );
	}
}
