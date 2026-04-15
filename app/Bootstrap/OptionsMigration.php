<?php
/**
 * Handles migration of WordPress options for plugin updates.
 *
 * Since rate-limiter data is ephemeral (transients with TTL), old wprui_ keys
 * expire naturally and don't require data migration.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Bootstrap;

defined( 'ABSPATH' ) || exit;

final class OptionsMigration {

	/**
	 * Flag indicating that option name migrations have been completed.
	 */
	private const MIGRATION_FLAG = 'wp_react_ui_options_migrated_v2';

	/**
	 * Runs all pending option migrations idempotently.
	 *
	 * Migrates option names from old prefixes to standardized wp_react_ui_ prefix.
	 * Safe to call multiple times — checks migration flag to run only once.
	 *
	 * Rate limiter data is ephemeral (transients with automatic expiration),
	 * so old wprui_ keys expire naturally without data preservation needed.
	 */
	public static function run(): void {
		if ( self::has_run() ) {
			return;
		}

		// Rate limiter keys are transients — they expire naturally.
		// No data migration needed for ephemeral rate limit counters.
		// Legacy wprui_ keys will be automatically cleaned up when they expire.

		self::mark_complete();
	}

	/**
	 * Checks whether migrations have already been run.
	 */
	private static function has_run(): bool {
		return (bool) get_option( self::MIGRATION_FLAG );
	}

	/**
	 * Marks migrations as complete.
	 */
	private static function mark_complete(): void {
		update_option( self::MIGRATION_FLAG, true, false );
	}

	/**
	 * Gets the migration flag option name.
	 *
	 * Useful for uninstall cleanup and testing.
	 */
	public static function get_migration_flag(): string {
		return self::MIGRATION_FLAG;
	}
}
