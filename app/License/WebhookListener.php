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
	private const MAX_CLOCK_SKEW       = 300;
	private const RATE_LIMIT_MAX      = 100;
	private const RATE_LIMIT_WINDOW   = 300; // seconds (5 minutes).
	private const LOG_FILE_MAX_SIZE   = 10 * 1024 * 1024; // 10 MB.
	private const ALLOWED_EVENTS      = [ 'license.locked', 'license.unlocked', 'license.expired', 'license.suspended', 'license.cancelled' ];

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
	 *
	 * Supports multiple comma-separated trusted proxy IPs.
	 */
	private function get_caller_ip(): string {
		$remote_addr = sanitize_text_field( wp_unslash( (string) ( $_SERVER['REMOTE_ADDR'] ?? '' ) ) );

		if (
			defined( 'WP_CUSTOM_DASHBOARD_TRUSTED_PROXY' ) &&
			! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] )
		) {
			$trusted_proxies = array_map( 'trim', explode( ',', (string) WP_CUSTOM_DASHBOARD_TRUSTED_PROXY ) );

			if ( in_array( $remote_addr, $trusted_proxies, true ) ) {
				$forwarded = explode( ',', sanitize_text_field( wp_unslash( (string) $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) );
				$first_ip  = trim( $forwarded[0] );

				// Validate it looks like a real IP before trusting it.
				if ( false !== filter_var( $first_ip, FILTER_VALIDATE_IP ) ) {
					return $first_ip;
				}
			}
		}

		return $remote_addr;
	}

	/**
	 * Checks whether the caller has exceeded the failed-auth rate limit.
	 *
	 * Read-only check of the failed-auth bucket (does NOT increment).
	 * Called BEFORE secret verification, so garbage requests never reach
	 * hash_equals. A global backstop prevents total CPU exhaustion from
	 * distributed attackers cycling through IPs behind trusted proxies.
	 *
	 * @return WP_Error|null WP_Error with status 429 when the limit is exceeded, null otherwise.
	 */
	private function is_failed_auth_rate_limited(): ?WP_Error {
		$ip  = $this->get_caller_ip();
		$key = 'wh_rl_failed_' . md5( $ip );

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

		// Global backstop: cap total failed-auth attempts across all sources.
		$global = (int) get_transient( 'wh_rl_global' );
		if ( $global >= ( self::RATE_LIMIT_MAX * 100 ) ) {
			return new WP_Error(
				'webhook_global_rate_limit_exceeded',
				'Too many requests.',
				array(
					'status'  => 429,
					'headers' => array( 'Retry-After' => (string) self::RATE_LIMIT_WINDOW ),
				)
			);
		}

		return null;
	}

	/**
	 * Logs incoming webhook details for debugging.
	 *
	 * Only writes when WPLICENSE_WEBHOOK_DEBUG is defined and truthy.
	 * The X-Webhook-Secret header is redacted. Log rotates at 10 MB.
	 */
	private function debug_log( WP_REST_Request $request, $result = null ): void {
		if ( ! defined( 'WPLICENSE_WEBHOOK_DEBUG' ) || ! WPLICENSE_WEBHOOK_DEBUG ) {
			return;
		}

		$log_file = WP_CONTENT_DIR . '/debug-license-webhook.log';

		// Rotate if oversized.
		if ( file_exists( $log_file ) && filesize( $log_file ) > self::LOG_FILE_MAX_SIZE ) {
			$rotated = $log_file . '.1';
			// phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			@rename( $log_file, $rotated );
		}

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
				// Redact the webhook secret.
				if ( 'x_webhook_secret' === strtolower( str_replace( '-', '_', $key ) ) ) {
					$value = '(redacted)';
				}
				$log .= "{$key}: {$value}\n";
			}
		}
		$log .= "--- REQUEST BODY ---\n";
		// Redact the signature from the logged body.
		$logged_body = is_string( $body ) ? $body : '(empty)';
		if ( is_string( $logged_body ) && '' !== $logged_body ) {
			$decoded = json_decode( $logged_body, true );
			if ( is_array( $decoded ) && isset( $decoded['signature'] ) ) {
				$decoded['signature'] = '(redacted)';
				$logged_body = (string) wp_json_encode( $decoded );
			}
		}
		$log .= $logged_body . "\n";
		if ( null !== $result ) {
			if ( $result instanceof WP_Error ) {
				$log .= "--- RESULT: ERROR ---\n";
				$log .= "Code: " . $result->get_error_code() . "\n";
				$log .= "Message: " . $result->get_error_message() . "\n";
				$data = $result->get_error_data();
				if ( is_array( $data ) && isset( $data['status'] ) ) {
					$log .= "HTTP Status: " . $data['status'] . "\n";
				}
			} elseif ( is_array( $result ) ) {
				$log .= "--- RESULT: SUCCESS ---\n";
				$log .= "Status: " . ( $result['status'] ?? 'unknown' ) . "\n";
				$log .= "Event: " . ( $result['event'] ?? 'unknown' ) . "\n";
			}
		}

		$log .= "=== End Webhook ===\n\n";

		file_put_contents( $log_file, $log, FILE_APPEND | LOCK_EX );
	}

	/**
	 * Processes a webhook request after verification succeeds.
	 *
	 * Order of operations:
	 * 1. Check failed-auth rate limit (before any crypto work)
	 * 2. Secret + signature verification (authentication)
	 * 3. Event processing
	 *
	 * @param WP_REST_Request $request Incoming webhook request.
	 * @return array{status: string, event: string}|WP_Error
	 */
	public function handle( WP_REST_Request $request ) {
		// Check failed-auth rate limit BEFORE debug logging or any crypto work.
		// A flood of garbage secrets never fills the debug log or reaches hash_equals.
		$rate_limited = $this->is_failed_auth_rate_limited();
		if ( null !== $rate_limited ) {
			return $rate_limited;
		}

		$this->debug_log( $request );

		$stored_secret = $this->settings_repository->get_webhook_secret();
		$header_secret = strtolower( sanitize_text_field( (string) $request->get_header( 'X-Webhook-Secret' ) ) );

		if ( '' === $stored_secret || '' === $header_secret || ! hash_equals( $stored_secret, $header_secret ) ) {
			$error = new WP_Error(
				'invalid_webhook_secret',
				'Webhook secret is invalid.',
				array( 'status' => 403 )
			);
			$this->rate_limit_failed_auth();
			$this->debug_log( $request, $error );
			return $error;
		}

		$payload = $request->get_json_params();

		if ( ! is_array( $payload ) ) {
			$error = new WP_Error(
				'invalid_webhook_payload',
				'Webhook payload must be a JSON object.',
				array( 'status' => 400 )
			);
			$this->rate_limit_failed_auth();
			$this->debug_log( $request, $error );
			return $error;
		}

		$verification = $this->verify_signature( $payload );

		if ( is_wp_error( $verification ) ) {
			$this->rate_limit_failed_auth();
			$this->debug_log( $request, $verification );
			return $verification;
		}

		$timestamp = (int) $payload['timestamp'];

		if ( abs( time() - $timestamp ) > self::MAX_CLOCK_SKEW ) {
			$error = new WP_Error(
				'webhook_timestamp_expired',
				'Webhook timestamp is outside the accepted window.',
				array( 'status' => 401 )
			);
			$this->debug_log( $request, $error );
			return $error;
		}

		// Validate event against allowlist.
		$event = sanitize_text_field( (string) $payload['event'] );
		if ( ! in_array( $event, self::ALLOWED_EVENTS, true ) ) {
			$error = new WP_Error(
				'webhook_event_not_allowed',
				'Webhook event is not recognized.',
				array( 'status' => 400 )
			);
			$this->debug_log( $request, $error );
			return $error;
		}

		$result = $this->manager->apply_webhook_event(
			$event,
			isset( $payload['data'] ) && is_array( $payload['data'] ) ? $payload['data'] : array()
		);

		if ( is_wp_error( $result ) ) {
			$this->debug_log( $request, $result );
			return $result;
		}

		$response = array(
			'status' => 'accepted',
			'event'  => $event,
		);

		$this->debug_log( $request, $response );
		return $response;
	}

	/**
	 * Increments the rate-limit counter for failed authentication attempts.
	 * Does NOT apply to requests that passed auth — they are never rate-limited
	 * by this bucket. Also bumps a global backstop counter.
	 */
	private function rate_limit_failed_auth(): void {
		$ip  = $this->get_caller_ip();
		$key = 'wh_rl_failed_' . md5( $ip );
		$attempts = (int) get_transient( $key );

		if ( 0 === $attempts ) {
			set_transient( $key, 1, self::RATE_LIMIT_WINDOW );
		} else {
			set_transient( $key, $attempts + 1, self::RATE_LIMIT_WINDOW );
		}

		// Global backstop counter — limits total CPU burn from distributed sources.
		$global = (int) get_transient( 'wh_rl_global' );
		set_transient( 'wh_rl_global', $global + 1, self::RATE_LIMIT_WINDOW );
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

		if ( '' === $event || '' === $event_id || '' === $key_prefix || '' === $signature || '' === $timestamp || ! is_array( $data ) || '' === $body_hash ) {
			return new WP_Error(
				'invalid_webhook_payload',
				'Webhook payload is incomplete.',
				array( 'status' => 400 )
			);
		}
		// Verify body_hash against the actual data — prevents a mismatch
		// between what was signed and what gets processed. The server-side
		// receiver (WebhookReceiverController) performs the same check.
		$data_json = wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		if ( ! is_string( $data_json ) ) {
			return new WP_Error(
				'invalid_webhook_payload',
				'Webhook data could not be encoded.',
				array( 'status' => 400 )
			);
		}
		if ( ! hash_equals( hash( 'sha256', $data_json ), $body_hash ) ) {
			return new WP_Error(
				'invalid_webhook_body_hash',
				'Webhook body hash does not match the payload data.',
				array( 'status' => 401 )
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

		// Canonical string — event_id is REQUIRED (dropped backward-compat path
		// for pre-M1 servers that did not send event_id). Both ends of this
		// protocol are controlled; there is no third-party client.
		$expected = hash_hmac(
			'sha256',
			implode(
				"\n",
				array( $event, $event_id, $key_prefix, $timestamp, $body_hash )
			),
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
