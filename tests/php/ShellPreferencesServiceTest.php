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
	public function test_expand_legacy_keys_in_list( array $input, array $expected ): void {
		$service = new ShellPreferencesService();

		// Use reflection to access the private static method.
		$ref = new \ReflectionMethod( $service, 'expand_legacy_keys_in_list' );
		$ref->setAccessible( true );

		$result = $ref->invoke( null, $input );

		$this->assertSame( $expected, $result );
	}
}
