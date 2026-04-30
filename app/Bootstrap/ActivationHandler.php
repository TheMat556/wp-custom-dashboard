<?php
/**
 * Plugin activation handler.
 *
 * Ensures WordPress is configured so the plugin's REST API works out of the box.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Bootstrap;

use WP_Rewrite;

defined( 'ABSPATH' ) || exit;

/**
 * Handles plugin activation tasks:
 * - Ensures a non-plain permalink structure so /wp-json/ REST URLs resolve.
 * - Flushes rewrite rules so WordPress generates the .htaccess rewrite rules.
 */
final class ActivationHandler {

	/**
	 * Runs all activation tasks.
	 *
	 * @return void
	 */
	public static function activate(): void {
		self::ensure_permalink_structure();
		self::flush_rewrite_rules();
	}

	/**
	 * Sets a pretty permalink structure if currently set to "Plain".
	 *
	 * WordPress REST API pretty URLs (/wp-json/…) only work with a non-empty
	 * permalink_structure. When it is empty, the frontend receives 404s from
	 * Apache because no rewrite rules map /wp-json/ to index.php.
	 *
	 * @return void
	 */
	private static function ensure_permalink_structure(): void {
		$structure = get_option( 'permalink_structure', '' );

		if ( '' === $structure || false === $structure ) {
			update_option( 'permalink_structure', '/%postname%/' );
		}
	}

	/**
	 * Flushes rewrite rules so WordPress writes the .htaccess rewrite block.
	 *
	 * The hard flush regenerates the rules array in the database AND calls
	 * WP_Rewrite::save_mod_rewrite_rules(), which writes the actual Apache
	 * rewrite directives into the .htaccess file when mod_rewrite is available.
	 *
	 * @return void
	 */
	private static function flush_rewrite_rules(): void {
		global $wp_rewrite;

		if ( $wp_rewrite instanceof WP_Rewrite ) {
			$wp_rewrite->flush_rules( true );
		} elseif ( function_exists( 'flush_rewrite_rules' ) ) {
			flush_rewrite_rules( true );
		}
	}

	/**
	 * Checks whether the REST API is likely accessible via pretty URLs.
	 *
	 * @return bool
	 */
	public static function is_rest_api_accessible(): bool {
		$structure = get_option( 'permalink_structure', '' );
		return is_string( $structure ) && '' !== $structure;
	}
}
