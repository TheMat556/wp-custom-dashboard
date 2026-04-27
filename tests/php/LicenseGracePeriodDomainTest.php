<?php
/**
 * Pure PHP unit tests for LicenseGracePeriod without WordPress bootstrap.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Tests\License;

use PHPUnit\Framework\TestCase;
use WpReactUi\License\Contracts\OptionsRepositoryInterface;
use WpReactUi\License\LicenseGracePeriod;

/**
 * Unit tests for LicenseGracePeriod with mock repository (no WordPress bootstrap).
 *
 * @requires function define
 */
final class LicenseGracePeriodDomainTest extends TestCase {
	private LicenseGracePeriod $grace_period;
	private MockOptionsRepository $mock_options;
	private const OPTION_NAME = 'wp_react_ui_license_grace_started_at';

	protected function setUp(): void {
		$this->mock_options  = new MockOptionsRepository();
		$this->grace_period  = new LicenseGracePeriod( $this->mock_options );
	}

	protected function tearDown(): void {
		$this->mock_options->clear();
	}

	public function test_get_status_returns_normal_when_no_grace(): void {
		$status = $this->grace_period->get_status();

		$this->assertSame( 'normal', $status['mode'] );
		$this->assertNull( $status['startedAt'] );
		$this->assertSame( 0, $status['graceDaysRemaining'] );
	}

	public function test_start_grace_sets_started_at(): void {
		$status = $this->grace_period->start_grace();

		$this->assertSame( 'grace', $status['mode'] );
		$this->assertNotNull( $status['startedAt'] );
		$this->assertGreaterThan( 0, $status['graceDaysRemaining'] );
	}

	public function test_start_grace_idempotent(): void {
		$status1 = $this->grace_period->start_grace();
		$time1   = $status1['startedAt'];

		// Wait a tiny bit and call again.
		usleep( 1000 );
		$status2 = $this->grace_period->start_grace();
		$time2   = $status2['startedAt'];

		// Should return the same started_at time (idempotent).
		$this->assertSame( $time1, $time2 );
	}

	public function test_sync_grace_days_updates_started_at(): void {
		// Start grace with 7 days remaining.
		$this->grace_period->start_grace();

		// Sync to 3 days remaining.
		$status = $this->grace_period->sync_grace_days_remaining( 3 );

		$this->assertSame( 'grace', $status['mode'] );
		$this->assertSame( 3, $status['graceDaysRemaining'] );
	}

	public function test_sync_grace_days_zero_clears_grace(): void {
		$this->grace_period->start_grace();

		// Sync to 0 days.
		$status = $this->grace_period->sync_grace_days_remaining( 0 );

		$this->assertSame( 'normal', $status['mode'] );
		$this->assertSame( 0, $status['graceDaysRemaining'] );
	}

	public function test_clear_grace_removes_state(): void {
		$this->grace_period->start_grace();

		$before = $this->grace_period->get_status();
		$this->assertSame( 'grace', $before['mode'] );

		$this->grace_period->clear_grace();

		$after = $this->grace_period->get_status();
		$this->assertSame( 'normal', $after['mode'] );
	}

	public function test_grace_expiration_after_7_days(): void {
		// Manually set the grace start time to 8 days ago.
		$eight_days_ago = time() - ( 8 * 86400 );
		$this->mock_options->update( self::OPTION_NAME, $eight_days_ago );

		$status = $this->grace_period->get_status();

		$this->assertSame( 'disabled', $status['mode'] );
		$this->assertSame( 0, $status['graceDaysRemaining'] );
	}

	public function test_grace_days_remaining_calculation(): void {
		// Set grace to start 2 days ago (so 5 days remaining).
		$two_days_ago = time() - ( 2 * 86400 );
		$this->mock_options->update( self::OPTION_NAME, $two_days_ago );

		$status = $this->grace_period->get_status();

		$this->assertSame( 'grace', $status['mode'] );
		$this->assertSame( 5, $status['graceDaysRemaining'] );
	}

	public function test_grace_until_calculation(): void {
		$start_time = $this->grace_period->start_grace()['startedAt'];

		$status = $this->grace_period->get_status();

		$expected_grace_until = $start_time + ( 7 * 86400 );
		$this->assertSame( $expected_grace_until, $status['graceUntil'] );
	}
}
