<?php
/**
 * Tests chat thread archive/delete controller actions.
 */

use WpReactUi\License\LicenseCache;
use WpReactUi\License\LicenseSettingsRepository;
use WpReactUi\Rest\Controllers\ChatConversationRouteController;
use WpReactUi\Rest\Services\ChatConversationService;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class ChatConversationRouteControllerTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
		$this->seed_active_license( array( 'chat' ) );
	}

	public function test_manage_options_capability_guards_archive_delete_and_unarchive_routes(): void {
		global $wp_test_state;
		$wp_test_state['capabilities']['manage_options'] = false;

		WP_React_UI_REST_API::register();

		$this->assertFalse( $this->invoke_permission( 'wp-react-ui/v1/chat/archive' ) );
		$this->assertFalse( $this->invoke_permission( 'wp-react-ui/v1/chat/delete' ) );
		$this->assertFalse( $this->invoke_permission( 'wp-react-ui/v1/chat/unarchive' ) );
	}

	public function test_archive_thread_forwards_selected_thread_id(): void {
		$expected = array(
			'role'                => 'owner',
			'threads'             => array(),
			'selectedThreadId'    => null,
			'messages'            => array(),
			'pollIntervalSeconds' => 30,
		);
		$service  = $this->createMock( ChatConversationService::class );
		$service->expects( $this->once() )
			->method( 'archive_thread' )
			->with( 42 )
			->willReturn( $expected );

		$controller = new ChatConversationRouteController( $service );
		$request    = new WP_REST_Request(
			array(
				'selectedThreadId' => 42,
			)
		);

		$this->assertSame( $expected, $controller->archive( $request ) );
	}

	public function test_delete_thread_forwards_selected_thread_id(): void {
		$expected = array(
			'role'                => 'owner',
			'threads'             => array(),
			'selectedThreadId'    => null,
			'messages'            => array(),
			'pollIntervalSeconds' => 30,
		);
		$service  = $this->createMock( ChatConversationService::class );
		$service->expects( $this->once() )
			->method( 'get_bootstrap_payload' )
			->with( 42 )
			->willReturn(
				array(
					'role' => 'owner',
				)
			);
		$service->expects( $this->once() )
			->method( 'delete_thread' )
			->with( 42 )
			->willReturn( $expected );

		$controller = new ChatConversationRouteController( $service );
		$request    = new WP_REST_Request(
			array(
				'selectedThreadId' => 42,
			)
		);

		$this->assertSame( $expected, $controller->delete_thread( $request ) );
	}

	public function test_delete_thread_requires_owner_role(): void {
		$service = $this->createMock( ChatConversationService::class );
		$service->expects( $this->once() )
			->method( 'get_bootstrap_payload' )
			->with( 42 )
			->willReturn(
				array(
					'role' => 'customer',
				)
			);
		$service->expects( $this->never() )
			->method( 'delete_thread' );

		$controller = new ChatConversationRouteController( $service );
		$request    = new WP_REST_Request(
			array(
				'selectedThreadId' => 42,
			)
		);

		$result = $controller->delete_thread( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'chat_delete_requires_owner', $result->get_error_code() );
	}

	public function test_unarchive_thread_forwards_selected_thread_id(): void {
		$expected = array(
			'role'                => 'owner',
			'threads'             => array(),
			'selectedThreadId'    => 42,
			'messages'            => array(),
			'pollIntervalSeconds' => 30,
		);
		$service  = $this->createMock( ChatConversationService::class );
		$service->expects( $this->once() )
			->method( 'unarchive_thread' )
			->with( 42 )
			->willReturn( $expected );

		$controller = new ChatConversationRouteController( $service );
		$request    = new WP_REST_Request(
			array(
				'selectedThreadId' => 42,
			)
		);

		$this->assertSame( $expected, $controller->unarchive( $request ) );
	}

	private function seed_active_license( array $features ): void {
		$settings = new LicenseSettingsRepository();
		$cache    = new LicenseCache();

		$settings->save_license_key( 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789' );
		$cache->set(
			array(
				'status'             => LicenseCache::STATUS_ACTIVE,
				'tier'               => 'agency',
				'expiresAt'          => gmdate( 'Y-m-d H:i:s', time() + DAY_IN_SECONDS ),
				'features'           => $features,
				'graceDaysRemaining' => 0,
				'keyPrefix'          => $settings->get_key_prefix(),
				'lastValidatedAt'    => gmdate( 'Y-m-d H:i:s' ),
			)
		);
	}

	private function invoke_permission( string $route_key ): bool {
		$routes = wp_test_get_rest_routes();
		$route  = $routes[ $route_key ] ?? null;

		if ( null === $route ) {
			$this->fail( 'Route not registered: ' . $route_key );
		}

		return (bool) call_user_func( $route['args']['permission_callback'] );
	}
}
