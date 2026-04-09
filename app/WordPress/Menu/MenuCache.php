<?php
/**
 * Menu cache for WP React UI.
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Handles per-user menu caching and cache versioning.
 */
class WP_React_UI_Menu_Cache {

	/**
	 * Transient key prefix for per-user menu payloads.
	 *
	 * @var string
	 */
	private const CACHE_PREFIX = 'wp_react_ui_menu';

	/**
	 * Option name storing the current cache namespace version.
	 *
	 * @var string
	 */
	private const CACHE_VERSION_OPTION = 'wp_react_ui_menu_cache_version';

	/**
	 * Returns cached menu data for a user, or null when absent.
	 *
	 * @param int $user_id User ID.
	 * @return array|null
	 */
	public static function get( int $user_id ): ?array {
		$cached = get_transient( self::get_cache_key( $user_id ) );
		return false === $cached ? null : (array) $cached;
	}

	/**
	 * Stores menu data for a user.
	 *
	 * @param int   $user_id User ID.
	 * @param array $items Menu payload.
	 * @return void
	 */
	public static function put( int $user_id, array $items ): void {
		$ttl = (int) apply_filters( 'wp_react_ui_menu_cache_ttl', 5 * MINUTE_IN_SECONDS, $user_id, $items );
		set_transient( self::get_cache_key( $user_id ), $items, max( MINUTE_IN_SECONDS, $ttl ) );
	}

	/**
	 * Bumps the menu cache namespace version.
	 *
	 * @return void
	 */
	public static function clear(): void {
		update_option( self::CACHE_VERSION_OPTION, (string) (int) round( microtime( true ) * 1000000 ), false );
	}

	/**
	 * Clears cached menu data for a specific user.
	 *
	 * @param int $user_id User ID.
	 * @return void
	 */
	public static function clear_user( int $user_id ): void {
		delete_transient( self::get_cache_key( $user_id ) );
	}

	/**
	 * Returns the cache key for a user.
	 *
	 * @param int $user_id User ID.
	 * @return string
	 */
	private static function get_cache_key( int $user_id ): string {
		return self::CACHE_PREFIX . '_' . self::get_cache_version() . '_' . $user_id;
	}

	/**
	 * Returns the current cache namespace version.
	 *
	 * @return string
	 */
	private static function get_cache_version(): string {
		$version = get_option( self::CACHE_VERSION_OPTION, '1' );

		if ( ! is_string( $version ) || '' === $version ) {
			return '1';
		}

		return $version;
	}
}
