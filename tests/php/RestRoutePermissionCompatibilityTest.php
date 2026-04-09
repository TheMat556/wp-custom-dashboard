<?php
/**
 * Permission compatibility tests for extracted REST controllers.
 */

use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class RestRoutePermissionCompatibilityTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
		WP_React_UI_REST_API::register();
	}

	public function test_read_routes_still_require_read_capability(): void {
		global $wp_test_state;
		$wp_test_state['capabilities']['read'] = false;

		$this->assertFalse( $this->invoke_permission( 'wp-react-ui/v1/menu', 'GET' ) );
		$this->assertFalse( $this->invoke_permission( 'wp-react-ui/v1/menu-counts', 'GET' ) );
		$this->assertFalse( $this->invoke_permission( 'wp-react-ui/v1/dashboard', 'GET' ) );
	}

	public function test_logged_in_routes_still_require_authentication(): void {
		global $wp_test_state;
		$wp_test_state['is_user_logged_in'] = false;

		$this->assertFalse( $this->invoke_permission( 'wp-react-ui/v1/theme', 'GET' ) );
		$this->assertFalse( $this->invoke_permission( 'wp-react-ui/v1/theme', 'POST' ) );
		$this->assertFalse( $this->invoke_permission( 'wp-react-ui/v1/preferences', 'GET' ) );
		$this->assertFalse( $this->invoke_permission( 'wp-react-ui/v1/preferences', 'POST' ) );
	}

	public function test_manage_options_routes_still_require_manage_options_capability(): void {
		global $wp_test_state;
		$wp_test_state['capabilities']['manage_options'] = false;

		$this->assertFalse( $this->invoke_permission( 'wp-react-ui/v1/branding', 'GET' ) );
		$this->assertFalse( $this->invoke_permission( 'wp-react-ui/v1/branding', 'POST' ) );
		$this->assertFalse( $this->invoke_permission( 'wp-react-ui/v1/activity', 'GET' ) );
	}

	/**
	 * Invokes a route permission callback by path and method.
	 *
	 * @param string $route_key Registered route key.
	 * @param string $method HTTP method.
	 * @return bool
	 */
	private function invoke_permission( string $route_key, string $method ): bool {
		$routes   = wp_test_get_rest_routes();
		$route    = $routes[ $route_key ] ?? null;

		if ( null === $route ) {
			$this->fail( 'Route not registered: ' . $route_key );
		}

		$endpoint = $route['args'];

		if ( isset( $endpoint['permission_callback'] ) ) {
			return (bool) call_user_func( $endpoint['permission_callback'] );
		}

		foreach ( $endpoint as $candidate ) {
			if ( strtoupper( $candidate['methods'] ) === $method ) {
				return (bool) call_user_func( $candidate['permission_callback'] );
			}
		}

		$this->fail( 'Permission callback not found for route method: ' . $method );
	}
}
