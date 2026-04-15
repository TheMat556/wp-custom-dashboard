<?php
/**
 * Tests for the outbound license client.
 */

use WpReactUi\License\LicenseClient;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class LicenseClientTest extends TestCase {

	private const VALID_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
		update_option( 'wp_react_ui_license_server_url', 'https://licenses.example.test', false );
	}

	public function test_activate_sends_hmac_headers_and_retries_once(): void {
		global $wp_test_state;

		$calls = array();
		$wp_test_state['remote_post_handler'] = static function ( string $url, array $args ) use ( &$calls ) {
			$calls[] = array(
				'url'  => $url,
				'args' => $args,
			);

			if ( 1 === count( $calls ) ) {
				return new WP_Error( 'timeout', 'Timeout' );
			}

			return array(
				'response' => array(
					'code' => 200,
				),
				'body'     => wp_json_encode(
					array(
						'status'  => 'active',
						'license' => array(
							'tier'        => 'pro',
							'valid_until' => '2030-01-01 00:00:00',
							'features'    => array( 'dashboard', 'chat' ),
						),
					)
				),
			);
		};

		$client = new LicenseClient();
		$result = $client->activate( self::VALID_KEY );

		$this->assertIsArray( $result );
		$this->assertSame( 'active', $result['status'] );
		$this->assertCount( 2, $calls );
		$this->assertSame(
			'https://licenses.example.test/index.php?rest_route=%2Flicense-server%2Fv1%2Factivate',
			$calls[0]['url']
		);

		$headers = $calls[0]['args']['headers'];
		$this->assertSame( substr( self::VALID_KEY, 0, 8 ), $headers['X-License-Key-Id'] );
		$this->assertArrayNotHasKey( 'X-License-Key', $headers );
		$this->assertSame( 'localhost', $headers['X-License-Domain'] );

		$body              = (string) $calls[0]['args']['body'];
		$expected_signature = hash_hmac(
			'sha256',
			implode(
				"\n",
				array(
					'POST',
					'/license-server/v1/activate',
					'localhost',
					$headers['X-License-Timestamp'],
					$body,
				)
			),
			self::VALID_KEY
		);

		$this->assertTrue( hash_equals( $expected_signature, $headers['X-License-Signature'] ) );
		$this->assertSame( 10, $calls[0]['args']['timeout'] );
	}

	public function test_activate_returns_wp_error_for_invalid_key_format(): void {
		$client = new LicenseClient();
		$result = $client->activate( 'not-a-real-key' );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'license_invalid_key', $result->get_error_code() );
	}

	public function test_activate_returns_structured_wp_error_without_exposing_full_key(): void {
		global $wp_test_state;

		$wp_test_state['remote_post_handler'] = static function (): array {
			return array(
				'response' => array(
					'code' => 401,
				),
				'body'     => wp_json_encode(
					array(
						'code'    => 'invalid_signature',
						'message' => 'Signature mismatch.',
						'data'    => array(
							'status' => 401,
						),
					)
				),
			);
		};

		$client = new LicenseClient();
		$result = $client->activate( self::VALID_KEY );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'invalid_signature', $result->get_error_code() );
		$this->assertStringNotContainsString( self::VALID_KEY, $result->get_error_message() );
		$this->assertSame( substr( self::VALID_KEY, 0, 8 ), $result->get_error_data()['keyPrefix'] );
	}

	public function test_activate_strips_query_string_when_building_remote_rest_url(): void {
		global $wp_test_state;

		update_option( 'wp_react_ui_license_server_url', 'https://licenses.example.test/subdir?foo=bar', false );

		$calls = array();
		$wp_test_state['remote_post_handler'] = static function ( string $url, array $args ) use ( &$calls ): array {
			$calls[] = array(
				'url'  => $url,
				'args' => $args,
			);

			return array(
				'response' => array(
					'code' => 200,
				),
				'body'     => wp_json_encode(
					array(
						'status'  => 'active',
						'license' => array(
							'tier'        => 'pro',
							'valid_until' => '2030-01-01 00:00:00',
							'features'    => array( 'dashboard' ),
						),
					)
				),
			);
		};

		$client = new LicenseClient();
		$client->activate( self::VALID_KEY );

		$this->assertSame(
			'https://licenses.example.test/subdir/index.php?rest_route=%2Flicense-server%2Fv1%2Factivate',
			$calls[0]['url']
		);
	}

	public function test_activate_rejects_insecure_non_local_license_server_urls(): void {
		update_option( 'wp_react_ui_license_server_url', 'http://licenses.example.com', false );

		$client = new LicenseClient();
		$result = $client->activate( self::VALID_KEY );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'license_server_insecure_url', $result->get_error_code() );
	}
}
