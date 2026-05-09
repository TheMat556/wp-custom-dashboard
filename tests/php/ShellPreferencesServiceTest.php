<?php
/**
 * Tests for ShellPreferencesService (migration parity).
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Services;

use PHPUnit\Framework\TestCase;

/**
 * Verifies that PHP-side migration of legacy widget keys matches the TS side.
 *
 * These tests use reflection to invoke private/protected methods since
 * ShellPreferencesService is a final class with private methods.
 */
class ShellPreferencesServiceTest extends TestCase {

	/**
	 * Data provider: canonical legacy inputs and their expected expanded outputs.
	 *
	 * These must match the TS-side LEGACY_WIDGET_REPLACEMENTS + TEMPLATE_REWRITES.
	 *
	 * @return array<string, array{input: array, expected: array}>
	 */
	public static function provideLegacyWidgetOrderMigration(): array {
		return array(
			'empty list' => array(
				'input'    => array(),
				'expected' => array(),
			),
			'no legacy keys' => array(
				'input'    => array( 'hero', 'first-steps-checklist', 'action-center' ),
				'expected' => array( 'hero', 'first-steps-checklist', 'action-center' ),
			),
			'summary-tiles expanded' => array(
				'input'    => array( 'summary-tiles' ),
				'expected' => array( 'kpi-website', 'kpi-visitors', 'kpi-updates', 'kpi-speed', 'kpi-conversions' ),
			),
			'summary-tiles with other widgets' => array(
				'input'    => array( 'hero', 'summary-tiles', 'action-center' ),
				'expected' => array( 'hero', 'kpi-website', 'kpi-visitors', 'kpi-updates', 'kpi-speed', 'kpi-conversions', 'action-center' ),
			),
			'kpi-container rewritten to default instance' => array(
				'input'    => array( 'kpi-container' ),
				'expected' => array( 'kpi-container::__default__' ),
			),
			'container instance key preserved' => array(
				'input'    => array( 'kpi-container::inst_1' ),
				'expected' => array( 'kpi-container::inst_1' ),
			),
			'kpi-container with other widgets' => array(
				'input'    => array( 'hero', 'kpi-container', 'action-center' ),
				'expected' => array( 'hero', 'kpi-container::__default__', 'action-center' ),
			),
			'duplicates are deduplicated' => array(
				'input'    => array( 'summary-tiles', 'kpi-website' ),
				'expected' => array( 'kpi-website', 'kpi-visitors', 'kpi-updates', 'kpi-speed', 'kpi-conversions' ),
			),
		);
	}

	/**
	 * @dataProvider provideLegacyWidgetOrderMigration
	 */
	public function testExpandLegacyKeysInList( array $input, array $expected ): void {
		$service = new ShellPreferencesService();

		// Use reflection to access the private static method.
		$ref = new \ReflectionMethod( $service, 'expand_legacy_keys_in_list' );
		$ref->setAccessible( true );

		$result = $ref->invoke( null, $input );

		$this->assertSame( $expected, $result );
	}

	/**
	 * Tests sanitize_recent_pages preserves pageUrl, title, and visitedAt.
	 *
	 * Note: does not test the full save+retrieve round-trip (that requires
	 * WordPress user_meta which is unavailable in unit tests).
	 */
	public function testSanitizeRecentPages(): void {
		$service = new ShellPreferencesService();

		$input = array(
			'recentPages' => array(
				array(
					'pageUrl'   => 'http://example.com/page-a',
					'title'     => 'Page A',
					'visitedAt' => 1700000000,
				),
				array(
					'pageUrl'   => 'http://example.com/page-b',
					'title'     => 'Page B',
					'visitedAt' => 1700000001,
				),
			),
		);

		// Use reflection to call save_preferences
		$ref_method = new \ReflectionMethod( $service, 'save_preferences' );
		$ref_method->setAccessible( true );
		// We need to call it — but save_preferences writes to user meta which fails
		// in unit tests (no WordPress). Instead, test the sanitizer directly.
		$ref_sanitizer = new \ReflectionMethod( $service, 'sanitize_recent_pages' );
		$ref_sanitizer->setAccessible( true );

		$result = $ref_sanitizer->invoke( null, $input['recentPages'] );

		$this->assertCount( 2, $result );
		$this->assertSame( 'Page A', $result[0]['title'] );
		$this->assertSame( 1700000000, $result[0]['visitedAt'] );
		$this->assertSame( 'http://example.com/page-b', $result[1]['pageUrl'] );
		$this->assertSame( 1700000001, $result[1]['visitedAt'] );
	}

	/**
	 * Tests that validate_kpi_container_config clamps columns and sanitizes order.
	 */
	public function testValidateKpiContainerConfig(): void {
		$service = new ShellPreferencesService();

		$ref = new \ReflectionMethod( $service, 'validate_kpi_container_config' );
		$ref->setAccessible( true );

		// Valid config passes through.
		$result = $ref->invoke( null, array(
			'order'   => array( 'kpi-website', 'kpi-visitors' ),
			'columns' => 4,
		), '__default__' );
		$this->assertSame( array( 'kpi-website', 'kpi-visitors' ), $result['order'] );
		$this->assertSame( 4, $result['columns'] );

		// Invalid columns (99) clamped to 3.
		$result = $ref->invoke( null, array(
			'order'   => array( 'kpi-speed' ),
			'columns' => 99,
		), 'inst_1' );
		$this->assertSame( 3, $result['columns'] );

		// Missing columns defaults to 3.
		$result = $ref->invoke( null, array(
			'order' => array(),
		), 'inst_2' );
		$this->assertSame( 3, $result['columns'] );

		// Null columns defaults to 3.
		$result = $ref->invoke( null, array(
			'order'   => array(),
			'columns' => null,
		), 'inst_3' );
		$this->assertSame( 3, $result['columns'] );

		// String columns defaults to 3.
		$result = $ref->invoke( null, array(
			'order'   => array(),
			'columns' => 'hello',
		), 'inst_4' );
		$this->assertSame( 3, $result['columns'] );

		// Order sanitization: non-string scalars survive, nulls dropped.
		$result = $ref->invoke( null, array(
			'order'   => array( 'kpi-website', 42, null, 'kpi-speed' ),
			'columns' => 3,
		), '__default__' );
		$this->assertSame( array( 'kpi-website', '42', 'kpi-speed' ), $result['order'] );
	}
}
