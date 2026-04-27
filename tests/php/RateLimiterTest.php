<?php
/**
 * Unit tests for RateLimiter.
 *
 * @package WP_React_UI
 */

use WpReactUi\Rest\RateLimiter;
use WpReactUi\Rest\Controllers\LicenseRouteController;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class RateLimiterTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
	}

	// ── RateLimiter::check() ─────────────────────────────────────────────────

	public function test_check_allows_requests_within_limit(): void {
		for ( $i = 0; $i < RateLimiter::LIMIT_LICENSE_ACTIVATE; $i++ ) {
			$this->assertTrue( RateLimiter::check( 'license_activate', RateLimiter::LIMIT_LICENSE_ACTIVATE, 1 ) );
		}
	}

	public function test_check_blocks_request_exceeding_limit(): void {
		for ( $i = 0; $i < RateLimiter::LIMIT_LICENSE_ACTIVATE; $i++ ) {
			RateLimiter::check( 'license_activate', RateLimiter::LIMIT_LICENSE_ACTIVATE, 1 );
		}

		$this->assertFalse( RateLimiter::check( 'license_activate', RateLimiter::LIMIT_LICENSE_ACTIVATE, 1 ) );
	}

	public function test_check_isolates_different_actions(): void {
		for ( $i = 0; $i < RateLimiter::LIMIT_LICENSE_ACTIVATE; $i++ ) {
			RateLimiter::check( 'license_activate', RateLimiter::LIMIT_LICENSE_ACTIVATE, 1 );
		}

		// A different action should have its own independent counter.
		$this->assertTrue( RateLimiter::check( 'chat_send', RateLimiter::LIMIT_CHAT_SEND, 1 ) );
	}

	public function test_check_isolates_different_users(): void {
		for ( $i = 0; $i < RateLimiter::LIMIT_LICENSE_ACTIVATE; $i++ ) {
			RateLimiter::check( 'license_activate', RateLimiter::LIMIT_LICENSE_ACTIVATE, 1 );
		}

		// A different user ID should have its own independent counter.
		$this->assertTrue( RateLimiter::check( 'license_activate', RateLimiter::LIMIT_LICENSE_ACTIVATE, 2 ) );
	}

	public function test_check_stores_transient_with_60_second_expiration(): void {
		RateLimiter::check( 'chat_send', RateLimiter::LIMIT_CHAT_SEND, 5 );

		$key        = 'wp_react_ui_rl_' . md5( 'chat_send_5' );
		$expiration = wp_test_get_transient_expiration( $key );

		$this->assertSame( 60, $expiration );
	}

	// ── RateLimiter::enforce() ───────────────────────────────────────────────

	public function test_enforce_returns_true_within_limit(): void {
		$result = RateLimiter::enforce( 'preferences_save', RateLimiter::LIMIT_PREFERENCES_SAVE );

		$this->assertTrue( $result );
	}

	public function test_enforce_returns_rate_limited_wp_error_when_exceeded(): void {
		for ( $i = 0; $i < RateLimiter::LIMIT_LICENSE_ACTIVATE; $i++ ) {
			RateLimiter::enforce( 'license_activate', RateLimiter::LIMIT_LICENSE_ACTIVATE );
		}

		$result = RateLimiter::enforce( 'license_activate', RateLimiter::LIMIT_LICENSE_ACTIVATE );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'rate_limited', $result->get_error_code() );
		$this->assertSame( array( 'status' => 429 ), $result->get_error_data( 'rate_limited' ) );
	}

	// ── Controller integration: 6th license activation returns 429 ──────────

	/**
	 * Verifies that the 6th license activation attempt within one minute returns
	 * a 429 rate_limited WP_Error, not a service error.
	 */
	public function test_6th_license_activation_returns_429_wp_error(): void {
		$controller = new LicenseRouteController();
		$request    = new WP_REST_Request( array( 'licenseKey' => 'test-key-123' ) );

		for ( $i = 0; $i < RateLimiter::LIMIT_LICENSE_ACTIVATE; $i++ ) {
			$result = $controller->activate( $request );
			// Calls 1–5 may fail at the service level (no live HTTP in tests),
			// but they must NOT be rate-limited yet.
			if ( is_wp_error( $result ) ) {
				$this->assertNotSame( 'rate_limited', $result->get_error_code() );
			}
		}

		$result = $controller->activate( $request );

		$this->assertTrue( is_wp_error( $result ), 'Expected a WP_Error on the 6th attempt.' );
		$this->assertSame( 'rate_limited', $result->get_error_code() );
		$this->assertSame( array( 'status' => 429 ), $result->get_error_data( 'rate_limited' ) );
	}

	// ── Named limit constants ────────────────────────────────────────────────

	public function test_limit_constants_have_expected_values(): void {
		$this->assertSame( 20, RateLimiter::LIMIT_CHAT_SEND );
		$this->assertSame( 5, RateLimiter::LIMIT_LICENSE_ACTIVATE );
		$this->assertSame( 30, RateLimiter::LIMIT_PREFERENCES_SAVE );
	}
}
