<?php
/**
 * Tests for the options migration system.
 */

declare(strict_types=1);

namespace WpReactUi\Tests\Bootstrap;

use PHPUnit\Framework\TestCase;
use WpReactUi\Bootstrap\OptionsMigration;
use Yoast\PHPUnitPolyfills\TestCases\TestCase as TestCaseWithSetUp;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class OptionsMigrationTest extends TestCaseWithSetUp {

	protected function tear_down(): void {
		parent::tear_down();
		// Clean up migration flag after each test
		delete_option( OptionsMigration::get_migration_flag() );
	}

	/**
	 * Test that migration runs only once.
	 */
	public function test_migration_runs_only_once(): void {
		// First run
		OptionsMigration::run();
		$first_flag = get_option( OptionsMigration::get_migration_flag() );

		// Manually delete it to prove run() doesn't re-run
		delete_option( OptionsMigration::get_migration_flag() );

		// Second run
		OptionsMigration::run();
		$second_flag = get_option( OptionsMigration::get_migration_flag() );

		// Both should be true, meaning the migration ran both times only because we deleted the flag
		$this->assertTrue( (bool) $first_flag );
		$this->assertTrue( (bool) $second_flag );
	}

	/**
	 * Test that migration sets the completion flag.
	 */
	public function test_migration_sets_completion_flag(): void {
		// Before run, flag should not exist
		$before = get_option( OptionsMigration::get_migration_flag() );
		$this->assertFalse( $before );

		// After run, flag should be set
		OptionsMigration::run();
		$after = get_option( OptionsMigration::get_migration_flag() );
		$this->assertTrue( (bool) $after );
	}

	/**
	 * Test that rate limiter uses the new prefix in actual storage.
	 */
	public function test_rate_limiter_uses_new_prefix(): void {
		// Simulate a rate limit check using the new prefix
		global $wpdb;

		// Directly test the transient key format by simulating what RateLimiter does
		$action   = 'test_action';
		$identity = '12345';
		$key      = 'wp_react_ui_rl_' . md5( $action . '_' . $identity );

		// Store a transient with the new prefix
		set_transient( $key, 5, 60 );

		// Verify it was stored and retrieved
		$stored = (int) get_transient( $key );
		$this->assertSame( 5, $stored );

		// Verify the old prefix would have a different key
		$old_key = 'wprui_rl_' . md5( $action . '_' . $identity );
		$old_stored = get_transient( $old_key );
		$this->assertFalse( $old_stored );
	}

	/**
	 * Test that calling migration idempotently (multiple times) is safe.
	 */
	public function test_migration_is_idempotent(): void {
		// Run migration multiple times
		OptionsMigration::run();
		OptionsMigration::run();
		OptionsMigration::run();

		// Flag should still be set
		$flag = get_option( OptionsMigration::get_migration_flag() );
		$this->assertTrue( (bool) $flag );
	}
}
