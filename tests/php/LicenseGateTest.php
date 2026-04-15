<?php
/**
 * Tests for server-side feature gating.
 */

use WpReactUi\License\LicenseCache;
use WpReactUi\License\LicenseGate;
use WpReactUi\License\LicenseServiceContainer;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class LicenseGateTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
		update_option(
			'wp_react_ui_license_settings',
			array(
				'license_key' => '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
			),
			false
		);
		// Reset service container to ensure clean state
		LicenseServiceContainer::getInstance()->reset();
	}

	protected function tear_down(): void {
		LicenseServiceContainer::getInstance()->reset();
		parent::tear_down();
	}

	public function test_can_returns_false_when_cache_is_missing(): void {
		$this->assertFalse( LicenseGate::can( 'chat' ) );
	}

	public function test_can_returns_true_for_matching_active_feature(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'active',
				'tier'               => 'pro',
				'features'           => array( 'chat', 'dashboard' ),
				'graceDaysRemaining' => 0,
				'keyPrefix'          => '01234567',
				'lastValidatedAt'    => gmdate( 'Y-m-d H:i:s' ),
			)
		);

		$this->assertTrue( LicenseGate::can( 'chat' ) );
	}

	public function test_can_allows_grace_mode_but_blocks_disabled_mode(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'grace',
				'tier'               => 'pro',
				'features'           => array( 'chat' ),
				'graceDaysRemaining' => 2,
				'keyPrefix'          => '01234567',
			)
		);

		$this->assertTrue( LicenseGate::can( 'chat' ) );

		$cache->set(
			array(
				'status'             => 'disabled',
				'tier'               => 'pro',
				'features'           => array( 'chat' ),
				'graceDaysRemaining' => 0,
				'keyPrefix'          => '01234567',
			)
		);

		$this->assertFalse( LicenseGate::can( 'chat' ) );
	}

	public function test_can_allows_expired_license_during_grace_window(): void {
		update_option( 'wp_react_ui_license_grace_started_at', time() - DAY_IN_SECONDS, false );

		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'expired',
				'tier'               => 'pro',
				'features'           => array( 'chat' ),
				'graceDaysRemaining' => 6,
				'keyPrefix'          => '01234567',
				'lastValidatedAt'    => gmdate( 'Y-m-d H:i:s' ),
			)
		);

		$this->assertTrue( LicenseGate::can( 'chat' ) );
	}

	public function test_can_backfills_local_grace_for_remote_expired_payloads(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'expired',
				'tier'               => 'pro',
				'features'           => array( 'chat' ),
				'graceDaysRemaining' => 4,
				'keyPrefix'          => '01234567',
				'lastValidatedAt'    => gmdate( 'Y-m-d H:i:s' ),
			)
		);

		$this->assertTrue( LicenseGate::can( 'chat' ) );
		$this->assertSame( 'grace', \WpReactUi\License\LicenseServiceContainer::getInstance()->getGracePeriod()->get_status()['mode'] );
	}

	public function test_can_rejects_mismatched_cached_key_prefix(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'active',
				'tier'               => 'pro',
				'features'           => array( 'chat' ),
				'graceDaysRemaining' => 0,
				'keyPrefix'          => 'deadbeef',
			)
		);

		$this->assertFalse( LicenseGate::can( 'chat' ) );
		$this->assertNull( $cache->get() );
	}

	public function test_can_uses_backup_payload_when_transient_has_expired(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'active',
				'tier'               => 'pro',
				'features'           => array( 'chat' ),
				'graceDaysRemaining' => 0,
				'keyPrefix'          => '01234567',
				'lastValidatedAt'    => gmdate( 'Y-m-d H:i:s' ),
			)
		);

		delete_transient( LicenseCache::TRANSIENT_KEY );

		$this->assertTrue( LicenseGate::can( 'chat' ) );
	}

	public function test_can_blocks_grace_mode_after_grace_window_expires(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'grace',
				'tier'               => 'pro',
				'features'           => array( 'chat' ),
				'graceDaysRemaining' => 1,
				'keyPrefix'          => '01234567',
				'lastValidatedAt'    => gmdate( 'Y-m-d H:i:s', time() - DAY_IN_SECONDS ),
			)
		);
		update_option( 'wp_react_ui_license_grace_started_at', time() - ( 8 * DAY_IN_SECONDS ), false );

		$this->assertFalse( LicenseGate::can( 'chat' ) );
		$this->assertSame( 'disabled', $cache->get()['status'] );
	}

	public function test_can_revalidates_stale_cache_and_blocks_expired_license(): void {
		global $wp_test_state;

		update_option( 'wp_react_ui_license_server_url', 'https://licenses.example.test', false );
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'active',
				'tier'               => 'pro',
				'features'           => array( 'chat' ),
				'graceDaysRemaining' => 0,
				'keyPrefix'          => '01234567',
				'lastValidatedAt'    => gmdate( 'Y-m-d H:i:s', time() - ( DAY_IN_SECONDS + HOUR_IN_SECONDS ) ),
			)
		);

		$wp_test_state['remote_post_handler'] = static function (): array {
			return array(
				'response' => array(
					'code' => 200,
				),
				'body'     => wp_json_encode(
					array(
						'status'  => 'expired',
						'license' => array(
							'tier'        => 'pro',
							'valid_until' => '2020-01-01 00:00:00',
							'features'    => array( 'chat' ),
						),
					)
				),
			);
		};

		$this->assertFalse( LicenseGate::can( 'chat' ) );
		$this->assertSame( 'expired', $cache->get()['status'] );
	}

	public function test_can_revalidates_grace_backup_after_transient_expiry(): void {
		global $wp_test_state;

		update_option( 'wp_react_ui_license_server_url', 'https://licenses.example.test', false );
		update_option( 'wp_react_ui_license_grace_started_at', time() - DAY_IN_SECONDS, false );
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'grace',
				'tier'               => 'pro',
				'features'           => array( 'chat' ),
				'graceDaysRemaining' => 6,
				'keyPrefix'          => '01234567',
				'lastValidatedAt'    => gmdate( 'Y-m-d H:i:s', time() - HOUR_IN_SECONDS ),
			)
		);
		delete_transient( LicenseCache::TRANSIENT_KEY );

		$wp_test_state['remote_post_handler'] = static function (): array {
			return array(
				'response' => array(
					'code' => 200,
				),
				'body'     => wp_json_encode(
					array(
						'status'  => 'active',
						'license' => array(
							'tier'        => 'pro',
							'valid_until' => '2030-01-01 00:00:00',
							'features'    => array( 'chat' ),
						),
					)
				),
			);
		};

		$this->assertTrue( LicenseGate::can( 'chat' ) );
		$this->assertSame( 'active', $cache->get()['status'] );
	}

	/**
	 * Test: LicenseGate::has_valid_license() returns true for ACTIVE licenses.
	 */
	public function test_has_valid_license_returns_true_for_active_license(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'active',
				'tier'               => 'pro',
				'features'           => array( 'chat' ),
				'graceDaysRemaining' => 0,
				'keyPrefix'          => '01234567',
				'lastValidatedAt'    => gmdate( 'Y-m-d H:i:s' ),
			)
		);

		$this->assertTrue( LicenseGate::has_valid_license() );
	}

	/**
	 * Test: LicenseGate::has_valid_license() returns false for DISABLED licenses.
	 */
	public function test_has_valid_license_returns_false_for_disabled_license(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'disabled',
				'tier'               => 'pro',
				'features'           => array( 'chat' ),
				'graceDaysRemaining' => 0,
				'keyPrefix'          => '01234567',
			)
		);

		$this->assertFalse( LicenseGate::has_valid_license() );
	}

	/**
	 * Test: LicenseGate::has_valid_license() returns false for EXPIRED licenses with zero grace remaining.
	 */
	public function test_has_valid_license_returns_false_for_expired_license_with_zero_grace(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'expired',
				'tier'               => 'pro',
				'features'           => array( 'chat' ),
				'graceDaysRemaining' => 0,
				'keyPrefix'          => '01234567',
			)
		);

		$this->assertFalse( LicenseGate::has_valid_license() );
	}

	/**
	 * Test: LicenseGate::can() returns true when feature is in active license (via container).
	 */
	public function test_can_returns_true_when_feature_in_active_license_via_container(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'active',
				'tier'               => 'pro',
				'features'           => array( 'chat', 'dashboard' ),
				'graceDaysRemaining' => 0,
				'keyPrefix'          => '01234567',
				'lastValidatedAt'    => gmdate( 'Y-m-d H:i:s' ),
			)
		);

		$this->assertTrue( LicenseGate::can( 'chat' ) );
		$this->assertTrue( LicenseGate::can( 'dashboard' ) );
	}

	/**
	 * Test: LicenseGate::can() returns false when feature is not in active license.
	 */
	public function test_can_returns_false_when_feature_not_in_license(): void {
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

		$this->assertFalse( LicenseGate::can( 'chat' ) );
	}

	/**
	 * Test: LicenseGate::can() returns true for GRACE mode license.
	 */
	public function test_can_returns_true_for_grace_mode_license(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'grace',
				'tier'               => 'pro',
				'features'           => array( 'chat' ),
				'graceDaysRemaining' => 2,
				'keyPrefix'          => '01234567',
			)
		);

		$this->assertTrue( LicenseGate::can( 'chat' ) );
	}

	/**
	 * Test: Service container is a singleton.
	 */
	public function test_service_container_is_singleton(): void {
		$container1 = LicenseServiceContainer::getInstance();
		$container2 = LicenseServiceContainer::getInstance();

		$this->assertSame( $container1, $container2 );
	}

	/**
	 * Test: Service container allows dependency injection for testing.
	 */
	public function test_service_container_allows_dependency_injection(): void {
		$container = LicenseServiceContainer::getInstance();

		// Create a real cache and set it via the container
		$injectedCache = new LicenseCache();
		$injectedCache->set(
			array(
				'status'             => 'active',
				'tier'               => 'pro',
				'features'           => array( 'injected-feature' ),
				'graceDaysRemaining' => 0,
				'keyPrefix'          => '99999999',
			)
		);
		$container->setCache( $injectedCache );

		// The container should return the injected cache
		$this->assertSame( $injectedCache, $container->getCache() );
	}

	/**
	 * Test: Service container reset clears all injected dependencies.
	 */
	public function test_service_container_reset_clears_injection(): void {
		$container = LicenseServiceContainer::getInstance();

		// Inject a cache
		$injectedCache = new LicenseCache();
		$container->setCache( $injectedCache );
		$this->assertSame( $injectedCache, $container->getCache() );

		// Reset the container
		$container->reset();

		// Now the container creates a fresh cache
		$newCache = $container->getCache();
		$this->assertNotSame( $injectedCache, $newCache );
		$this->assertInstanceOf( LicenseCache::class, $newCache );
	}
}
