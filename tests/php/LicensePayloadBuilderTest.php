<?php
/**
 * Tests for LicensePayloadBuilder
 *
 * @package WP_React_UI
 */

namespace WpReactUi\Tests\License;

use WpReactUi\License\LicensePayloadBuilder;
use PHPUnit\Framework\TestCase;

class LicensePayloadBuilderTest extends TestCase {
	/**
	 * Test build returns full payload for active license.
	 */
	public function test_build_returns_full_payload_for_active_license(): void {
		$cached_state = array(
			'status'             => 'active',
			'role'               => 'owner',
			'tier'               => 'pro',
			'expiresAt'          => '2025-12-31T23:59:59Z',
			'features'           => array( 'chat', 'analytics' ),
			'graceDaysRemaining' => 0,
			'keyPrefix'          => '12345678',
			'lastValidatedAt'    => '2024-12-15T10:00:00Z',
		);

		$builder = new LicensePayloadBuilder( $cached_state, true, true );
		$payload = $builder->build();

		$this->assertSame( 'active', $payload['status'] );
		$this->assertSame( 'owner', $payload['role'] );
		$this->assertSame( 'pro', $payload['tier'] );
		$this->assertSame( '2025-12-31T23:59:59Z', $payload['expiresAt'] );
		$this->assertSame( array( 'chat', 'analytics' ), $payload['features'] );
		$this->assertTrue( $payload['hasKey'] );
		$this->assertSame( '12345678', $payload['keyPrefix'] );
		$this->assertTrue( $payload['serverConfigured'] );
	}

	/**
	 * Test build reflects grace period days remaining.
	 */
	public function test_build_reflects_grace_period_days_remaining(): void {
		$cached_state = array(
			'status'             => 'expired',
			'role'               => 'customer',
			'tier'               => 'starter',
			'expiresAt'          => '2024-12-14T23:59:59Z',
			'features'           => array( 'chat' ),
			'graceDaysRemaining' => 7,
			'keyPrefix'          => 'abcd1234',
			'lastValidatedAt'    => '2024-12-15T10:00:00Z',
		);

		$builder = new LicensePayloadBuilder( $cached_state, true, true );
		$payload = $builder->build();

		$this->assertSame( 'expired', $payload['status'] );
		$this->assertSame( 7, $payload['graceDaysRemaining'] );
	}

	/**
	 * Test build handles no key and unconfigured server.
	 */
	public function test_build_handles_no_key_and_unconfigured_server(): void {
		$cached_state = array(
			'status'             => 'disabled',
			'role'               => null,
			'tier'               => null,
			'expiresAt'          => null,
			'features'           => array(),
			'graceDaysRemaining' => 0,
			'keyPrefix'          => null,
			'lastValidatedAt'    => null,
		);

		$builder = new LicensePayloadBuilder( $cached_state, false, false );
		$payload = $builder->build();

		$this->assertSame( 'disabled', $payload['status'] );
		$this->assertFalse( $payload['hasKey'] );
		$this->assertFalse( $payload['serverConfigured'] );
	}

	/**
	 * Test buildPublic returns same as build (for now).
	 */
	public function test_buildPublic_returns_same_as_build(): void {
		$cached_state = array(
			'status'             => 'active',
			'role'               => 'owner',
			'tier'               => 'pro',
			'expiresAt'          => '2025-12-31T23:59:59Z',
			'features'           => array( 'chat' ),
			'graceDaysRemaining' => 0,
			'keyPrefix'          => '12345678',
			'lastValidatedAt'    => '2024-12-15T10:00:00Z',
		);

		$builder = new LicensePayloadBuilder( $cached_state, true, true );
		$public  = $builder->buildPublic();
		$full    = $builder->build();

		$this->assertSame( $full, $public );
	}

	/**
	 * Test build with grace state.
	 */
	public function test_build_with_grace_state(): void {
		$cached_state = array(
			'status'             => 'grace',
			'role'               => 'owner',
			'tier'               => 'pro',
			'expiresAt'          => '2024-12-31T23:59:59Z',
			'features'           => array( 'chat' ),
			'graceDaysRemaining' => 14,
			'keyPrefix'          => 'xyz789',
			'lastValidatedAt'    => '2024-12-15T10:00:00Z',
		);

		$builder = new LicensePayloadBuilder( $cached_state, true, true );
		$payload = $builder->build();

		$this->assertSame( 'grace', $payload['status'] );
		$this->assertSame( 14, $payload['graceDaysRemaining'] );
		$this->assertSame( 'pro', $payload['tier'] );
	}
}
