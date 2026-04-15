<?php
/**
 * Tests for the local grace-period state machine.
 */

use WpReactUi\License\LicenseGracePeriod;
use WpReactUi\License\LicenseServiceContainer;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class LicenseGracePeriodTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
		LicenseServiceContainer::getInstance()->reset();
	}

	public function test_get_status_returns_normal_when_no_grace_is_active(): void {
		$grace = LicenseServiceContainer::getInstance()->getGracePeriod();
		$status = $grace->get_status();

		$this->assertSame( 'normal', $status['mode'] );
		$this->assertSame( 0, $status['graceDaysRemaining'] );
		$this->assertNull( $status['startedAt'] );
	}

	public function test_start_grace_persists_started_at_and_returns_grace_state(): void {
		$grace = LicenseServiceContainer::getInstance()->getGracePeriod();
		$status = $grace->start_grace();

		$this->assertSame( 'grace', $status['mode'] );
		$this->assertNotNull( $status['startedAt'] );
		$this->assertGreaterThanOrEqual( 1, $status['graceDaysRemaining'] );
		$this->assertLessThanOrEqual( 7, $status['graceDaysRemaining'] );
	}

	public function test_get_status_returns_disabled_after_grace_window_expires(): void {
		update_option( 'wp_react_ui_license_grace_started_at', time() - ( 8 * DAY_IN_SECONDS ), false );

		$grace = LicenseServiceContainer::getInstance()->getGracePeriod();
		$status = $grace->get_status();

		$this->assertSame( 'disabled', $status['mode'] );
		$this->assertSame( 0, $status['graceDaysRemaining'] );
	}
}

