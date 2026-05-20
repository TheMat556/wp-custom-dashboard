<?php
/**
 * Outbound client for the license server API.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License;

use WP_Error;

defined( 'ABSPATH' ) || exit;

final class LicenseClient {
	private const ROUTE_NAMESPACE = '/license-server/v1';

	/**
	 * @var callable
	 */
	private $remote_post;

	private LicenseSettingsRepository $settings_repository;

	/**
	 * @param callable|null                  $remote_post         Optional transport override for tests.
	 * @param LicenseSettingsRepository|null $settings_repository Optional settings repository override.
	 */
	public function __construct( ?callable $remote_post = null, ?LicenseSettingsRepository $settings_repository = null ) {
		$this->remote_post         = $remote_post ?? 'wp_remote_post';
		$this->settings_repository = $settings_repository ?? new LicenseSettingsRepository();
	}

	/**
	 * Activates a license against the remote server.
	 *
	 * @param string $license_key License key to activate.
	 * @return array<string, mixed>|WP_Error
	 */
	public function activate( string $license_key ) {
		return $this->send_signed_request( 'activate', $license_key );
	}

	/**
	 * Validates a license against the remote server.
	 *
	 * @param string $license_key License key to validate.
	 * @return array<string, mixed>|WP_Error
	 */
	public function validate( string $license_key ) {
		return $this->send_signed_request( 'validate', $license_key );
	}

	/**
	 * Deactivates a license against the remote server.
	 *
	 * @param string $license_key License key to deactivate.
	 * @return array<string, mixed>|WP_Error
	 */
	public function deactivate( string $license_key ) {
		return $this->send_signed_request( 'deactivate', $license_key );
	}

	/**
	 * Sends a signed request to the remote license server.
	 *
	 * @param string $action      Remote action name.
	 * @param string $license_key License key used for signing.
	 * @return array<string, mixed>|WP_Error
	 */
	private function send_signed_request( string $action, string $license_key ) {
		$normalized_key = $this->sanitize_license_key( $license_key );

		if ( ! preg_match( '/^[a-f0-9]{64}$/', $normalized_key ) ) {
			return new WP_Error(
				'license_invalid_key',
				'Enter a valid license key.',
				array(
					'status' => 400,
				)
			);
		}

		$server_url = $this->settings_repository->get_server_url();
		if ( '' === $server_url ) {
			return new WP_Error(
				'license_server_not_configured',
				'License server URL is not configured. Please save a server URL in the License settings.',
				array(
					'status' => 400,
				)
			);
		}

		if ( ! $this->is_secure_server_url( $server_url ) ) {
			return new WP_Error(
				'license_server_insecure_url',
				'License server URL must use HTTPS outside local development.',
				array(
					'status' => 400,
				)
			);
		}

		$route_path = self::ROUTE_NAMESPACE . '/' . sanitize_key( $action );
		$url        = $this->build_remote_rest_url( $server_url, $route_path );
		$key_prefix = substr( $normalized_key, 0, 8 );
		$domain     = $this->resolve_domain();

		$this->emit_debug(
			'request_started',
			array(
				'action'    => $action,
				'keyPrefix' => $key_prefix,
				'domain'    => $domain,
			)
		);

		$body      = array(
			'plugin_version' => $this->get_plugin_version(),
			'wp_version'     => get_bloginfo( 'version' ),
			'php_version'    => PHP_VERSION,
		);
		$json_body = wp_json_encode( $body );

		if ( ! is_string( $json_body ) ) {
			return new WP_Error(
				'license_encode_failed',
				'Unable to encode the license request payload.',
				array(
					'status' => 500,
				)
			);
		}

		$signing_key   = hash_hkdf( 'sha256', $normalized_key, 32, 'wplicense-hmac-signing-v1' );
		$timeout       = (int) apply_filters( 'wp_react_ui_license_http_timeout', 10 );
		$retries       = max( 0, (int) apply_filters( 'wp_react_ui_license_http_retries', 1 ) );
		$attempts      = $retries + 1;
		$last_response = null;

		// Register the license server host as external so WordPress HTTP API
		// allows the outbound request even when the host resolves to a private
		// IP. The host is set by an administrator (manage_options gate).
		$server_host = wp_parse_url( $server_url, PHP_URL_HOST );
		$server_host = is_string( $server_host ) ? strtolower( rtrim( $server_host, '.' ) ) : null;

		// Resolve the server host ONCE up front and pin the IP via cURL.
		// This kills DNS-rebinding: a malicious authoritative nameserver
		// returning a public IP at validation time and a private IP at
		// request time cannot redirect us.
		$pinned_ips = ( null !== $server_host ) ? $this->resolve_pinned_ips( $server_host ) : array();

		/**
		 * Filters whether to skip DNS pinning for the license server request.
		 *
		 * Returning true skips the resolution-failed bail-out. Intended for
		 * local development and tests where DNS may not be resolvable. Leave
		 * this false in production — it is the load-bearing defence against
		 * DNS rebinding.
		 *
		 * @param bool   $skip        Whether to skip DNS pinning. Default false.
		 * @param string $server_host Configured server host.
		 */
		$skip_pinning = (bool) apply_filters(
			'wp_react_ui_license_skip_dns_pinning',
			false,
			(string) $server_host
		);

		if ( null !== $server_host && empty( $pinned_ips ) && ! $skip_pinning ) {
			return new WP_Error(
				'license_dns_resolution_failed',
				'Could not resolve the license server host to a public IP address.',
				array(
					'status'   => 503,
					'endpoint' => $action,
				)
			);
		}

		$allow_host = static fn( bool $external, string $host ): bool
			=> self::should_allow_host( $external, $host, $server_host, $pinned_ips, $skip_pinning );

		// Pin the resolved IP(s) into cURL via CURLOPT_RESOLVE so the underlying
		// transport never re-resolves the host between our check and the request.
		$server_port = (int) ( wp_parse_url( $server_url, PHP_URL_PORT ) ?: ( 'https' === strtolower( (string) wp_parse_url( $server_url, PHP_URL_SCHEME ) ) ? 443 : 80 ) );
		$curl_pin    = function ( $handle ) use ( $server_host, $pinned_ips, $server_port ): void {
			if ( null === $server_host || empty( $pinned_ips ) || ! is_resource( $handle ) && ! ( $handle instanceof \CurlHandle ) ) {
				return;
			}
			$resolve = array();
			foreach ( $pinned_ips as $ip ) {
				$resolve[] = $server_host . ':' . $server_port . ':' . $ip;
			}
			if ( defined( 'CURLOPT_RESOLVE' ) ) {
				// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_setopt
				curl_setopt( $handle, CURLOPT_RESOLVE, $resolve );
			}
		};

		for ( $attempt = 1; $attempt <= $attempts; $attempt++ ) {
			// Regenerate nonce and timestamp per attempt so retries are not rejected as replays.
			$timestamp = (string) time();
			$nonce     = bin2hex( random_bytes( 16 ) ); // 128-bit replay-prevention nonce

			$signature = hash_hmac(
				'sha256',
				implode(
					"\n",
					array(
						'POST',
						$nonce,
						$route_path,
						$domain,
						$timestamp,
						$json_body,
					)
				),
				// Derive a purpose-scoped signing key — the raw license key is never sent or used as an HMAC secret.
				$signing_key
			);

			$args = array(
				'timeout'     => $timeout,
				'headers'     => array(
					'Content-Type'        => 'application/json',
					'X-License-Key-Id'    => $key_prefix,
					'X-License-Signature' => $signature,
					'X-License-Timestamp' => $timestamp,
					'X-License-Domain'    => $domain,
					'X-Request-Nonce'     => $nonce,
				),
				'body'        => $json_body,
				'data_format' => 'body',
			);

			try {
				add_filter( 'http_request_host_is_external', $allow_host, 10, 2 );
				add_action( 'http_api_curl', $curl_pin, 10, 1 );
				$last_response = call_user_func( $this->remote_post, $url, $args );
			} finally {
				remove_filter( 'http_request_host_is_external', $allow_host, 10 );
				remove_action( 'http_api_curl', $curl_pin, 10 );
			}

			if ( is_wp_error( $last_response ) ) {
				$this->emit_debug(
					'remote_error',
					array(
						'action'    => $action,
						'keyPrefix' => $key_prefix,
						'attempt'   => $attempt,
						'message'   => $last_response->get_error_message(),
					)
				);

				if ( $attempt < $attempts ) {
					continue;
				}

				return new WP_Error(
					'license_request_failed',
					'Could not reach the license server.',
					array(
						'status'    => 503,
						'endpoint'  => $action,
						'keyPrefix' => $key_prefix,
					)
				);
			}

			$status_code = wp_remote_retrieve_response_code( $last_response );

			if ( $status_code >= 500 && $attempt < $attempts ) {
				continue;
			}

			return $this->parse_response( $last_response, $action, $key_prefix );
		}

		return new WP_Error(
			'license_request_failed',
			'Could not reach the license server.',
			array(
				'status'    => 503,
				'endpoint'  => $action,
				'keyPrefix' => $key_prefix,
			)
		);
	}

	/**
	 * Builds a rewrite-independent REST URL for the remote WordPress site.
	 *
	 * Query-based rest_route works even when pretty /wp-json rewrites are not
	 * available or when the site uses index.php permalinks.
	 *
	 * @param string $server_url Base license server site URL.
	 * @param string $route_path Route path beginning with /license-server/...
	 * @return string
	 */
	private function build_remote_rest_url( string $server_url, string $route_path ): string {
		$parts = wp_parse_url( $server_url );

		if ( ! is_array( $parts ) || empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
			$base_url = trailingslashit( $server_url );

			if ( ! preg_match( '#/index\.php/?$#', $base_url ) ) {
				$base_url .= 'index.php';
			} else {
				$base_url = untrailingslashit( $base_url );
			}

			return $base_url . '?rest_route=' . rawurlencode( $route_path );
		}

		$origin = strtolower( (string) $parts['scheme'] ) . '://' . $parts['host'];
		if ( isset( $parts['port'] ) ) {
			$origin .= ':' . (int) $parts['port'];
		}

		$path = isset( $parts['path'] ) ? '/' . ltrim( (string) $parts['path'], '/' ) : '';
		$path = '/' === $path ? '' : untrailingslashit( $path );

		if ( ! preg_match( '#/index\.php$#', $path ) ) {
			$path .= '/index.php';
		}

		return $origin . $path . '?rest_route=' . rawurlencode( $route_path );
	}

	/**
	 * Parses an HTTP response into a structured payload or WP_Error.
	 *
	 * @param array<string, mixed> $response Response array.
	 * @param string               $action   Remote action name.
	 * @param string               $key_prefix License key prefix sent to the server.
	 * @return array<string, mixed>|WP_Error
	 */
	private function parse_response( array $response, string $action, string $key_prefix ) {
		$status_code = wp_remote_retrieve_response_code( $response );
		$raw_body    = wp_remote_retrieve_body( $response );
		$decoded     = json_decode( is_string( $raw_body ) ? $raw_body : '', true );

		if ( $status_code >= 200 && $status_code < 300 ) {
			if ( ! is_array( $decoded ) ) {
				return new WP_Error(
					'license_invalid_response',
					'The license server returned an invalid response.',
					array(
						'status'    => 502,
						'endpoint'  => $action,
						'keyPrefix' => $key_prefix,
					)
				);
			}

			return $decoded;
		}

		$error_code = is_array( $decoded ) && isset( $decoded['code'] ) ? sanitize_key( (string) $decoded['code'] ) : 'license_api_error';
		$message    = is_array( $decoded ) && isset( $decoded['message'] ) ? sanitize_text_field( (string) $decoded['message'] ) : 'The license server rejected the request.';
		$data       = is_array( $decoded ) && isset( $decoded['data'] ) && is_array( $decoded['data'] ) ? $decoded['data'] : array();

		$this->emit_debug(
			'remote_response',
			array(
				'action'    => $action,
				'keyPrefix' => $key_prefix,
				'status'    => $status_code,
				'code'      => $error_code,
				'message'   => $message,
				'rawBody'   => $raw_body,
			)
		);

		// Remap 401/403 from the remote server to 422 — the shell treats
		// 401/403 on plugin REST endpoints as a WordPress session expiry,
		// which would show a false "session expired" overlay to the user.
		$data['status']    = in_array( $status_code, array( 401, 403 ), true ) ? 422 : $status_code;
		$data['endpoint']  = $action;
		$data['keyPrefix'] = $key_prefix;

		$this->emit_debug(
			'remote_rejected',
			array(
				'action'    => $action,
				'keyPrefix' => $key_prefix,
				'status'    => $status_code,
				'code'      => $error_code,
			)
		);

		return new WP_Error( $error_code, $message, $data );
	}

	/**
	 * Returns the current site host used as the license domain.
	 */
	private function resolve_domain(): string {
		$host = wp_parse_url( home_url( '/' ), PHP_URL_HOST );
		$host = is_string( $host ) ? strtolower( $host ) : '';
		$host = sanitize_text_field( $host );

		/**
		 * Filters the domain sent to the remote license server.
		 *
		 * @param string $host Current detected host.
		 */
		return (string) apply_filters( 'wp_react_ui_license_domain', $host );
	}

	/**
	 * Returns the current plugin version.
	 */
	private function get_plugin_version(): string {
		if ( ! function_exists( 'get_plugin_data' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$plugin_data = get_plugin_data( dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php', false, false );

		return isset( $plugin_data['Version'] ) ? sanitize_text_field( (string) $plugin_data['Version'] ) : '0.0.0';
	}

	/**
	 * Returns whether the configured server URL uses a secure transport.
	 *
	 * @param string $server_url Configured license server URL.
	 */
	private function is_secure_server_url( string $server_url ): bool {
		$scheme = wp_parse_url( $server_url, PHP_URL_SCHEME );
		$host   = wp_parse_url( $server_url, PHP_URL_HOST );

		if ( is_string( $scheme ) && 'https' === strtolower( $scheme ) ) {
			return true;
		}

		if ( ! is_string( $host ) ) {
			return false;
		}

		$host = strtolower( $host );

		// localhost and *.test / *.local development hosts are allowed with
		// plain HTTP. 127.0.0.1 and [::1] are not listed here because they
		// are blocked at save time by validate_uri_structure's IP rejection.
		return in_array( $host, array( 'localhost' ), true )
			|| str_ends_with( $host, '.test' )
			|| str_ends_with( $host, '.local' );
	}

	/**
	 * Resolve the license server hostname to a list of public IP addresses.
	 *
	 * Returns an empty array on any failure (resolution error, no records,
	 * or any record resolving to a non-public IP). Callers must treat an
	 * empty return as a hard failure — never fall through to allow the
	 * request.
	 *
	 * @param string $host Lowercased, trailing-dot-stripped host.
	 * @return array<int, string> List of pinned public IPs (A + AAAA).
	 */
	private function resolve_pinned_ips( string $host ): array {
		if ( ! function_exists( 'dns_get_record' ) ) {
			return array();
		}

		// Suppress the previous_error reporting handler — dns_get_record
		// emits warnings on lookup failure that we want to convert into a
		// boolean failure path instead.
		set_error_handler( static function (): bool {
			return true;
		} );
		try {
			$records = dns_get_record( $host, DNS_A + DNS_AAAA );
		} finally {
			restore_error_handler();
		}

		if ( ! is_array( $records ) || empty( $records ) ) {
			return array();
		}

		$ips = array();
		foreach ( $records as $record ) {
			$ip = (string) ( $record['ip'] ?? $record['ipv6'] ?? '' );
			if ( '' === $ip ) {
				continue;
			}
			// Deny if ANY record points to a non-public IP. This kills
			// DNS rebinding where the attacker returns one public + one
			// private address and hopes cURL picks the private one.
			if ( ! self::is_public_ip( $ip ) ) {
				return array();
			}
			$ips[] = $ip;
		}

		return $ips;
	}

	/**
	 * Determines whether a host should be treated as external for HTTP requests.
	 *
	 * If the host matches the configured license server host AND is not an IP
	 * literal (in any form), it is allowed. All IP literals are rejected even
	 * on match as defense-in-depth against save-time validation bypass.
	 *
	 * @internal Public only for testability. Do not call from outside the class.
	 *
	 * @param bool                $external    Current WordPress external-host state.
	 * @param string              $host        The host being checked.
	 * @param string|null         $server_host Configured license server host (lowercased,
	 *                                         trailing dots stripped), or null.
	 * @param array<int, string>  $pinned_ips  Pre-resolved public IPs for $server_host.
	 *                                         Empty array means resolution failed.
	 * @return bool True if the host should be considered external.
	 */
	public static function should_allow_host( bool $external, string $host, ?string $server_host, array $pinned_ips = array(), bool $skip_pinning = false ): bool {
		$normalized = strtolower( rtrim( $host, '.' ) );

		// Strip brackets for IPv6 detection — filter_var rejects bracketed literals.
		$ip_check = str_starts_with( $normalized, '[' ) && str_ends_with( $normalized, ']' )
			? substr( $normalized, 1, -1 )
			: $normalized;
		// Strip IPv6 zone-id (e.g. ::1%eth0) — filter_var rejects scoped addresses.
		$zone_pos = strpos( $ip_check, '%' );
		if ( false !== $zone_pos ) {
			$ip_check = substr( $ip_check, 0, $zone_pos );
		}

		// Defense-in-depth: always block cloud metadata hostnames and IPs,
		// regardless of whether they match the configured server. These are
		// well-known SSRF targets on AWS/GCP/Azure/Alibaba/DigitalOcean.
		$metadata_hosts = array(
			'metadata.google.internal',
			'metadata.aws.internal',
			'metadata.azure.com',
			'metadata',
		);
		if ( in_array( $normalized, $metadata_hosts, true ) ) {
			return false;
		}
		// Cloud metadata IPs: 169.254.169.254 (AWS/GCP/Azure/DO link-local) and
		// 100.100.100.200 (Alibaba). Also blocks any 169.254/16 link-local addr.
		if ( filter_var( $ip_check, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 ) ) {
			if ( preg_match( '/^169\.254\./', $ip_check ) ) {
				return false;
			}
			if ( '100.100.100.200' === $ip_check ) {
				return false;
			}
		}

		// If the host matches the configured server and we have pre-resolved,
		// public IPs already pinned, accept. Otherwise deny — we never want
		// to fall through to a runtime DNS lookup that might rebind. The
		// $skip_pinning escape hatch is for local development and tests where
		// DNS may not be resolvable; production code paths never set it.
		if ( null !== $server_host && $server_host === $normalized ) {
			if ( empty( $pinned_ips ) && ! $skip_pinning ) {
				return false;
			}
		}

		if ( null !== $server_host && $server_host === $normalized ) {
			// Block IP literals even if they match the configured host.
			// These checks mirror validate_uri_structure for defense-in-depth.
			// 2–4 octet numeric forms (short-form IPv4 like 127.1 = 127.0.0.1).
			if ( preg_match( '/^[0-9]+(\.[0-9]+){1,3}$/', $ip_check ) ) {
				return false;
			}
			// Standard IP literals (filter_var catches dotted-quad and standard IPv6).
			if ( filter_var( $ip_check, FILTER_VALIDATE_IP ) ) {
				return false;
			}
			// Integer-form IPv4 (2130706433 = 127.0.0.1).
			if ( ctype_digit( $ip_check ) ) {
				return false;
			}
			// Hex-form IPv4 (0x7f000001).
			if ( preg_match( '/^0x[0-9a-f]+$/i', $ip_check ) ) {
				return false;
			}
			return true;
		}
		return $external;
	}

	/**
	 * Normalizes a license key for signing.
	 *
	 * @param string $license_key Raw license key input.
	 */
	private function sanitize_license_key( string $license_key ): string {
		$normalized = preg_replace( '/[^a-f0-9]/i', '', strtolower( sanitize_text_field( $license_key ) ) );

		return is_string( $normalized ) ? $normalized : '';
	}

	/**
	 * Emits a debug action without exposing the full license key.
	 *
	 * @param string               $event   Debug event name.
	 * @param array<string, mixed> $context Context payload.
	 */
	private function emit_debug( string $event, array $context ): void {
		/**
		 * Fires for license-runtime debug events.
		 *
		 * @param string $event   Event name.
		 * @param array  $context Event context without the full license key.
		 */
		do_action( 'wp_react_ui_license_debug', $event, $context );
	}

	/**
	 * Check if an IP is a public (non-private, non-reserved) address.
	 * Mirrors DnsResolver::is_public_ip() for use in should_allow_host.
	 */
	private static function is_public_ip( string $ip ): bool {
		if ( preg_match( '/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i', $ip, $m ) ) {
			return false !== filter_var(
				$m[1],
				FILTER_VALIDATE_IP,
				FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
			);
		}
		if ( preg_match( '/^64:ff9b:/i', $ip ) ||
			 preg_match( '/^fe[89ab][0-9a-f]:/i', $ip ) ||
			 '::1' === $ip ) {
			return false;
		}
		return false !== filter_var(
			$ip,
			FILTER_VALIDATE_IP,
			FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
		);
	}
}
