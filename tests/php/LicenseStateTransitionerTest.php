<?php
/**
 * Tests for LicenseStateTransitioner
 *
 * @package WP_React_UI
 */

namespace WpReactUi\Tests\License;

use PHPUnit\Framework\TestCase;
use WpReactUi\License\LicenseCache;
use WpReactUi\License\LicenseGracePeriod;
use WpReactUi\License\LicenseServiceContainer;
use WpReactUi\License\LicenseSettingsRepository;
use WpReactUi\License\LicenseStateTransitioner;

class LicenseStateTransitionerTest extends TestCase {
	private LicenseCache $cache;
	private LicenseSettingsRepository $settings_repository;
	private LicenseGracePeriod $grace_period;
	private LicenseStateTransitioner $transitioner;

	protected function setUp(): void {
		parent::setUp();
		$this->cache                  = new LicenseCache();
		$this->settings_repository    = new LicenseSettingsRepository();
		$this->grace_period           = LicenseServiceContainer::getInstance()->getGracePeriod();
		$this->transitioner           = new LicenseStateTransitioner( $this->cache, $this->settings_repository, $this->grace_period );

		// Clear any existing state
		$this->cache->clear();
		$this->settings_repository->clear_license_key();
	}

	/**
	 * Test isGraceState returns true for grace status.
	 */
	public function test_isGraceState_returns_true_for_grace_status(): void {
		$payload = array(
			'status'             => LicenseCache::STATUS_GRACE,
			'graceDaysRemaining' => 7,
		);

		$this->assertTrue( $this->transitioner->isGraceState( $payload ) );
	}

	/**
	 * Test isGraceState returns true for expired with grace days remaining.
	 */
	public function test_isGraceState_returns_true_for_expired_with_grace_days(): void {
		$payload = array(
			'status'             => LicenseCache::STATUS_EXPIRED,
			'graceDaysRemaining' => 5,
		);

		$this->assertTrue( $this->transitioner->isGraceState( $payload ) );
	}

	/**
	 * Test isGraceState returns false for expired with no grace days.
	 */
	public function test_isGraceState_returns_false_for_expired_without_grace_days(): void {
		$payload = array(
			'status'             => LicenseCache::STATUS_EXPIRED,
			'graceDaysRemaining' => 0,
		);

		$this->assertFalse( $this->transitioner->isGraceState( $payload ) );
	}

	/**
	 * Test buildPayloadFromRemote parses active license correctly.
	 */
	public function test_buildPayloadFromRemote_parses_active_license(): void {
		$remote = array(
			'status' => 'valid',
			'license' => array(
				'role'                    => 'owner',
				'tier'                    => 'pro',
				'valid_until'             => '2025-12-31T23:59:59Z',
				'grace_days_remaining'    => 0,
				'features'                => array( 'chat', 'analytics' ),
			),
		);

		$payload = $this->transitioner->buildPayloadFromRemote( $remote, 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2' );

		$this->assertSame( LicenseCache::STATUS_ACTIVE, $payload['status'] );
		$this->assertSame( 'owner', $payload['role'] );
		$this->assertSame( 'pro', $payload['tier'] );
		$this->assertSame( 'a1b2c3d4', $payload['keyPrefix'] );
		$this->assertContains( 'chat', $payload['features'] );
	}

	/**
	 * Test buildPayloadFromRemote handles missing optional fields.
	 */
	public function test_buildPayloadFromRemote_handles_missing_optional_fields(): void {
		$remote = array(
			'status' => 'valid',
			'license' => array(),
		);

		$payload = $this->transitioner->buildPayloadFromRemote( $remote, 'a' );

		$this->assertSame( LicenseCache::STATUS_ACTIVE, $payload['status'] );
		$this->assertNull( $payload['role'] );
		$this->assertNull( $payload['tier'] );
		$this->assertEmpty( $payload['features'] );
	}

	/**
	 * Test transitionToDisabled sets disabled status.
	 */
	public function test_transitionToDisabled_sets_disabled_status(): void {
		$payload = $this->transitioner->transitionToDisabled();

		$this->assertSame( LicenseCache::STATUS_DISABLED, $payload['status'] );

		// Verify it was cached
		$cached = $this->cache->get();
		$this->assertIsArray( $cached );
		$this->assertSame( LicenseCache::STATUS_DISABLED, $cached['status'] );
	}

	/**
	 * Test transitionToGrace sets grace status.
	 */
	public function test_transitionToGrace_sets_grace_status(): void {
		// Need to set up an existing license state
		$existing = $this->cache->default_payload();
		$existing['status'] = LicenseCache::STATUS_ACTIVE;
		$existing['role']   = 'owner';
		$this->cache->set( $existing );

		$payload = $this->transitioner->transitionToGrace();

		$this->assertSame( LicenseCache::STATUS_GRACE, $payload['status'] );
		$this->assertGreaterThan( 0, $payload['graceDaysRemaining'] );

		// Verify it was cached
		$cached = $this->cache->get();
		$this->assertIsArray( $cached );
		$this->assertSame( LicenseCache::STATUS_GRACE, $cached['status'] );
	}

	/**
	 * Test transitionToExpired sets expired status.
	 */
	public function test_transitionToExpired_sets_expired_status(): void {
		$existing = $this->cache->default_payload();
		$existing['status'] = LicenseCache::STATUS_ACTIVE;
		$this->cache->set( $existing );

		$payload = $this->transitioner->transitionToExpired();

		$this->assertSame( LicenseCache::STATUS_EXPIRED, $payload['status'] );
		$this->assertGreaterThan( 0, $payload['graceDaysRemaining'] );
	}

	/**
	 * Test transitionToExpired accepts webhook data.
	 */
	public function test_transitionToExpired_accepts_webhook_data(): void {
		$webhook_data = array(
			'tier'                  => 'starter',
			'role'                  => 'customer',
			'valid_until'           => '2024-12-31T23:59:59Z',
			'features'              => array( 'chat' ),
			'grace_days_remaining'  => 10,
		);

		$payload = $this->transitioner->transitionToExpired( $webhook_data );

		$this->assertSame( LicenseCache::STATUS_EXPIRED, $payload['status'] );
		$this->assertSame( 'starter', $payload['tier'] );
		$this->assertSame( 'customer', $payload['role'] );
		$this->assertSame( 10, $payload['graceDaysRemaining'] );
		$this->assertContains( 'chat', $payload['features'] );
	}

	/**
	 * Test transitionToActive saves license key and updates cache.
	 */
	public function test_transitionToActive_saves_license_key_and_updates_cache(): void {
		$this->settings_repository->clear_license_key();

		$remote = array(
			'status' => 'valid',
			'license' => array(
				'role'         => 'owner',
				'tier'         => 'pro',
				'valid_until'  => '2025-12-31T23:59:59Z',
				'features'     => array( 'chat' ),
			),
			'webhook_secret' => 'test-secret-key',
		);

		$license_key = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2';
		$payload     = $this->transitioner->transitionToActive( $remote, $license_key );

		$this->assertSame( LicenseCache::STATUS_ACTIVE, $payload['status'] );
		$this->assertSame( 'owner', $payload['role'] );

		// Verify key was saved
		$stored_key = $this->settings_repository->get_license_key();
		$this->assertSame( $license_key, $stored_key );

		// Verify cache was updated
		$cached = $this->cache->get();
		$this->assertIsArray( $cached );
		$this->assertSame( LicenseCache::STATUS_ACTIVE, $cached['status'] );
	}
}
