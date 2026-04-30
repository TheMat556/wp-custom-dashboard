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
 * - Flushes rewrite rules so WordPress regenerates the .htaccess rewrite block.
 *
 * The admin notice in RestApiNotice handles telling site owners when their
 * permalink structure is set to "Plain", which breaks REST API pretty URLs.
 */
final class ActivationHandler {

	/**
	 * Runs all activation tasks.
	 *
	 * @return void
	 */
	public static function activate(): void {
		self::flush_rewrite_rules();
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
