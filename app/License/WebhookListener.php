<?php
/**
 * Receives and verifies signed license webhooks from the license server.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License;

use WP_Error;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

final class WebhookListener {
	private const MAX_CLOCK_SKEW    = 300;
	private const RATE_LIMIT_MAX    = 10;
	private const RATE_LIMIT_WINDOW = 300; // seconds (5 minutes).

	/** @var LicenseSettingsRepository */
	private LicenseSettingsRepository $settings_repository;

	/** @var LicenseManager */
	private LicenseManager $manager;

	public function __construct(
		?LicenseSettingsRepository $settings_repository = null,
		?LicenseManager $manager = null
	) {
		$this->settings_repository = $settings_repository ?? new LicenseSettingsRepository();
		$this->manager             = $manager ?? new LicenseManager( null, null, $this->settings_repository );
	}

	/**
	 * Returns the caller IP, honouring X-Forwarded-For only when the site
	 * explicitly declares a trusted proxy via WP_CUSTOM_DASHBOARD_TRUSTED_PROXY.
	 */
	private function get_caller_ip(): string {
		if (
			defined( 'WP_CUSTOM_DASHBOARD_TRUSTED_PROXY' ) &&
			WP_CUSTOM_DASHBOARD_TRUSTED_PROXY === sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ?? '' ) ) &&
			! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] )
		) {
			$forwarded = explode( ',', sanitize_text_field( wp_unslash( (string) $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) );
			return trim( $forwarded[0] );
		}

		return sanitize_text_field( wp_unslash( (string) ( $_SERVER['REMOTE_ADDR'] ?? '' ) ) );
	}

	/**
	 * Enforces a transient-based rate limit for the given IP.
	 *
	 * @return WP_Error|null WP_Error with status 429 when the limit is exceeded, null otherwise.
	 */
	private function check_rate_limit(): ?WP_Error {
		$ip  = $this->get_caller_ip();
		$key = 'wh_rl_' . md5( $ip );

		$attempts = (int) get_transient( $key );

		if ( $attempts >= self::RATE_LIMIT_MAX ) {
			return new WP_Error(
				'webhook_rate_limit_exceeded',
				'Too many requests. Please try again later.',
				array(
					'status'  => 429,
					'headers' => array( 'Retry-After' => (string) self::RATE_LIMIT_WINDOW ),
				)
			);
		}

		if ( 0 === $attempts ) {
			set_transient( $key, 1, self::RATE_LIMIT_WINDOW );
		} else {
			set_transient( $key, $attempts + 1, self::RATE_LIMIT_WINDOW );
		}

		return null;
	}

	/**
	 * Logs incoming webhook details for debugging.
	 *
	 * Writes to: wp-content/debug-license-webhook.log
	 */
	private function debug_log( WP_REST_Request $request ): void {
		$timestamp = gmdate( 'Y-m-d H:i:s T' );
		$source_ip = $this->get_caller_ip();
		$headers   = $request->get_headers();
		$body      = $request->get_body();

		$log  = "=== Webhook Received ===\n";
		$log .= "Timestamp: {$timestamp}\n";
		$log .= "Source IP: {$source_ip}\n";
		$log .= "--- REQUEST HEADERS ---\n";
		foreach ( $headers as $key => $values ) {
			foreach ( $values as $value ) {
				$log .= "{$key}: {$value}\n";
			}
		}
		$log .= "--- REQUEST BODY ---\n";
		$log .= ( is_string( $body ) ? $body : '(empty)' ) . "\n";
		$log .= "=== End Webhook ===\n\n";

		$log_file = WP_CONTENT_DIR . '/debug-license-webhook.log';
		file_put_contents( $log_file, $log, FILE_APPEND | LOCK_EX );
	}

	/**
	 * Processes a webhook request after verification succeeds.
	 *
	 * @param WP_REST_Request $request Incoming webhook request.
	 * @return array{status: string, event: string}|WP_Error
	 */
	public function handle( WP_REST_Request $request ) {
		$this->debug_log( $request );

		$rate_limit_error = $this->check_rate_limit();
		if ( null !== $rate_limit_error ) {
			return $rate_limit_error;
		}

		$stored_secret = $this->settings_repository->get_webhook_secret();
		$header_secret = strtolower( sanitize_text_field( (string) $request->get_header( 'X-Webhook-Secret' ) ) );

		if ( '' === $stored_secret || '' === $header_secret || ! hash_equals( $stored_secret, $header_secret ) ) {
			return new WP_Error(
				'invalid_webhook_secret',
				'Webhook secret is invalid.',
				array( 'status' => 403 )
			);
		}

		$payload = $request->get_json_params();

		if ( ! is_array( $payload ) ) {
			return new WP_Error(
				'invalid_webhook_payload',
				'Webhook payload must be a JSON object.',
				array( 'status' => 400 )
			);
		}

		$verification = $this->verify_signature( $payload );

		if ( is_wp_error( $verification ) ) {
			return $verification;
		}

		$timestamp = (int) $payload['timestamp'];

		if ( abs( time() - $timestamp ) > self::MAX_CLOCK_SKEW ) {
			return new WP_Error(
				'webhook_timestamp_expired',
				'Webhook timestamp is outside the accepted window.',
				array( 'status' => 401 )
			);
		}

		$result = $this->manager->apply_webhook_event(
			sanitize_text_field( (string) $payload['event'] ),
			isset( $payload['data'] ) && is_array( $payload['data'] ) ? $payload['data'] : array()
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return array(
			'status' => 'accepted',
			'event'  => sanitize_text_field( (string) $payload['event'] ),
		);
	}

	/**
	 * @param array<string, mixed> $payload Parsed JSON payload.
	 * @return true|WP_Error
	 */
	private function verify_signature( array $payload ) {
		$event      = isset( $payload['event'] ) ? sanitize_text_field( (string) $payload['event'] ) : '';
		$event_id   = isset( $payload['event_id'] ) ? sanitize_text_field( (string) $payload['event_id'] ) : '';
		$key_prefix = isset( $payload['license_key_prefix'] ) ? sanitize_text_field( (string) $payload['license_key_prefix'] ) : '';
		$signature  = isset( $payload['signature'] ) ? strtolower( sanitize_text_field( (string) $payload['signature'] ) ) : '';
		$timestamp  = isset( $payload['timestamp'] ) ? (string) $payload['timestamp'] : '';
		$data       = isset( $payload['data'] ) && is_array( $payload['data'] ) ? $payload['data'] : null;
		$body_hash  = isset( $payload['body_hash'] ) ? sanitize_text_field( (string) $payload['body_hash'] ) : '';

		if ( '' === $event || '' === $key_prefix || '' === $signature || '' === $timestamp || ! is_array( $data ) || '' === $body_hash ) {
			return new WP_Error(
				'invalid_webhook_payload',
				'Webhook payload is incomplete.',
				array( 'status' => 400 )
			);
		}

		$stored_prefix = $this->settings_repository->get_key_prefix();
		$license_key   = $this->settings_repository->get_license_key();

		if ( null === $stored_prefix || '' === $license_key || ! hash_equals( $stored_prefix, $key_prefix ) ) {
			return new WP_Error(
				'invalid_webhook_license',
				'Webhook license context does not match this site.',
				array( 'status' => 403 )
			);
		}

		// Canonical string uses body_hash (SHA-256 of raw JSON data) for deterministic
		// verification — matches the server-side WebhookDispatcher::build_body().
		// Backward-compat: if event_id absent (pre-M1 server), use old 4-field canonical.
		$canonical_fields = '' !== $event_id
			? array( $event, $event_id, $key_prefix, $timestamp, $body_hash )
			: array( $event, $key_prefix, $timestamp, $body_hash );

		$expected = hash_hmac(
			'sha256',
			implode( "\n", $canonical_fields ),
			// Derive purpose-scoped webhook key — matches WebhookDispatcher on the server.
			hash_hkdf( 'sha256', $license_key, 32, 'wplicense-webhook-dispatch-v1' )
		);

		if ( ! hash_equals( $expected, $signature ) ) {
			return new WP_Error(
				'invalid_webhook_signature',
				'Webhook signature mismatch.',
				array( 'status' => 401 )
			);
		}

		return true;
	}
}
