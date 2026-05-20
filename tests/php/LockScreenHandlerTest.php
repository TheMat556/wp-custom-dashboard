<?php
/**
 * Integration-style tests for LockScreenHandler.
 *
 * These tests register the REAL filter callback used by
 * LockScreenHandler::block_system_request() and dispatch realistic
 * WP_REST_Request instances through apply_filters(), exercising the
 * production decision logic instead of a hand-copied closure.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Tests;

use PHPUnit\Framework\TestCase;
use ReflectionClass;
use WpReactUi\License\LockScreenHandler;

class LockScreenHandlerTest extends TestCase {

	protected function setUp(): void {
		global $wp_test_state;
		$wp_test_state = array(
			'filters'           => array(),
			'actions'           => array(),
			'transients'        => array(),
			'options'           => array(),
			'capabilities'      => array(),
			'is_user_logged_in' => false,
		);

		// Make sure REST is considered the request context for these tests.
		if ( ! defined( 'REST_REQUEST' ) ) {
			define( 'REST_REQUEST', true );
		}
	}

	/**
	 * Invoke the private block_system_request() helper to register the
	 * real rest_pre_dispatch filter on $wp_test_state.
	 */
	private function register_real_filter(): void {
		$reflection = new ReflectionClass( LockScreenHandler::class );
		$method     = $reflection->getMethod( 'block_system_request' );
		$method->setAccessible( true );
		$method->invoke( null );
	}

	/**
	 * Build a real WP_REST_Request whose get_route() returns $route.
	 */
	private function request_for( string $route ): \WP_REST_Request {
		$request = new \WP_REST_Request();
		$request->set_route( $route );
		return $request;
	}

	public function test_webhook_route_passes_through_locked_filter(): void {
		$this->register_real_filter();

		$result = apply_filters(
			'rest_pre_dispatch',
			null,
			null,
			$this->request_for( '/license-server/v1/webhook' )
		);

		$this->assertNull( $result, 'Webhook route must not be blocked while locked.' );
	}

	public function test_license_routes_pass_through_locked_filter(): void {
		$this->register_real_filter();

		$result = apply_filters(
			'rest_pre_dispatch',
			null,
			null,
			$this->request_for( '/wp-react-ui/v1/license/status' )
		);

		$this->assertNull( $result, 'License REST routes must not be blocked while locked.' );
	}

	public function test_non_whitelisted_route_is_blocked_with_503(): void {
		$this->register_real_filter();

		$result = apply_filters(
			'rest_pre_dispatch',
			null,
			null,
			$this->request_for( '/wp/v2/posts' )
		);

		$this->assertInstanceOf( \WP_Error::class, $result );
		$this->assertSame( 'license_locked', $result->get_error_code() );
		$data = $result->get_error_data();
		$this->assertIsArray( $data );
		$this->assertSame( 503, $data['status'] ?? null );
	}

	public function test_webhook_prefix_match_does_not_overshare(): void {
		// A route whose path *starts with* "/license-server/v1/webhook" should
		// pass, but one that merely contains that substring elsewhere must not.
		$this->register_real_filter();

		$blocked = apply_filters(
			'rest_pre_dispatch',
			null,
			null,
			$this->request_for( '/evil/license-server/v1/webhook' )
		);

		$this->assertInstanceOf( \WP_Error::class, $blocked );
	}
}
