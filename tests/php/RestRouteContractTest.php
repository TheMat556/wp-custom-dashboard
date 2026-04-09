<?php
/**
 * Compatibility tests for REST routes and DTO key shapes.
 */

use WpReactUi\Contracts\RestRouteContract;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/contracts/php/RestRouteContract.php';
require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class RestRouteContractTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();

		global $menu, $submenu;
		$menu    = array();
		$submenu = array();

		WP_React_UI_REST_API::register();
	}

	public function test_rest_route_names_are_unchanged(): void {
		$routes         = wp_test_get_rest_routes();
		$registered     = array();

		foreach ( $routes as $route ) {
			if ( $route['namespace'] === RestRouteContract::REST_NAMESPACE ) {
				$registered[] = $route['route'];
			}
		}

		sort( $registered );
		$expected = RestRouteContract::route_paths();
		sort( $expected );

		$this->assertSame( $expected, $registered );
	}

	public function test_lightweight_rest_response_shapes_are_unchanged(): void {
		$routes = wp_test_get_rest_routes();

		$this->assertSame(
			wp_test_sorted_keys( array_fill_keys( RestRouteContract::ROUTES['/menu']['responseKeys'], true ) ),
			wp_test_sorted_keys( $this->invoke_route( $routes['wp-react-ui/v1/menu'], 'GET' ) )
		);
		$this->assertSame(
			wp_test_sorted_keys( array_fill_keys( RestRouteContract::ROUTES['/theme']['responseKeys'], true ) ),
			wp_test_sorted_keys( $this->invoke_route( $routes['wp-react-ui/v1/theme'], 'GET' ) )
		);
		$this->assertSame(
			wp_test_sorted_keys( array_fill_keys( RestRouteContract::ROUTES['/branding']['responseKeys'], true ) ),
			wp_test_sorted_keys( $this->invoke_route( $routes['wp-react-ui/v1/branding'], 'GET' ) )
		);
		$this->assertSame(
			wp_test_sorted_keys( array_fill_keys( RestRouteContract::ROUTES['/preferences']['responseKeys'], true ) ),
			wp_test_sorted_keys( $this->invoke_route( $routes['wp-react-ui/v1/preferences'], 'GET' ) )
		);
		$this->assertSame(
			wp_test_sorted_keys( array_fill_keys( RestRouteContract::ROUTES['/menu-counts']['responseKeys'], true ) ),
			wp_test_sorted_keys( $this->invoke_route( $routes['wp-react-ui/v1/menu-counts'], 'GET' ) )
		);
		$this->assertSame(
			wp_test_sorted_keys( array_fill_keys( RestRouteContract::ROUTES['/dashboard']['responseKeys'], true ) ),
			wp_test_sorted_keys( $this->invoke_route( $routes['wp-react-ui/v1/dashboard'], 'GET' ) )
		);
		$this->assertSame(
			wp_test_sorted_keys( array_fill_keys( RestRouteContract::ROUTES['/activity']['responseKeys'], true ) ),
			wp_test_sorted_keys( $this->invoke_route( $routes['wp-react-ui/v1/activity'], 'GET' ) )
		);
	}

	/**
	 * Invokes the stored callback for a route endpoint by method.
	 *
	 * @param array  $route_definition Registered route definition.
	 * @param string $method HTTP method.
	 * @return array
	 */
	private function invoke_route( array $route_definition, string $method ): array {
		$endpoint = $route_definition['args'];

		if ( isset( $endpoint['methods'] ) ) {
			$callback = $endpoint['callback'];
			return $callback( new WP_REST_Request() );
		}

		foreach ( $endpoint as $candidate ) {
			if ( strtoupper( $candidate['methods'] ) === $method ) {
				$callback = $candidate['callback'];
				return $callback( new WP_REST_Request() );
			}
		}

		$this->fail( 'Route endpoint for method not found: ' . $method );
	}
}
