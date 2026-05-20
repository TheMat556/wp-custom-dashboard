<?php
/**
 * Integration tests for webhook replay protection.
 *
 * Drives the real WebhookListener with two identical signed payloads
 * and verifies that the second is treated as a replay (returns the
 * replay envelope with the original event_id) and produces no
 * additional state transition on the LicenseCache.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

use WpReactUi\License\LicenseCache;
use WpReactUi\License\LicenseSettingsRepository;
use WpReactUi\License\WebhookListener;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class WebhookReplayTest extends TestCase {
	public const LICENSE_KEY    = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
	private const WEBHOOK_SECRET = 'abcdef0123456789';

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();

		$settings = new LicenseSettingsRepository();
		$settings->save_license_key( self::LICENSE_KEY );
		$settings->save_webhook_secret( self::WEBHOOK_SECRET );

		// Flush per-request cache so replay state is clean between tests.
		if ( function_exists( 'wp_cache_flush' ) ) {
			wp_cache_flush();
		}

		delete_transient( 'wh_rl_failed_' . md5( '127.0.0.1' ) );
		delete_transient( 'wh_rl_global' );
	}

	protected function tear_down(): void {
		parent::tear_down();
		delete_transient( 'wh_rl_failed_' . md5( '127.0.0.1' ) );
		delete_transient( 'wh_rl_global' );
	}

	/**
	 * A duplicate event_id within the replay window must produce a replay
	 * envelope on the second delivery, NOT a fresh "accepted" response,
	 * and must not re-run the underlying state transition.
	 */
	public function test_duplicate_event_id_returns_replay_envelope(): void {
		$listener = new WebhookListener();

		$event_id = bin2hex( random_bytes( 16 ) );
		$first    = $listener->handle(
			$this->build_request( 'license.locked', array( 'pre_lock_status' => 'active' ), null, $event_id )
		);
		$cache_after_first = ( new LicenseCache() )->get();

		$second = $listener->handle(
			$this->build_request( 'license.locked', array( 'pre_lock_status' => 'active' ), null, $event_id )
		);
		$cache_after_second = ( new LicenseCache() )->get();

		$this->assertIsArray( $first );
		$this->assertSame( 'accepted', $first['status'] );
		$this->assertSame( 'license.locked', $first['event'] );
		$this->assertArrayNotHasKey( 'event_id', $first, 'First delivery returns the regular accepted envelope.' );

		$this->assertIsArray( $second );
		$this->assertSame( 'accepted', $second['status'], 'Replay must still 2xx so the sender does not retry.' );
		$this->assertSame( 'license.locked', $second['event'] );
		$this->assertSame( $event_id, $second['event_id'] ?? null, 'Replay envelope carries the original event_id.' );

		$this->assertSame(
			$cache_after_first,
			$cache_after_second,
			'Replay must not modify the LicenseCache state.'
		);
	}

	/**
	 * Different event_ids must both be processed normally and both result
	 * in the regular accepted envelope.
	 */
	public function test_different_event_ids_are_each_processed(): void {
		$listener = new WebhookListener();

		$first  = $listener->handle(
			$this->build_request( 'license.locked', array( 'pre_lock_status' => 'active' ), null, bin2hex( random_bytes( 16 ) ) )
		);
		$second = $listener->handle(
			$this->build_request( 'license.locked', array( 'pre_lock_status' => 'active' ), null, bin2hex( random_bytes( 16 ) ) )
		);

		$this->assertIsArray( $first );
		$this->assertSame( 'accepted', $first['status'] );
		$this->assertArrayNotHasKey( 'event_id', $first );

		$this->assertIsArray( $second );
		$this->assertSame( 'accepted', $second['status'] );
		$this->assertArrayNotHasKey( 'event_id', $second, 'Second delivery with a fresh event_id is not a replay.' );
	}

	private function build_request( string $event, array $data, ?int $timestamp = null, ?string $event_id = null ): WP_REST_Request {
		$payload = $this->build_payload( $event, $data, $timestamp, $event_id );
		$request = new WP_REST_Request();
		$request->set_header( 'X-Webhook-Secret', self::WEBHOOK_SECRET );
		$request->set_json_params( $payload );
		return $request;
	}

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
