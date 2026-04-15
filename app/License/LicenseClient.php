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

		$body       = array(
			'plugin_version' => $this->get_plugin_version(),
			'wp_version'     => get_bloginfo( 'version' ),
			'php_version'    => PHP_VERSION,
		);
		$json_body  = wp_json_encode( $body );

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

			$last_response = call_user_func( $this->remote_post, $url, $args );

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
				'action'     => $action,
				'keyPrefix'  => $key_prefix,
				'status'     => $status_code,
				'code'       => $error_code,
				'message'    => $message,
				'rawBody'    => $raw_body,
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

		return in_array( $host, array( 'localhost', '127.0.0.1', '::1' ), true )
			|| str_ends_with( $host, '.test' )
			|| str_ends_with( $host, '.local' );
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
}
