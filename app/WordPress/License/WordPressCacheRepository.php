<?php
/**
 * WordPress transient-based cache repository adapter.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\WordPress\License;

use WpReactUi\License\Contracts\CacheRepositoryInterface;

defined( 'ABSPATH' ) || exit;

/**
 * Implements CacheRepositoryInterface using WordPress transients.
 *
 * Maps the domain layer cache interface to WordPress transient functions,
 * allowing the domain to remain framework-agnostic while using WordPress
 * infrastructure in production.
 */
final class WordPressCacheRepository implements CacheRepositoryInterface {
	/**
	 * Retrieves a value from the cache using WordPress transients.
	 *
	 * @param string $key Cache key.
	 * @return mixed Cached value, or false if not found (treats false as not found).
	 */
	public function get( string $key ): mixed {
		$value = get_transient( $key );
		return false === $value ? null : $value;
	}

	/**
	 * Stores a value in a WordPress transient.
	 *
	 * @param string $key Cache key.
	 * @param mixed  $value Value to cache.
	 * @param int    $ttl Time-to-live in seconds.
	 * @return bool True on success, false on failure.
	 */
	public function set( string $key, mixed $value, int $ttl ): bool {
		return set_transient( $key, $value, $ttl );
	}

	/**
	 * Removes a value from the WordPress cache.
	 *
	 * @param string $key Cache key.
	 * @return bool True on success, false on failure.
	 */
	public function delete( string $key ): bool {
		return delete_transient( $key );
	}

	/**
	 * Increments a numeric cache value within a time window.
	 *
	 * Uses a companion transient to track the window start time.
	 * If the window has expired, resets the counter and restarts the window.
	 *
	 * @param string $key Cache key.
	 * @param int    $window_seconds Time window in seconds.
	 * @return int The incremented value, or 1 if window reset.
	 */
	public function increment( string $key, int $window_seconds ): int {
		$window_key   = "{$key}_window";
		$current      = (int) get_transient( $key );
		$window_start = (int) get_transient( $window_key );

		$now = time();

		// If no window start or window has expired, reset the counter.
		if ( $window_start <= 0 || ( $now - $window_start ) >= $window_seconds ) {
			set_transient( $window_key, $now, $window_seconds );
			set_transient( $key, 1, $window_seconds );
			return 1;
		}

		// Increment within the current window.
		$incremented = $current + 1;
		set_transient( $key, $incremented, $window_seconds );
		return $incremented;
	}
}
