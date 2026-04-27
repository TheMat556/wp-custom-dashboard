<?php
/**
 * Pure PHP unit tests for LicenseCache without WordPress bootstrap.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Tests\License;

use PHPUnit\Framework\TestCase;
use WpReactUi\License\Contracts\CacheRepositoryInterface;
use WpReactUi\License\Contracts\OptionsRepositoryInterface;
use WpReactUi\License\LicenseCache;

/**
 * Mock cache repository for testing.
 */
class MockCacheRepository implements CacheRepositoryInterface {
	/** @var array<string, array{value: mixed, ttl: int, timestamp: int}> */
	private array $storage = array();

	public function get(string $key): mixed {
		$now = time();
		if ( isset( $this->storage[ $key ] ) ) {
			$entry = $this->storage[ $key ];
			if ( $entry['ttl'] > 0 && ( $now - $entry['timestamp'] ) >= $entry['ttl'] ) {
				unset( $this->storage[ $key ] );
				return null;
			}
			return $entry['value'];
		}
		return null;
	}

	public function set(string $key, mixed $value, int $ttl): bool {
		$this->storage[ $key ] = array(
			'value'     => $value,
			'ttl'       => $ttl,
			'timestamp' => time(),
		);
		return true;
	}

	public function delete(string $key): bool {
		unset( $this->storage[ $key ] );
		return true;
	}

	public function increment(string $key, int $window_seconds): int {
		// Simple increment for testing
		$current = (int) $this->get( $key );
		$this->set( $key, $current + 1, $window_seconds );
		return $current + 1;
	}

	public function clear(): void {
		$this->storage = array();
	}
}

/**
 * Mock options repository for testing.
 */
class MockOptionsRepository implements OptionsRepositoryInterface {
	/** @var array<string, mixed> */
	private array $storage = array();

	public function get(string $key, mixed $default = null): mixed {
		return $this->storage[ $key ] ?? $default;
	}

	public function update(string $key, mixed $value): bool {
		$this->storage[ $key ] = $value;
		return true;
	}

	public function delete(string $key): bool {
		unset( $this->storage[ $key ] );
		return true;
	}

	public function clear(): void {
		$this->storage = array();
	}
}

/**
 * Unit tests for LicenseCache with mock repositories (no WordPress bootstrap).
 *
 * @requires function define
 */
final class LicenseCacheDomainTest extends TestCase {
	private LicenseCache $cache;
	private MockCacheRepository $mock_cache;
	private MockOptionsRepository $mock_options;

	protected function setUp(): void {
		$this->mock_cache    = new MockCacheRepository();
		$this->mock_options  = new MockOptionsRepository();
		$this->cache         = new LicenseCache( $this->mock_cache, $this->mock_options );
	}

	protected function tearDown(): void {
		$this->mock_cache->clear();
		$this->mock_options->clear();
	}

	public function test_default_payload_is_disabled(): void {
		$payload = $this->cache->default_payload();

		$this->assertSame( LicenseCache::STATUS_DISABLED, $payload['status'] );
		$this->assertNull( $payload['role'] );
		$this->assertSame( 0, $payload['graceDaysRemaining'] );
		$this->assertSame( array(), $payload['features'] );
	}

	public function test_get_returns_null_when_cache_empty(): void {
		$result = $this->cache->get();

		$this->assertNull( $result );
	}

	public function test_set_and_get_stores_and_retrieves(): void {
		$payload = array(
			'status'             => LicenseCache::STATUS_ACTIVE,
			'role'               => 'admin',
			'tier'               => 'pro',
			'expiresAt'          => '2026-12-31',
			'features'           => array( 'chat', 'activity' ),
			'graceDaysRemaining' => 0,
			'keyPrefix'          => 'key_abc',
			'lastValidatedAt'    => '2026-04-14',
		);

		$this->cache->set( $payload );
		$retrieved = $this->cache->get();

		$this->assertIsArray( $retrieved );
		$this->assertSame( LicenseCache::STATUS_ACTIVE, $retrieved['status'] );
		$this->assertSame( 'admin', $retrieved['role'] );
		$this->assertSame( array( 'activity', 'chat' ), $retrieved['features'] ); // Sorted
	}

	public function test_clear_removes_cache(): void {
		$payload = array(
			'status'             => LicenseCache::STATUS_ACTIVE,
			'role'               => 'admin',
			'tier'               => 'pro',
			'expiresAt'          => '2026-12-31',
			'features'           => array( 'chat' ),
			'graceDaysRemaining' => 0,
			'keyPrefix'          => 'key_abc',
			'lastValidatedAt'    => '2026-04-14',
		);

		$this->cache->set( $payload );
		$this->assertTrue( $this->cache->has_fresh_transient() );

		$this->cache->clear();
		$this->assertFalse( $this->cache->has_fresh_transient() );
		$this->assertNull( $this->cache->get() );
	}

	public function test_normalize_sanitizes_features(): void {
		$payload = array(
			'status'             => LicenseCache::STATUS_ACTIVE,
			'features'           => array( 'chat', 'Activity', 'invalid feature!', '', 'chat' ), // Duplicates and invalid
			'graceDaysRemaining' => 0,
			'role'               => null,
			'tier'               => null,
			'expiresAt'          => null,
			'keyPrefix'          => null,
			'lastValidatedAt'    => null,
		);

		$this->cache->set( $payload );
		$retrieved = $this->cache->get();

		// Should deduplicate and remove invalid features
		$this->assertSame( array( 'activity', 'chat' ), $retrieved['features'] );
	}

	public function test_normalize_handles_missing_fields(): void {
		$payload = array(
			'status' => LicenseCache::STATUS_GRACE,
			// Missing most fields
		);

		$this->cache->set( $payload );
		$retrieved = $this->cache->get();

		$this->assertSame( LicenseCache::STATUS_GRACE, $retrieved['status'] );
		$this->assertNull( $retrieved['role'] );
		$this->assertSame( 0, $retrieved['graceDaysRemaining'] );
		$this->assertSame( array(), $retrieved['features'] );
	}

	public function test_backup_fallback_when_transient_expired(): void {
		$payload = array(
			'status'             => LicenseCache::STATUS_ACTIVE,
			'role'               => 'admin',
			'tier'               => 'pro',
			'expiresAt'          => '2026-12-31',
			'features'           => array( 'chat' ),
			'graceDaysRemaining' => 0,
			'keyPrefix'          => 'key_abc',
			'lastValidatedAt'    => '2026-04-14',
		);

		// Set via cache to transient (will expire quickly in test).
		$this->cache->set( $payload );

		// Manually expire the transient by removing it from the cache mock.
		$this->mock_cache->delete( LicenseCache::TRANSIENT_KEY );

		// But the backup is still in options.
		$retrieved = $this->cache->get();

		$this->assertIsArray( $retrieved );
		$this->assertSame( LicenseCache::STATUS_ACTIVE, $retrieved['status'] );
	}
}
