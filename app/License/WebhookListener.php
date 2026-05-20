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
	private const REPLAY_TTL           = 600; // 2 × clock skew.
	private const RATE_LIMIT_MAX      = 10;
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

		$log_dir  = WP_CONTENT_DIR . '/wp-react-ui-private';
		$log_file = $log_dir . '/debug-license-webhook.log';

		// Ensure the debug directory exists. Refuse to write logs at all if it
		// can't be created — never leak debug content into a world-readable dir.
		if ( ! is_dir( $log_dir ) && ! wp_mkdir_p( $log_dir ) ) {
			error_log( 'wp-react-ui: cannot create debug log dir ' . $log_dir );
			return;
		}

		// Always (re-)create access-denial files if missing. A deleted .htaccess
		// would otherwise silently expose the directory to the public.
		$deny_files = array(
			$log_dir . '/.htaccess'   => "Require all denied\n<Limit GET POST PUT DELETE HEAD>\nOrder allow,deny\nDeny from all\n</Limit>\n",
			$log_dir . '/index.php'   => "<?php // Silence is golden.\n",
			$log_dir . '/web.config'  => "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<configuration>\n  <system.webServer>\n    <authorization>\n      <deny users=\"*\" />\n    </authorization>\n  </system.webServer>\n</configuration>\n",
		);
		foreach ( $deny_files as $path => $contents ) {
			if ( ! file_exists( $path ) ) {
				// phpcs:ignore WordPressVIPMinimum.Files.IncludingFile.UsingVariable
				if ( false === file_put_contents( $path, $contents ) ) {
					error_log( 'wp-react-ui: failed to write deny file ' . $path );
					return;
				}
			}
		}

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
		$header_secret = sanitize_text_field( (string) $request->get_header( 'X-Webhook-Secret' ) );

		if ( '' === $stored_secret || '' === $header_secret || ! hash_equals( $stored_secret, $header_secret ) ) {
			$error = new WP_Error(
				'invalid_webhook_secret',
				__('Webhook secret is invalid.', 'wp-react-ui'),
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
				__('Webhook payload must be a JSON object.', 'wp-react-ui'),
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
				__('Webhook timestamp is outside the accepted window.', 'wp-react-ui'),
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
				__('Webhook event is not recognized.', 'wp-react-ui'),
				array( 'status' => 400 )
			);
			$this->debug_log( $request, $error );
			return $error;
		}

		// Replay protection: skip processing if this event_id was already
		// handled within the replay window (2 × clock skew).
		$event_id  = sanitize_text_field( (string) $payload['event_id'] );
		$dedup_key = 'wh_dedup_' . hash( 'sha256', $event_id );

		if ( ! $this->claim_replay_slot( $dedup_key ) ) {
			$this->debug_log( $request, $this->build_replay_response( $event, $event_id ) );
			return $this->build_replay_response( $event, $event_id );
		}

		$result = $this->manager->apply_webhook_event(
			$event,
			isset( $payload['data'] ) && is_array( $payload['data'] ) ? $payload['data'] : array()
		);

		if ( is_wp_error( $result ) ) {
			$this->debug_log( $request, $result );
			return $result;
		}

		// The manager may return a noop envelope (e.g. "still locked" on an
		// unlock webhook) that the sender must NOT retry. Forward it verbatim
		// so the sender sees 2xx + the explicit noop reason and stops.
		if ( is_array( $result ) && isset( $result['status'] ) && 'noop' === $result['status'] ) {
			$this->debug_log( $request, $result );
			return $result;
		}

		$response = array(
			'status' => 'accepted',
			'event'  => $event,
		);

		// Replay TTL was already set atomically by wp_cache_add() above; no
		// follow-up write is needed here.

		$this->debug_log( $request, $response );
		return $response;
	}

	/**
	 * Build a response indicating an event was already processed (replay).
	 *
	 * @param string $event    Event name.
	 * @param string $event_id Unique event identifier.
	 * @return array{status: string, event: string, event_id: string}
	 */
	private function build_replay_response( string $event, string $event_id ): array {
		return array(
			'status'   => 'accepted',
			'event'    => $event,
			'event_id' => $event_id,
		);
	}

	/**
	 * Atomically claim a replay-protection slot for the given dedup key.
	 *
	 * Prefers a persistent external object cache via `wp_cache_add`. When the
	 * site is not running a persistent object cache, `wp_cache_*` is purely
	 * per-request — useless for cross-request replay protection — so we fall
	 * back to a DB-backed primitive via `add_option`, whose `option_name`
	 * unique index gives us set-if-not-exists semantics. Stale rows are
	 * cleaned up opportunistically via a scheduled GC and on every claim.
	 *
	 * @param string $dedup_key Replay key (already hashed, prefixed).
	 * @return bool True if the slot was newly claimed (process the event).
	 */
	private function claim_replay_slot( string $dedup_key ): bool {
		if ( function_exists( 'wp_using_ext_object_cache' ) && wp_using_ext_object_cache() ) {
			return (bool) wp_cache_add( $dedup_key, 1, '', self::REPLAY_TTL );
		}

		// Fallback path: external object cache missing. Use wp_options as a
		// best-effort, set-if-not-exists store. Surface an admin notice so the
		// operator knows to install Redis/Memcached for production use.
		$this->maybe_warn_missing_object_cache();

		$option_name = 'wpru_wh_dedup_' . substr( $dedup_key, strlen( 'wh_dedup_' ) );
		$expires_at  = time() + self::REPLAY_TTL;

		// add_option() returns false if the option already exists. The
		// option_name column has a unique index, so this is race-safe.
		$claimed = add_option( $option_name, $expires_at, '', 'no' );

		if ( ! $claimed ) {
			// Existing claim — check whether it has expired and reclaim if so.
			$existing = (int) get_option( $option_name, 0 );
			if ( $existing > 0 && $existing < time() ) {
				delete_option( $option_name );
				return (bool) add_option( $option_name, $expires_at, '', 'no' );
			}
			return false;
		}

		return true;
	}

	/**
	 * Emit an admin-notice once when running webhook replay protection
	 * without a persistent object cache.
	 */
	private function maybe_warn_missing_object_cache(): void {
		if ( get_transient( 'wpru_wh_no_obj_cache_warned' ) ) {
			return;
		}
		set_transient( 'wpru_wh_no_obj_cache_warned', 1, DAY_IN_SECONDS );

		add_action(
			'admin_notices',
			static function (): void {
				if ( ! current_user_can( 'manage_options' ) ) {
					return;
				}
				echo '<div class="notice notice-warning"><p>';
				echo esc_html__( 'WP React UI: No persistent object cache detected. License webhook replay protection is using a slower DB fallback. Install Redis or Memcached for production.', 'wp-react-ui' );
				echo '</p></div>';
			}
		);
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
				__( 'Webhook payload is incomplete.', 'wp-react-ui' ),
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
