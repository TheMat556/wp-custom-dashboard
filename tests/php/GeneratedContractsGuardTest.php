<?php
/**
 * Tests for auto-generated contract guards.
 *
 * Ensures all generated PHP files in app/Contracts/Generated/ have the
 * standard WordPress direct-access guard: defined('ABSPATH') || exit;
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace Tests\Unit\Contracts;

use PHPUnit\Framework\TestCase;

/**
 * @covers Nothing — assertion test for auto-generated files
 */
final class GeneratedContractsGuardTest extends TestCase {

	/**
	 * All generated PHP contract files must have the ABSPATH guard.
	 *
	 * @test
	 */
	public function test_all_generated_contracts_have_abspath_guard(): void {
		$contract_dir = dirname( __DIR__, 3 ) . '/app/Contracts/Generated/';

		$files = glob( $contract_dir . '*.php' );
		$this->assertNotEmpty( $files, 'No generated contract files found' );

		foreach ( $files as $file ) {
			$contents = file_get_contents( $file );
			$this->assertNotFalse( $contents, "Failed to read: {$file}" );

			$this->assertStringContainsString(
				"defined( 'ABSPATH' ) || exit;",
				$contents,
				basename( $file ) . ' is missing the ABSPATH guard'
			);

			// Guard must appear before namespace declaration
			$abspath_pos = strpos( $contents, "defined( 'ABSPATH' ) || exit;" );
			$namespace_pos = strpos( $contents, 'namespace' );

			$this->assertNotFalse( $abspath_pos, "ABSPATH guard not found in " . basename( $file ) );
			$this->assertNotFalse( $namespace_pos, "namespace declaration not found in " . basename( $file ) );
			$this->assertLessThan(
				$namespace_pos,
				$abspath_pos,
				basename( $file ) . ': ABSPATH guard must appear before namespace declaration'
			);
		}
	}
}
