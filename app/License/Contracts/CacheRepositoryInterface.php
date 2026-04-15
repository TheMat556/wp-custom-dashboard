<?php
/**
 * Cache storage interface — domain layer abstraction.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License\Contracts;

defined('ABSPATH') || exit;

/**
 * Repository interface for temporary cache storage (e.g., transients).
 *
 * Abstracts away WordPress transient functions from the domain layer,
 * enabling pure unit testing without framework dependencies.
 */
interface CacheRepositoryInterface {
	/**
	 * Retrieves a value from the cache.
	 *
	 * @param string $key Cache key.
	 * @return mixed Cached value, or null if not found.
	 */
	public function get(string $key): mixed;

	/**
	 * Stores a value in the cache with a TTL.
	 *
	 * @param string $key Cache key.
	 * @param mixed  $value Value to cache.
	 * @param int    $ttl Time-to-live in seconds.
	 * @return bool True on success, false on failure.
	 */
	public function set(string $key, mixed $value, int $ttl): bool;

	/**
	 * Removes a value from the cache.
	 *
	 * @param string $key Cache key.
	 * @return bool True on success, false on failure.
	 */
	public function delete(string $key): bool;

	/**
	 * Increments a numeric cache value within a time window.
	 *
	 * Atomically increments the value at $key by 1, resetting if the window has passed.
	 *
	 * @param string $key Cache key.
	 * @param int    $window_seconds Time window in seconds.
	 * @return int The incremented value, or 0 if window reset.
	 */
	public function increment(string $key, int $window_seconds): int;
}
