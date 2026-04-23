<?php
/**
 * Tests for public license payload state transitions.
 */

use WpReactUi\License\LicenseCache;
use WpReactUi\License\LicenseManager;
use WpReactUi\License\LicenseSettingsRepository;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class LicenseManagerTest extends TestCase {
	private const OLD_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
	private const NEW_KEY = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
		( new LicenseSettingsRepository() )->save_license_key( self::OLD_KEY );
	}

	public function test_get_status_payload_disables_expired_grace_state(): void {
		$cache = new LicenseCache();
		$cache->set(
			array(
				'status'             => 'grace',
				'tier'               => 'pro',
				'features'           => array( 'chat' ),
				'graceDaysRemaining' => 1,
				'keyPrefix'          => '01234567',
				'lastValidatedAt'    => gmdate( 'Y-m-d H:i:s', time() - DAY_IN_SECONDS ),
			)
		);
		update_option( 'wp_react_ui_license_grace_started_at', time() - ( 8 * DAY_IN_SECONDS ), false );

		$payload = ( new LicenseManager() )->get_status_payload();

		$this->assertSame( 'disabled', $payload['status'] );
		$this->assertSame( 0, $payload['graceDaysRemaining'] );
	}

	public function test_validate_normalizes_valid_status_to_active(): void {
		global $wp_test_state;

		update_option( 'wp_react_ui_license_server_url', 'https://licenses.example.test', false );
		$wp_test_state['remote_post_handler'] = static function (): array {
			return array(
				'response' => array( 'code' => 200 ),
				'body'     => wp_json_encode(
					array(
						'status'  => 'valid',
						'license' => array(
							'tier'        => 'pro',
							'valid_until' => '2030-01-01 00:00:00',
							'features'    => array( 'chat' ),
						),
					)
				),
			);
		};

		$payload = ( new LicenseManager() )->validate();

		$this->assertIsArray( $payload );
		$this->assertSame( 'active', $payload['status'] );
	}

	public function test_validate_syncs_remote_expired_grace_window_locally(): void {
		global $wp_test_state;

		update_option( 'wp_react_ui_license_server_url', 'https://licenses.example.test', false );
		$wp_test_state['remote_post_handler'] = static function (): array {
			return array(
				'response' => array( 'code' => 200 ),
				'body'     => wp_json_encode(
					array(
						'status'  => 'expired',
						'license' => array(
							'tier'                => 'pro',
							'valid_until'         => '2020-01-01 00:00:00',
							'features'            => array( 'chat' ),
							'grace_days_remaining' => 4,
						),
					)
				),
			);
		};

		$payload = ( new LicenseManager() )->validate();

		$this->assertIsArray( $payload );
		$this->assertSame( 'expired', $payload['status'] );
		$this->assertSame( 4, $payload['graceDaysRemaining'] );
		$this->assertSame( 'grace', \WpReactUi\License\LicenseServiceContainer::get_instance()->get_grace_period()->get_status()['mode'] );
	}

	public function test_activate_releases_previous_site_key_before_switching(): void {
		global $wp_test_state;

		update_option( 'wp_react_ui_license_server_url', 'https://licenses.example.test', false );
		$calls = array();
		$wp_test_state['remote_post_handler'] = static function ( string $url ) use ( &$calls ): array {
			$calls[] = $url;

			if ( false !== strpos( $url, 'deactivate' ) ) {
				return array(
					'response' => array( 'code' => 200 ),
					'body'     => wp_json_encode( array( 'status' => 'deactivated' ) ),
				);
			}

			return array(
				'response' => array( 'code' => 200 ),
				'body'     => wp_json_encode(
					array(
						'status'  => 'activated',
						'license' => array(
							'tier'        => 'pro',
							'valid_until' => '2030-01-01 00:00:00',
							'features'    => array( 'dashboard', 'white_label' ),
						),
					)
				),
			);
		};

		$payload = ( new LicenseManager() )->activate( self::NEW_KEY );

		$this->assertIsArray( $payload );
		$this->assertSame( 'active', $payload['status'] );
		$this->assertCount( 2, $calls );
		$this->assertStringContainsString( 'deactivate', $calls[0] );
		$this->assertStringContainsString( 'activate', $calls[1] );
		$this->assertSame( self::NEW_KEY, ( new LicenseSettingsRepository() )->get_license_key() );
	}

	public function test_failed_key_swap_does_not_persist_a_disabled_cache(): void {
		global $wp_test_state;

		update_option( 'wp_react_ui_license_server_url', 'https://licenses.example.test', false );
		$wp_test_state['remote_post_handler'] = static function ( string $url ): array {
			if ( false !== strpos( $url, 'deactivate' ) ) {
				return array(
					'response' => array( 'code' => 200 ),
					'body'     => wp_json_encode( array( 'status' => 'deactivated' ) ),
				);
			}

			return array(
				'response' => array( 'code' => 409 ),
				'body'     => wp_json_encode(
					array(
						'code'    => 'license_conflict',
						'message' => 'Could not activate this key for the site.',
					)
				),
			);
		};

		$result = ( new LicenseManager() )->activate( self::NEW_KEY );

		$this->assertTrue( is_wp_error( $result ) );
		$this->assertSame( self::OLD_KEY, ( new LicenseSettingsRepository() )->get_license_key() );
		$this->assertNull( ( new LicenseCache() )->get() );
	}

	public function test_failed_key_swap_preserves_the_existing_webhook_secret_when_restore_succeeds(): void {
		global $wp_test_state;

		update_option( 'wp_react_ui_license_server_url', 'https://licenses.example.test', false );
		$settings = new LicenseSettingsRepository();
		$settings->save_webhook_secret( 'abcdef0123456789abcdef0123456789' );
		$activation_attempts = 0;

		$wp_test_state['remote_post_handler'] = static function ( string $url ) use ( &$activation_attempts ): array {
			if ( false !== strpos( $url, 'deactivate' ) ) {
				return array(
					'response' => array( 'code' => 200 ),
					'body'     => wp_json_encode( array( 'status' => 'deactivated' ) ),
				);
			}

			++$activation_attempts;

			if ( 1 === $activation_attempts ) {
				return array(
					'response' => array( 'code' => 409 ),
					'body'     => wp_json_encode(
						array(
							'code'    => 'license_conflict',
							'message' => 'Could not activate this key for the site.',
						)
					),
				);
			}

			return array(
				'response' => array( 'code' => 200 ),
				'body'     => wp_json_encode(
					array(
						'status'  => 'activated',
						'license' => array(
							'tier'        => 'pro',
							'valid_until' => '2030-01-01 00:00:00',
							'features'    => array( 'chat' ),
						),
					)
				),
			);
		};

		$result = ( new LicenseManager() )->activate( self::NEW_KEY );

		$this->assertTrue( is_wp_error( $result ) );
		$this->assertSame( self::OLD_KEY, $settings->get_license_key() );
		$this->assertSame( 'abcdef0123456789abcdef0123456789', $settings->get_webhook_secret() );
	}
}
