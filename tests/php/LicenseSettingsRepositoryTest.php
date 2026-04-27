<?php
/**
 * Tests for encrypted license key persistence.
 */

use WpReactUi\License\LicenseSettingsRepository;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class LicenseSettingsRepositoryTest extends TestCase {

	private const VALID_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
	}

	public function test_save_license_key_encrypts_at_rest_and_round_trips(): void {
		$repository = new LicenseSettingsRepository();

		$this->assertTrue( $repository->save_license_key( self::VALID_KEY ) );

		$settings = get_option( 'wp_react_ui_license_settings', array() );

		$this->assertIsArray( $settings );
		$this->assertSame( '', $settings['license_key'] );
		$this->assertNotEmpty( $settings['encrypted_license_key'] );
		$this->assertNotEmpty( $settings['license_key_nonce'] );
		$this->assertSame( self::VALID_KEY, $repository->get_license_key() );
		$this->assertSame( '01234567', $repository->get_key_prefix() );
	}

	public function test_get_license_key_migrates_legacy_plaintext_storage(): void {
		update_option(
			'wp_react_ui_license_settings',
			array(
				'license_key' => self::VALID_KEY,
			),
			false
		);

		$repository = new LicenseSettingsRepository();

		$this->assertSame( self::VALID_KEY, $repository->get_license_key() );

		$settings = get_option( 'wp_react_ui_license_settings', array() );

		$this->assertIsArray( $settings );
		$this->assertSame( '', $settings['license_key'] );
		$this->assertNotEmpty( $settings['encrypted_license_key'] );
	}

	public function test_webhook_secret_round_trips_and_clears_with_license(): void {
		$repository = new LicenseSettingsRepository();

		$this->assertTrue( $repository->save_webhook_secret( 'ABCDEF0123456789' ) );
		$this->assertSame( 'abcdef0123456789', $repository->get_webhook_secret() );

		$this->assertTrue( $repository->save_license_key( self::VALID_KEY ) );
		$this->assertTrue( $repository->clear_license_key() );
		$this->assertSame( '', $repository->get_webhook_secret() );
	}

	public function test_save_webhook_secret_encrypts_at_rest(): void {
		$repository  = new LicenseSettingsRepository();
		$plain_secret = 'abcdef0123456789abcdef0123456789';

		$this->assertTrue( $repository->save_webhook_secret( $plain_secret ) );

		$settings = get_option( 'wp_react_ui_license_settings', array() );

		$this->assertIsArray( $settings );
		// Plain text must NOT appear anywhere in the raw stored option.
		$this->assertSame( '', $settings['webhook_secret'] ?? '' );
		$this->assertNotEmpty( $settings['encrypted_webhook_secret'] ?? '' );
		$this->assertNotEmpty( $settings['webhook_secret_nonce'] ?? '' );

		// Round-trip must return the correct value.
		$this->assertSame( $plain_secret, $repository->get_webhook_secret() );
	}

	public function test_get_webhook_secret_migrates_legacy_plaintext(): void {
		$plain_secret = 'abcdef0123456789abcdef0123456789';

		update_option(
			'wp_react_ui_license_settings',
			array( 'webhook_secret' => $plain_secret ),
			false
		);

		$repository = new LicenseSettingsRepository();

		// Must return the correct value via transparent migration.
		$this->assertSame( $plain_secret, $repository->get_webhook_secret() );

		// After migration the option must store encrypted data, not plain text.
		$settings = get_option( 'wp_react_ui_license_settings', array() );

		$this->assertIsArray( $settings );
		$this->assertSame( '', $settings['webhook_secret'] ?? '' );
		$this->assertNotEmpty( $settings['encrypted_webhook_secret'] ?? '' );
	}

	public function test_get_webhook_secret_returns_empty_string_on_corrupted_ciphertext(): void {
		update_option(
			'wp_react_ui_license_settings',
			array(
				'webhook_secret'           => '',
				'encrypted_webhook_secret' => base64_encode( 'not-real-ciphertext' ),
				'webhook_secret_nonce'     => base64_encode( str_repeat( "\x00", SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ) ),
				'webhook_secret_tag'       => '',
				'webhook_secret_cipher'    => 'secretbox',
			),
			false
		);

		$repository = new LicenseSettingsRepository();

		// Must return empty string, not throw.
		$this->assertSame( '', $repository->get_webhook_secret() );
	}

	public function test_server_url_round_trips_after_saving(): void {
		$repository = new LicenseSettingsRepository();

		$this->assertTrue( $repository->save_server_url( 'https://licenses.example.test/' ) );
		$this->assertSame( 'https://licenses.example.test', $repository->get_server_url() );
		$this->assertTrue( $repository->is_server_configured() );
	}
}
