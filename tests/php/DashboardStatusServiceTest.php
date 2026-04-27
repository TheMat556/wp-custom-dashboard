<?php
/**
 * Tests for DashboardStatusService::find_legal_page()
 *
 * @package WP_React_UI
 */

namespace WpReactUi\Tests\Dashboard;

use WpReactUi\Dashboard\DashboardStatusService;
use WpReactUi\Dashboard\DashboardMetricsService;
use WpReactUi\Dashboard\DashboardCalendarService;
use PHPUnit\Framework\TestCase;

class DashboardStatusServiceTest extends TestCase {
	private DashboardStatusService $service;
	private array $created_page_ids = array();

	protected function setUp(): void {
		parent::setUp();

		$metrics  = new DashboardMetricsService();
		$calendar = new DashboardCalendarService();
		$this->service = new DashboardStatusService( $metrics, $calendar );
	}

	protected function tearDown(): void {
		parent::tearDown();

		// Clean up created pages
		foreach ( $this->created_page_ids as $page_id ) {
			wp_delete_post( $page_id, true );
		}
		$this->created_page_ids = array();
	}

	/**
	 * Helper to create a test page.
	 *
	 * @param string $title      Page title.
	 * @param string $status     Post status.
	 * @return int Page ID.
	 */
	private function create_page( string $title, string $status = 'publish' ): int {
		$page_id = wp_insert_post(
			array(
				'post_type'   => 'page',
				'post_title'  => $title,
				'post_status' => $status,
			)
		);

		if ( ! is_wp_error( $page_id ) ) {
			$this->created_page_ids[] = $page_id;
		}

		return $page_id;
	}

	/**
	 * Test find_legal_page returns page matching keyword.
	 */
	public function test_find_legal_page_returns_page_matching_keyword(): void {
		$page_id = $this->create_page( 'Privacy Policy', 'publish' );

		// Use reflection to call the private method
		$reflection_method = new \ReflectionMethod(
			DashboardStatusService::class,
			'find_legal_page'
		);
		$reflection_method->setAccessible( true );

		$result = $reflection_method->invoke(
			$this->service,
			array( 'privacy' )
		);

		$this->assertIsArray( $result );
		$this->assertTrue( $result['exists'] );
		$this->assertTrue( $result['published'] );
		$this->assertSame( 'Privacy Policy', $result['title'] );
		$this->assertStringContainsString( 'post=' . $page_id, $result['editUrl'] );
	}

	/**
	 * Test find_legal_page returns null when no match.
	 */
	public function test_find_legal_page_returns_null_when_no_match(): void {
		$this->create_page( 'About Us', 'publish' );

		$reflection_method = new \ReflectionMethod(
			DashboardStatusService::class,
			'find_legal_page'
		);
		$reflection_method->setAccessible( true );

		$result = $reflection_method->invoke(
			$this->service,
			array( 'nonexistent', 'keyword' )
		);

		$this->assertNull( $result );
	}

	/**
	 * Test find_legal_page prioritizes published over draft.
	 */
	public function test_find_legal_page_prioritizes_published_over_draft(): void {
		$draft_id      = $this->create_page( 'Privacy Policy Draft', 'draft' );
		$published_id  = $this->create_page( 'Privacy Policy Published', 'publish' );

		$reflection_method = new \ReflectionMethod(
			DashboardStatusService::class,
			'find_legal_page'
		);
		$reflection_method->setAccessible( true );

		$result = $reflection_method->invoke(
			$this->service,
			array( 'privacy' )
		);

		$this->assertIsArray( $result );
		$this->assertTrue( $result['published'] );
		$this->assertSame( 'Privacy Policy Published', $result['title'] );
		$this->assertStringContainsString( 'post=' . $published_id, $result['editUrl'] );
	}

	/**
	 * Test find_legal_page escapes special LIKE characters.
	 */
	public function test_find_legal_page_escapes_special_like_characters(): void {
		// Create page with underscore and percent in title
		$page_id = $this->create_page( 'Privacy_Policy 100%', 'publish' );

		$reflection_method = new \ReflectionMethod(
			DashboardStatusService::class,
			'find_legal_page'
		);
		$reflection_method->setAccessible( true );

		// Search for the page using a keyword with special chars
		$result = $reflection_method->invoke(
			$this->service,
			array( 'Privacy_Policy' )
		);

		$this->assertIsArray( $result );
		$this->assertSame( 'Privacy_Policy 100%', $result['title'] );
	}

	/**
	 * Test find_legal_page is case-insensitive.
	 */
	public function test_find_legal_page_is_case_insensitive(): void {
		$this->create_page( 'Privacy Policy', 'publish' );

		$reflection_method = new \ReflectionMethod(
			DashboardStatusService::class,
			'find_legal_page'
		);
		$reflection_method->setAccessible( true );

		// Search with mixed case
		$result = $reflection_method->invoke(
			$this->service,
			array( 'PRIVACY' )
		);

		$this->assertIsArray( $result );
		$this->assertSame( 'Privacy Policy', $result['title'] );
	}

	/**
	 * Test find_legal_page returns null for empty keywords.
	 */
	public function test_find_legal_page_returns_null_for_empty_keywords(): void {
		$this->create_page( 'Privacy Policy', 'publish' );

		$reflection_method = new \ReflectionMethod(
			DashboardStatusService::class,
			'find_legal_page'
		);
		$reflection_method->setAccessible( true );

		$result = $reflection_method->invoke(
			$this->service,
			array()
		);

		$this->assertNull( $result );
	}

	/**
	 * Test find_legal_page includes daysOld in result.
	 */
	public function test_find_legal_page_includes_daysOld_in_result(): void {
		$page_id = $this->create_page( 'Privacy Policy', 'publish' );

		$reflection_method = new \ReflectionMethod(
			DashboardStatusService::class,
			'find_legal_page'
		);
		$reflection_method->setAccessible( true );

		$result = $reflection_method->invoke(
			$this->service,
			array( 'privacy' )
		);

		$this->assertIsArray( $result );
		$this->assertArrayHasKey( 'daysOld', $result );
		$this->assertIsInt( $result['daysOld'] );
		$this->assertGreaterThanOrEqual( 0, $result['daysOld'] );
	}

	/**
	 * Test find_legal_page includes viewUrl for published pages.
	 */
	public function test_find_legal_page_includes_viewUrl_for_published_pages(): void {
		$page_id = $this->create_page( 'Privacy Policy', 'publish' );

		$reflection_method = new \ReflectionMethod(
			DashboardStatusService::class,
			'find_legal_page'
		);
		$reflection_method->setAccessible( true );

		$result = $reflection_method->invoke(
			$this->service,
			array( 'privacy' )
		);

		$this->assertIsArray( $result );
		$this->assertIsString( $result['viewUrl'] );
		$this->assertNotEmpty( $result['viewUrl'] );
	}

	/**
	 * Test find_legal_page does not include viewUrl for draft pages.
	 */
	public function test_find_legal_page_does_not_include_viewUrl_for_draft_pages(): void {
		$page_id = $this->create_page( 'Privacy Policy', 'draft' );

		$reflection_method = new \ReflectionMethod(
			DashboardStatusService::class,
			'find_legal_page'
		);
		$reflection_method->setAccessible( true );

		$result = $reflection_method->invoke(
			$this->service,
			array( 'privacy' )
		);

		$this->assertIsArray( $result );
		$this->assertNull( $result['viewUrl'] );
	}
}
