<?php
/**
 * Tests for the transient-backed license cache.
 */

use WpReactUi\License\LicenseCache;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class LicenseCacheTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
	}

	public function test_set_and_get_normalized_license_payload(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'active',
				'tier'               => 'pro',
				'expiresAt'          => '2030-01-01 00:00:00',
				'features'           => array( 'dashboard', 'dashboard', 'chat ' ),
				'graceDaysRemaining' => 0,
				'keyPrefix'          => '01234567',
			)
		);

		$cached = $cache->get();

		$this->assertIsArray( $cached );
		$this->assertSame( 'active', $cached['status'] );
		$this->assertSame( 'pro', $cached['tier'] );
		$this->assertSame( array( 'dashboard', 'chat' ), $cached['features'] );
		$this->assertSame( DAY_IN_SECONDS, wp_test_get_transient_expiration( LicenseCache::TRANSIENT_KEY ) );
	}

	public function test_grace_status_uses_shorter_ttl(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'grace',
				'tier'               => 'pro',
				'expiresAt'          => '2030-01-01 00:00:00',
				'features'           => array( 'dashboard' ),
				'graceDaysRemaining' => 3,
				'keyPrefix'          => '01234567',
			)
		);

		$this->assertSame( HOUR_IN_SECONDS, wp_test_get_transient_expiration( LicenseCache::TRANSIENT_KEY ) );
	}

	public function test_expired_status_with_grace_days_uses_shorter_ttl(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'expired',
				'tier'               => 'pro',
				'expiresAt'          => '2030-01-01 00:00:00',
				'features'           => array( 'dashboard' ),
				'graceDaysRemaining' => 3,
				'keyPrefix'          => '01234567',
			)
		);

		$this->assertSame( HOUR_IN_SECONDS, wp_test_get_transient_expiration( LicenseCache::TRANSIENT_KEY ) );
	}

	public function test_clear_removes_cached_payload(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'active',
				'tier'               => 'pro',
				'features'           => array( 'dashboard' ),
				'graceDaysRemaining' => 0,
				'keyPrefix'          => '01234567',
			)
		);

		$this->assertNotNull( $cache->get() );

		$cache->clear();

		$this->assertNull( $cache->get() );
		$this->assertNull( wp_test_get_transient_expiration( LicenseCache::TRANSIENT_KEY ) );
	}

	public function test_get_falls_back_to_persisted_backup_when_transient_is_missing(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'active',
				'tier'               => 'pro',
				'features'           => array( 'dashboard' ),
				'graceDaysRemaining' => 0,
				'keyPrefix'          => '01234567',
				'lastValidatedAt'    => gmdate( 'Y-m-d H:i:s' ),
			)
		);

		delete_transient( LicenseCache::TRANSIENT_KEY );

		$cached = $cache->get();

		$this->assertIsArray( $cached );
		$this->assertSame( 'active', $cached['status'] );
		$this->assertSame( array( 'dashboard' ), $cached['features'] );
	}
}
