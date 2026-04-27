<?php
/**
 * Signed client for the central WordPress-native chat backend.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Chat;

use WP_Error;
use WpReactUi\Chat\ChatConfig;
use WpReactUi\License\LicenseSettingsRepository;

defined( 'ABSPATH' ) || exit;

final class NativeChatClient {
	private const ROUTE_NAMESPACE = '/license-server/v1/chat';

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
	 * @param array<string, mixed> $payload Chat bootstrap payload.
	 * @return array<string, mixed>|WP_Error
	 */
	public function bootstrap( array $payload = array() ) {
		return $this->send_signed_request( 'bootstrap', $payload );
	}

	/**
	 * @param int $selected_thread_id Thread identifier to refresh.
	 * @param int $after_message_id   Last message identifier already known to the client.
	 * @return array<string, mixed>|WP_Error
	 */
	public function poll( int $selected_thread_id, int $after_message_id = 0 ) {
		return $this->send_signed_request(
			'poll',
			array(
				'selectedThreadId' => $selected_thread_id,
				'afterMessageId'   => $after_message_id,
			)
		);
	}

	/**
	 * @param int    $selected_thread_id Thread identifier receiving the message.
	 * @param string $message            Message body to deliver.
	 * @return array<string, mixed>|WP_Error
	 */
	public function send( int $selected_thread_id, string $message ) {
		// Belt-and-suspenders: sanitization and length enforcement must happen
		// in the controller before reaching this point.
		assert( mb_strlen( $message ) <= ChatConfig::MAX_MESSAGE_LENGTH );

		return $this->send_signed_request(
			'send',
			array(
				'selectedThreadId' => $selected_thread_id,
				'message'          => $message,
			)
		);
	}

	/**
	 * @param int $selected_thread_id Thread identifier to archive.
	 * @return array<string, mixed>|WP_Error
	 */
	public function archive( int $selected_thread_id ) {
		return $this->send_signed_request(
			'archive',
			array(
				'selectedThreadId' => $selected_thread_id,
			)
		);
	}

	/**
	 * @param int $selected_thread_id Thread identifier to unarchive.
	 * @return array<string, mixed>|WP_Error
	 */
	public function unarchive( int $selected_thread_id ) {
		return $this->send_signed_request(
			'unarchive',
			array(
				'selectedThreadId' => $selected_thread_id,
			)
		);
	}

	/**
	 * @param int $selected_thread_id Thread identifier to delete permanently.
	 * @return array<string, mixed>|WP_Error
	 */
	public function delete_thread( int $selected_thread_id ) {
		return $this->send_signed_request(
			'delete',
			array(
				'selectedThreadId' => $selected_thread_id,
			)
		);
	}

	/**
	 * @param string               $action  Chat route action segment.
	 * @param array<string, mixed> $payload Chat request payload.
	 * @return array<string, mixed>|WP_Error
	 */
	private function send_signed_request( string $action, array $payload ) {
		$license_key = $this->sanitize_license_key( $this->settings_repository->get_license_key() );

		if ( ! preg_match( '/^[a-f0-9]{64}$/', $license_key ) ) {
			return new WP_Error(
				'license_missing_key',
				'No valid license key is stored for chat access.',
				array( 'status' => 400 )
			);
		}

		$server_url = $this->settings_repository->get_server_url();
		if ( '' === $server_url ) {
			return new WP_Error(
				'license_server_not_configured',
				'License server URL is not configured. Please save a server URL before using chat.',
				array( 'status' => 400 )
			);
		}

		if ( ! $this->is_secure_server_url( $server_url ) ) {
			return new WP_Error(
				'license_server_insecure_url',
				'License server URL must use HTTPS outside local development.',
				array( 'status' => 400 )
			);
		}

		$route_path = self::ROUTE_NAMESPACE . '/' . sanitize_key( $action );
		$url        = $this->build_remote_rest_url( $server_url, $route_path );
		$key_prefix = substr( $license_key, 0, 8 );
		$timestamp  = (string) time();
		$nonce      = bin2hex( random_bytes( 16 ) );
		$domain     = $this->resolve_domain();
		$body       = array_merge(
			array(
				'pluginVersion' => $this->get_plugin_version(),
				'wpVersion'     => get_bloginfo( 'version' ),
				'phpVersion'    => PHP_VERSION,
			),
			$payload
		);
		$json_body  = wp_json_encode( $body );

		if ( ! is_string( $json_body ) ) {
			return new WP_Error(
				'chat_encode_failed',
				'Unable to encode the chat request payload.',
				array( 'status' => 500 )
			);
		}

		$signing_key = hash_hkdf( 'sha256', $license_key, 32, 'wplicense-hmac-signing-v1' );

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
			$signing_key
		);

		$args = array(
			'timeout'     => (int) apply_filters( 'wp_react_ui_chat_http_timeout', 10 ),
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

		$response = call_user_func( $this->remote_post, $url, $args );

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'chat_request_failed',
				'Could not reach the chat server.',
				array( 'status' => 503 )
			);
		}

		return $this->parse_response( $response, $action, $key_prefix );
	}

	/**
	 * @param array<string, mixed> $response   HTTP response array.
	 * @param string               $action     Chat route action segment.
	 * @param string               $key_prefix License key prefix used for diagnostics.
	 * @return array<string, mixed>|WP_Error
	 */
	private function parse_response( array $response, string $action, string $key_prefix ) {
		$status_code = wp_remote_retrieve_response_code( $response );
		$raw_body    = wp_remote_retrieve_body( $response );
		$decoded     = json_decode( is_string( $raw_body ) ? $raw_body : '', true );

		if ( $status_code >= 200 && $status_code < 300 ) {
			if ( ! is_array( $decoded ) ) {
				return new WP_Error(
					'chat_invalid_response',
					'The chat server returned an invalid response.',
					array(
						'status'    => 502,
						'endpoint'  => $action,
						'keyPrefix' => $key_prefix,
					)
				);
			}

			return $decoded;
		}

		$error_code = is_array( $decoded ) && isset( $decoded['code'] ) ? sanitize_key( (string) $decoded['code'] ) : 'chat_api_error';
		$message    = is_array( $decoded ) && isset( $decoded['message'] ) ? sanitize_text_field( (string) $decoded['message'] ) : 'The chat server rejected the request.';
		$data       = is_array( $decoded ) && isset( $decoded['data'] ) && is_array( $decoded['data'] ) ? $decoded['data'] : array();

		$data['status']    = $status_code;
		$data['endpoint']  = $action;
		$data['keyPrefix'] = $key_prefix;

		return new WP_Error( $error_code, $message, $data );
	}

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

	private function resolve_domain(): string {
		$host = wp_parse_url( home_url( '/' ), PHP_URL_HOST );
		$host = is_string( $host ) ? strtolower( $host ) : '';
		$host = sanitize_text_field( $host );

		return (string) apply_filters( 'wp_react_ui_license_domain', $host );
	}

	private function get_plugin_version(): string {
		if ( ! function_exists( 'get_plugin_data' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$plugin_data = get_plugin_data( dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php', false, false );

		return isset( $plugin_data['Version'] ) ? sanitize_text_field( (string) $plugin_data['Version'] ) : '0.0.0';
	}

	private function is_secure_server_url( string $server_url ): bool {
		$scheme = wp_parse_url( $server_url, PHP_URL_SCHEME );
		$host   = wp_parse_url( $server_url, PHP_URL_HOST );

		if ( is_string( $scheme ) && 'https' === strtolower( $scheme ) ) {
			return true;
		}

		if ( ! is_string( $host ) ) {
			return false;
		}

		$normalized_host = strtolower( $host );

		return in_array( $normalized_host, array( 'localhost', '127.0.0.1', '::1' ), true )
			|| str_ends_with( $normalized_host, '.test' )
			|| str_ends_with( $normalized_host, '.local' );
	}

	private function sanitize_license_key( string $license_key ): string {
		$normalized = preg_replace( '/[^a-f0-9]/i', '', strtolower( sanitize_text_field( $license_key ) ) );
		return is_string( $normalized ) ? $normalized : '';
	}
}
