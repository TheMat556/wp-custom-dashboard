<?php
/**
 * Tests for WP_React_UI_Menu_Repository.
 */

use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/includes/class-wp-react-ui-menu-cache.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-wp-react-ui-menu-repository.php';

/**
 * Extends Menu_Repository to expose the private build_menu_items and parse_menu_label for testing.
 */
class Testable_Menu_Repository extends WP_React_UI_Menu_Repository {

	public static function test_build_menu_items( array $menu, array $submenu, bool $comments_enabled ): array {
		$method = new ReflectionMethod( parent::class, 'build_menu_items' );
		$method->setAccessible( true );
		return $method->invoke( null, $menu, $submenu, $comments_enabled );
	}

	public static function test_parse_menu_label( string $raw ): array {
		$method = new ReflectionMethod( parent::class, 'parse_menu_label' );
		$method->setAccessible( true );
		return $method->invoke( null, $raw );
	}
}

class MenuRepositoryTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
	}

	// ── parse_menu_label ──────────────────────────────────────────────────

	public function test_parse_plain_label(): void {
		$result = Testable_Menu_Repository::test_parse_menu_label( 'Dashboard' );

		$this->assertSame( 'Dashboard', $result['label'] );
		$this->assertNull( $result['count'] );
	}

	public function test_parse_label_with_count_span(): void {
		$raw = 'Comments <span class="awaiting-mod count-5"><span class="comment-count">5</span></span>';
		$result = Testable_Menu_Repository::test_parse_menu_label( $raw );

		$this->assertSame( 'Comments', $result['label'] );
		$this->assertSame( 5, $result['count'] );
	}

	public function test_parse_label_with_zero_count_returns_null(): void {
		$raw = 'Updates <span class="update-count">0</span>';
		$result = Testable_Menu_Repository::test_parse_menu_label( $raw );

		$this->assertSame( 'Updates', $result['label'] );
		$this->assertNull( $result['count'] );
	}

	public function test_parse_label_collapses_whitespace(): void {
		$raw = "  Plugins   \t Overview  ";
		$result = Testable_Menu_Repository::test_parse_menu_label( $raw );

		$this->assertSame( 'Plugins Overview', $result['label'] );
	}

	public function test_parse_label_nested_spans(): void {
		$raw = 'Plugins <span class="update-plugins count-3"><span class="plugin-count">3</span></span>';
		$result = Testable_Menu_Repository::test_parse_menu_label( $raw );

		$this->assertSame( 'Plugins', $result['label'] );
		$this->assertSame( 3, $result['count'] );
	}

	// ── build_menu_items ──────────────────────────────────────────────────

	public function test_build_basic_menu(): void {
		$menu = array(
			array( 'Dashboard', 'read', 'index.php', '', '', '', 'dashicons-dashboard' ),
		);
		$submenu = array();

		$items = Testable_Menu_Repository::test_build_menu_items( $menu, $submenu, true );

		$this->assertCount( 1, $items );
		$this->assertSame( 'Dashboard', $items[0]['label'] );
		$this->assertSame( 'index.php', $items[0]['slug'] );
		$this->assertSame( 'dashicons-dashboard', $items[0]['icon'] );
		$this->assertSame( 'read', $items[0]['cap'] );
		$this->assertSame( array(), $items[0]['children'] );
	}

	public function test_build_menu_with_submenu(): void {
		$menu = array(
			array( 'Posts', 'edit_posts', 'edit.php', '', '', '', 'dashicons-admin-post' ),
		);
		$submenu = array(
			'edit.php' => array(
				array( 'All Posts', 'edit_posts', 'edit.php' ),
				array( 'Add New', 'edit_posts', 'post-new.php' ),
			),
		);

		$items = Testable_Menu_Repository::test_build_menu_items( $menu, $submenu, true );

		$this->assertCount( 1, $items );
		$this->assertCount( 2, $items[0]['children'] );
		$this->assertSame( 'All Posts', $items[0]['children'][0]['label'] );
		$this->assertSame( 'edit.php', $items[0]['children'][0]['slug'] );
		$this->assertSame( 'Add New', $items[0]['children'][1]['label'] );
	}

	public function test_skips_empty_labels(): void {
		$menu = array(
			array( '', 'read', 'separator', '', '', '', '' ),
			array( 'Dashboard', 'read', 'index.php', '', '', '', 'dashicons-dashboard' ),
		);

		$items = Testable_Menu_Repository::test_build_menu_items( $menu, array(), true );

		$this->assertCount( 1, $items );
		$this->assertSame( 'Dashboard', $items[0]['label'] );
	}

	public function test_skips_empty_submenu_labels(): void {
		$menu = array(
			array( 'Posts', 'edit_posts', 'edit.php', '', '', '', '' ),
		);
		$submenu = array(
			'edit.php' => array(
				array( '', 'edit_posts', 'edit.php' ),
				array( 'Add New', 'edit_posts', 'post-new.php' ),
			),
		);

		$items = Testable_Menu_Repository::test_build_menu_items( $menu, $submenu, true );

		$this->assertCount( 1, $items[0]['children'] );
		$this->assertSame( 'Add New', $items[0]['children'][0]['label'] );
	}

	public function test_strips_comments_menu_when_disabled(): void {
		$menu = array(
			array( 'Dashboard', 'read', 'index.php', '', '', '', '' ),
			array( 'Comments', 'moderate_comments', 'edit-comments.php', '', '', '', '' ),
		);

		$items = Testable_Menu_Repository::test_build_menu_items( $menu, array(), false );

		$this->assertCount( 1, $items );
		$this->assertSame( 'Dashboard', $items[0]['label'] );
	}

	public function test_keeps_comments_menu_when_enabled(): void {
		$menu = array(
			array( 'Dashboard', 'read', 'index.php', '', '', '', '' ),
			array( 'Comments', 'moderate_comments', 'edit-comments.php', '', '', '', '' ),
		);

		$items = Testable_Menu_Repository::test_build_menu_items( $menu, array(), true );

		$this->assertCount( 2, $items );
	}

	public function test_preserves_count_in_menu_items(): void {
		$menu = array(
			array(
				'Plugins <span class="update-plugins count-7"><span class="plugin-count">7</span></span>',
				'activate_plugins',
				'plugins.php',
				'',
				'',
				'',
				'dashicons-admin-plugins',
			),
		);

		$items = Testable_Menu_Repository::test_build_menu_items( $menu, array(), true );

		$this->assertSame( 'Plugins', $items[0]['label'] );
		$this->assertSame( 7, $items[0]['count'] );
	}

	public function test_preserves_count_in_submenu_items(): void {
		$menu = array(
			array( 'Dashboard', 'read', 'index.php', '', '', '', '' ),
		);
		$submenu = array(
			'index.php' => array(
				array(
					'Updates <span class="update-count">12</span>',
					'update_core',
					'update-core.php',
				),
			),
		);

		$items = Testable_Menu_Repository::test_build_menu_items( $menu, $submenu, true );

		$this->assertSame( 12, $items[0]['children'][0]['count'] );
		$this->assertSame( 'Updates', $items[0]['children'][0]['label'] );
	}

	public function test_missing_icon_defaults_to_empty_string(): void {
		$menu = array(
			array( 'Dashboard', 'read', 'index.php', '', '', '' ),
		);

		$items = Testable_Menu_Repository::test_build_menu_items( $menu, array(), true );

		$this->assertSame( '', $items[0]['icon'] );
	}
}
