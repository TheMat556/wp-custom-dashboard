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
	private const LICENSE_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
	private const WEBHOOK_SECRET = 'abcdef0123456789';

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();

		$settings = new LicenseSettingsRepository();
		$settings->save_license_key( self::LICENSE_KEY );
		$settings->save_webhook_secret( self::WEBHOOK_SECRET );
	}

	public function test_valid_signature_is_accepted_and_starts_grace_for_expiry(): void {
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

	public function test_expired_timestamp_is_rejected(): void {
		$listener = new WebhookListener();
		$request  = $this->build_request( 'license.suspended', array(), time() - 900 );

		$response = $listener->handle( $request );

		$this->assertInstanceOf( WP_Error::class, $response );
		$this->assertSame( 'webhook_timestamp_expired', $response->get_error_code() );
	}

	/**
	 * @param array<string, mixed> $data Event data payload.
	 */
	private function build_request( string $event, array $data, ?int $timestamp = null ): WP_REST_Request {
		$timestamp = $timestamp ?? time();
		$prefix    = substr( self::LICENSE_KEY, 0, 8 );
		$data_json = wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );

		$request = new WP_REST_Request();
		$request->set_header( 'X-Webhook-Secret', self::WEBHOOK_SECRET );
		$request->set_json_params(
			array(
				'event'              => $event,
				'license_key_prefix' => $prefix,
				'timestamp'          => $timestamp,
				'data'               => $data,
				'signature'          => hash_hmac(
					'sha256',
					implode(
						"\n",
						array(
							$event,
							$prefix,
							(string) $timestamp,
							is_string( $data_json ) ? $data_json : '{}',
						)
					),
					self::LICENSE_KEY
				),
			)
		);

		return $request;
	}
}
