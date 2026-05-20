<?php
/**
 * Tests for secure incoming license webhooks.
 */

use WpReactUi\License\LicenseCache;
use WpReactUi\License\LicenseSettingsRepository;
use WpReactUi\License\WebhookListener;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class WebhookListenerTest extends TestCase {
	private const LICENSE_KEY    = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
	private const WEBHOOK_SECRET = 'abcdef0123456789';

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();

		$settings = new LicenseSettingsRepository();
		$settings->save_license_key( self::LICENSE_KEY );
		$settings->save_webhook_secret( self::WEBHOOK_SECRET );
		$settings->save_server_url( 'https://license.example.test' );

		// The integration-style tests don't resolve real DNS — opt out of
		// DNS pinning so the outbound call reaches our remote_post_handler.
		add_filter( 'wp_react_ui_license_skip_dns_pinning', '__return_true' );

		delete_transient( 'wh_rl_failed_' . md5( '127.0.0.1' ) );
		delete_transient( 'wh_rl_global' );
	}

	protected function tear_down(): void {
		parent::tear_down();
		delete_transient( 'wh_rl_failed_' . md5( '127.0.0.1' ) );
		delete_transient( 'wh_rl_global' );
	}

	public function test_valid_lock_webhook_is_accepted_and_caches_locked(): void {
		$listener = new WebhookListener();
		$request  = $this->build_request(
			'license.locked',
			array( 'pre_lock_status' => 'active' )
		);

		$response = $listener->handle( $request );

		$this->assertIsArray( $response );
		$this->assertSame( 'accepted', $response['status'] );
		$this->assertSame( 'license.locked', $response['event'] );

		$cached = ( new LicenseCache() )->get();
		$this->assertIsArray( $cached );
		$this->assertSame( 'locked', $cached['status'] );
	}

	public function test_valid_expired_webhook_starts_grace(): void {
		$listener = new WebhookListener();
		$request  = $this->build_request(
			'license.expired',
			array(
				'tier'                 => 'pro',
				'valid_until'          => '2020-01-01 00:00:00',
				'features'             => array( 'chat', 'dashboard' ),
				'grace_days_remaining' => 4,
			)
		);

		$response = $listener->handle( $request );

		$this->assertIsArray( $response );
		$this->assertSame( 'accepted', $response['status'] );

		$cached = ( new LicenseCache() )->get();
		$this->assertIsArray( $cached );
		$this->assertSame( 'expired', $cached['status'] );
		$this->assertSame( 4, $cached['graceDaysRemaining'] );
		$this->assertSame( array( 'chat', 'dashboard' ), $cached['features'] );
	}

	public function test_invalid_signature_is_rejected(): void {
		$listener = new WebhookListener();
		$request  = $this->build_request( 'license.cancelled', array() );
		$request->set_json_params(
			array_merge(
				$request->get_json_params(),
				array(
					'signature' => str_repeat( '0', 64 ),
				)
			)
		);

		$response = $listener->handle( $request );

		$this->assertInstanceOf( WP_Error::class, $response );
		$this->assertSame( 'invalid_webhook_signature', $response->get_error_code() );
	}

	public function test_body_hash_mismatch_is_rejected(): void {
		$listener = new WebhookListener();
		$request  = $this->build_request( 'license.suspended', array( 'reason' => 'foo' ) );

		// Tamper with the data without updating body_hash or signature.
		$params = $request->get_json_params();
		$params['data'] = array( 'reason' => 'bar' );
		$request->set_json_params( $params );

		$response = $listener->handle( $request );

		$this->assertInstanceOf( WP_Error::class, $response );
		$this->assertSame( 'invalid_webhook_body_hash', $response->get_error_code() );
	}

	public function test_expired_timestamp_is_rejected(): void {
		$listener = new WebhookListener();
		$request  = $this->build_request( 'license.suspended', array(), time() - 900 );

		$response = $listener->handle( $request );

		$this->assertInstanceOf( WP_Error::class, $response );
		$this->assertSame( 'webhook_timestamp_expired', $response->get_error_code() );
	}

	public function test_unrecognized_event_is_rejected(): void {
		$listener = new WebhookListener();
		$request  = $this->build_request( 'license.destroy', array() );

		$response = $listener->handle( $request );

		$this->assertInstanceOf( WP_Error::class, $response );
		$this->assertSame( 'webhook_event_not_allowed', $response->get_error_code() );
	}

	public function test_missing_event_id_is_rejected(): void {
		$listener = new WebhookListener();
		$params   = $this->build_payload( 'license.cancelled', array() );
		unset( $params['event_id'] );

		$request = new WP_REST_Request();
		$request->set_header( 'X-Webhook-Secret', self::WEBHOOK_SECRET );
		$request->set_json_params( $params );

		$response = $listener->handle( $request );

		$this->assertInstanceOf( WP_Error::class, $response );
		$this->assertSame( 'invalid_webhook_payload', $response->get_error_code() );
	}

	public function test_missing_webhook_secret_is_rejected(): void {
		$listener = new WebhookListener();

		$request = new WP_REST_Request();
		$request->set_json_params( array( 'event' => 'license.locked' ) );

		$response = $listener->handle( $request );

		$this->assertInstanceOf( WP_Error::class, $response );
		$this->assertSame( 'invalid_webhook_secret', $response->get_error_code() );
	}

	public function test_excessive_failed_auth_causes_rate_limit(): void {
		$listener = new WebhookListener();

		$request = new WP_REST_Request();
		$request->set_header( 'X-Webhook-Secret', 'wrong-secret' );
		$request->set_json_params( array( 'event' => 'license.locked' ) );

		for ( $i = 0; $i < 100; $i++ ) {
			$listener->handle( $request );
		}

		$response = $listener->handle( $request );

		$this->assertInstanceOf( WP_Error::class, $response );
		$this->assertSame( 'webhook_rate_limit_exceeded', $response->get_error_code() );
		$this->assertSame( 429, $response->get_error_data()['status'] ?? 0 );
	}

	public function test_legitimate_traffic_does_not_increment_rate_limit_bucket(): void {
		$listener = new WebhookListener();

		$valid = $this->build_request( 'license.cancelled', array() );
		$response = $listener->handle( $valid );
		$this->assertIsArray( $response );
		$this->assertSame( 'accepted', $response['status'] );

		$ip  = '127.0.0.1';
		$key = 'wh_rl_failed_' . md5( $ip );
		$this->assertSame( 0, (int) get_transient( $key ) );
	}

	public function test_global_rate_limit_backstop_blocks_on_excess(): void {
		$listener = new WebhookListener();

		// Prime the global counter past the threshold (RATE_LIMIT_MAX * 100 = 10000).
		set_transient( 'wh_rl_global', 10001, 300 );

		$request = new WP_REST_Request();
		$request->set_header( 'X-Webhook-Secret', 'wrong-secret' );
		$request->set_json_params( array( 'event' => 'license.locked' ) );

		$response = $listener->handle( $request );

		$this->assertInstanceOf( WP_Error::class, $response );
		$this->assertSame( 'webhook_global_rate_limit_exceeded', $response->get_error_code() );
		$this->assertSame( 429, $response->get_error_data()['status'] ?? 0 );
	}

	public function test_invalid_json_payload_is_rejected(): void {
		$listener = new WebhookListener();

		$request = new WP_REST_Request();
		$request->set_header( 'X-Webhook-Secret', self::WEBHOOK_SECRET );

		$response = $listener->handle( $request );

		$this->assertInstanceOf( WP_Error::class, $response );
	}

	public function test_unlock_webhook_clears_cache(): void {
		$listener = new WebhookListener();
		$request  = $this->build_request( 'license.locked', array( 'pre_lock_status' => 'active' ) );
		$listener->handle( $request );

		$cached = ( new LicenseCache() )->get();
		$this->assertSame( 'locked', $cached['status'] );

		// The unlock path now verifies with the license server before clearing
		// the cache (fail-closed). Stub the remote validate to return active.
		global $wp_test_state;
		$wp_test_state['remote_post_handler'] = static function () {
			return array(
				'response' => array( 'code' => 200 ),
				'body'     => wp_json_encode( array( 'status' => 'active' ) ),
			);
		};

		$unlock_request = $this->build_request( 'license.unlocked', array( 'restored_status' => 'active' ) );
		$response = $listener->handle( $unlock_request );

		$wp_test_state['remote_post_handler'] = null;

		$this->assertIsArray( $response );
		$this->assertSame( 'accepted', $response['status'] );

		$cached = ( new LicenseCache() )->get();
		$this->assertNull( $cached );
	}

	public function test_unlock_webhook_no_ops_when_server_still_locked(): void {
		$listener = new WebhookListener();
		$listener->handle(
			$this->build_request( 'license.locked', array( 'pre_lock_status' => 'active' ) )
		);

		// Server says STILL LOCKED — the unlock event must NOT clear the cache,
		// and must return 200 with a noop envelope rather than 409 (which would
		// trigger a retry storm).
		global $wp_test_state;
		$wp_test_state['remote_post_handler'] = static function () {
			return array(
				'response' => array( 'code' => 200 ),
				'body'     => wp_json_encode( array( 'status' => 'locked' ) ),
			);
		};

		$response = $listener->handle(
			$this->build_request( 'license.unlocked', array( 'restored_status' => 'active' ) )
		);
		$wp_test_state['remote_post_handler'] = null;

		$this->assertIsArray( $response, 'Still-locked unlock must return a 2xx envelope, not WP_Error.' );
		$this->assertSame( 'noop', $response['status'] ?? null );
		$this->assertSame( 'still_locked', $response['reason'] ?? null );

		$cached = ( new LicenseCache() )->get();
		$this->assertIsArray( $cached );
		$this->assertSame( 'locked', $cached['status'] );
	}

	/**
	 * @param array<string, mixed> $data Event data payload.
	 * @param string|null          $event_id Explicit event ID (auto-generated if null).
	 */
	private function build_request( string $event, array $data, ?int $timestamp = null, ?string $event_id = null ): WP_REST_Request {
		$payload  = $this->build_payload( $event, $data, $timestamp, $event_id );
		$request  = new WP_REST_Request();
		$request->set_header( 'X-Webhook-Secret', self::WEBHOOK_SECRET );
		$request->set_json_params( $payload );

		return $request;
	}

	/**
	 * Build a signed v1.4+ webhook payload (with event_id and body_hash).
	 *
	 * @param array<string, mixed> $data Event data payload.
	 */
	private function build_payload( string $event, array $data, ?int $timestamp = null, ?string $event_id = null ): array {
		$timestamp = $timestamp ?? time();
		$event_id  = $event_id ?? bin2hex( random_bytes( 16 ) );
		$prefix    = substr( self::LICENSE_KEY, 0, 8 );
		$data_json = wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		$body_hash = hash( 'sha256', is_string( $data_json ) ? $data_json : '{}' );

		$signing_key = hash_hkdf( 'sha256', self::LICENSE_KEY, 32, 'wplicense-webhook-dispatch-v1' );

		$signature = hash_hmac(
			'sha256',
			implode(
				"\n",
				array( $event, $event_id, $prefix, (string) $timestamp, $body_hash )
			),
			$signing_key
		);

		return array(
			'event'              => $event,
			'event_id'           => $event_id,
			'license_key_prefix' => $prefix,
			'timestamp'          => (string) $timestamp,
			'data'               => $data,
			'body_hash'          => $body_hash,
			'signature'          => $signature,
		);
	}
}
