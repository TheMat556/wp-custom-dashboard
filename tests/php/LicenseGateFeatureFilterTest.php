<?php
/**
 * Pure PHP unit tests for LicenseGate feature filtering without WordPress bootstrap.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Tests\License;

use PHPUnit\Framework\TestCase;
use WpReactUi\License\Contracts\FeatureFilterInterface;

/**
 * Mock feature filter for testing.
 */
class MockFeatureFilter implements FeatureFilterInterface {
	/** @var array<string, callable> */
	private array $hooks = array();

	/**
	 * Register a filter callback.
	 *
	 * @param string   $hook Hook name.
	 * @param callable $callback Filter callback.
	 */
	public function registerFilter(string $hook, callable $callback): void {
		$this->hooks[ $hook ] = $callback;
	}

	public function filter(string $hook, array $features): array {
		if ( isset( $this->hooks[ $hook ] ) ) {
			return $this->hooks[ $hook ]( $features );
		}
		return $features;
	}
}

/**
 * Unit tests for LicenseGate feature filtering (no WordPress bootstrap).
 *
 * @requires function define
 */
final class LicenseGateFeatureFilterTest extends TestCase {
	private MockFeatureFilter $mock_filter;

	protected function setUp(): void {
		$this->mock_filter = new MockFeatureFilter();
	}

	public function test_filter_applies_hook(): void {
		$features = array( 'chat', 'activity', 'branding' );

		$this->mock_filter->registerFilter(
			'wp_react_ui_license_allowed_features',
			function( $f ) {
				// Remove 'branding' feature.
				return array_filter( $f, fn( $feature ) => 'branding' !== $feature );
			}
		);

		$result = $this->mock_filter->filter( 'wp_react_ui_license_allowed_features', $features );

		$this->assertSame( array( 'chat', 'activity' ), array_values( $result ) );
	}

	public function test_filter_adds_features(): void {
		$features = array( 'chat' );

		$this->mock_filter->registerFilter(
			'wp_react_ui_license_allowed_features',
			function( $f ) {
				$f[] = 'activity';
				$f[] = 'branding';
				return $f;
			}
		);

		$result = $this->mock_filter->filter( 'wp_react_ui_license_allowed_features', $features );

		$this->assertSame( array( 'chat', 'activity', 'branding' ), $result );
	}

	public function test_filter_returns_empty_array(): void {
		$features = array( 'chat', 'activity' );

		$this->mock_filter->registerFilter(
			'wp_react_ui_license_allowed_features',
			function() {
				return array(); // Remove all features.
			}
		);

		$result = $this->mock_filter->filter( 'wp_react_ui_license_allowed_features', $features );

		$this->assertSame( array(), $result );
	}

	public function test_filter_not_registered_returns_original(): void {
		$features = array( 'chat', 'activity' );

		$result = $this->mock_filter->filter( 'wp_react_ui_license_allowed_features', $features );

		// No filter registered, should return original.
		$this->assertSame( $features, $result );
	}

	public function test_multiple_features_filtering(): void {
		$features = array( 'chat', 'activity', 'branding', 'license-settings', 'dashboard-widgets' );

		$this->mock_filter->registerFilter(
			'wp_react_ui_license_allowed_features',
			function( $f ) {
				// Only keep 'chat' and 'activity'.
				return array_intersect( $f, array( 'chat', 'activity' ) );
			}
		);

		$result = $this->mock_filter->filter( 'wp_react_ui_license_allowed_features', $features );

		$this->assertSame( array( 'chat', 'activity' ), array_values( $result ) );
	}
}
