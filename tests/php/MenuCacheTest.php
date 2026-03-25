<?php
/**
 * Tests for WP_React_UI_Menu_Cache.
 */

use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/includes/class-wp-react-ui-menu-cache.php';

class MenuCacheTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
	}

	public function test_get_returns_null_when_empty(): void {
		$this->assertNull( WP_React_UI_Menu_Cache::get( 1 ) );
	}

	public function test_put_and_get_roundtrip(): void {
		$items = array(
			array( 'label' => 'Dashboard', 'slug' => 'index.php' ),
		);

		WP_React_UI_Menu_Cache::put( 1, $items );
		$cached = WP_React_UI_Menu_Cache::get( 1 );

		$this->assertSame( $items, $cached );
	}

	public function test_clear_user_removes_specific_cache(): void {
		$items = array( array( 'label' => 'Test' ) );
		WP_React_UI_Menu_Cache::put( 1, $items );

		$this->assertNotNull( WP_React_UI_Menu_Cache::get( 1 ) );

		WP_React_UI_Menu_Cache::clear_user( 1 );

		$this->assertNull( WP_React_UI_Menu_Cache::get( 1 ) );
	}

	public function test_clear_invalidates_all_caches_via_version_bump(): void {
		WP_React_UI_Menu_Cache::put( 1, array( array( 'label' => 'A' ) ) );
		WP_React_UI_Menu_Cache::put( 2, array( array( 'label' => 'B' ) ) );

		WP_React_UI_Menu_Cache::clear();

		// After version bump, old cache keys no longer match
		$this->assertNull( WP_React_UI_Menu_Cache::get( 1 ) );
		$this->assertNull( WP_React_UI_Menu_Cache::get( 2 ) );
	}

	public function test_different_users_have_separate_caches(): void {
		WP_React_UI_Menu_Cache::put( 1, array( array( 'label' => 'User 1' ) ) );
		WP_React_UI_Menu_Cache::put( 2, array( array( 'label' => 'User 2' ) ) );

		$this->assertSame( 'User 1', WP_React_UI_Menu_Cache::get( 1 )[0]['label'] );
		$this->assertSame( 'User 2', WP_React_UI_Menu_Cache::get( 2 )[0]['label'] );
	}
}
