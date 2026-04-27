<?php
/**
 * Security tests: REST responses must never expose the full license key.
 *
 * The license key doubles as the HMAC signing secret, so returning it in any
 * REST response would allow exfiltration via XSS or a browser extension.
 */

use WpReactUi\License\LicenseSettingsRepository;
use WpReactUi\Rest\Services\LicenseSettingsService;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class LicenseSettingsServiceTest extends TestCase {

	private const FULL_KEY   = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
	private const KEY_PREFIX = 'abcd';
	private const KEY_SUFFIX = '6789';

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
	}

	// -------------------------------------------------------------------------
	// get_license_server_settings_payload — key masking in the REST response
	// -------------------------------------------------------------------------

	public function test_settings_payload_never_contains_full_key(): void {
		$repo = new LicenseSettingsRepository();
		$repo->save_license_key( self::FULL_KEY );

		$payload = ( new LicenseSettingsService( null, $repo ) )->get_license_server_settings_payload();

		$this->assertNotSame( self::FULL_KEY, $payload['storedLicenseKey'] );
		$this->assertStringNotContainsString( self::FULL_KEY, (string) $payload['storedLicenseKey'] );
	}

	public function test_settings_payload_masked_key_shows_first_and_last_four_chars(): void {
		$repo = new LicenseSettingsRepository();
		$repo->save_license_key( self::FULL_KEY );

		$payload = ( new LicenseSettingsService( null, $repo ) )->get_license_server_settings_payload();
		$masked  = (string) $payload['storedLicenseKey'];

		$this->assertStringStartsWith( self::KEY_PREFIX, $masked );
		$this->assertStringEndsWith( self::KEY_SUFFIX, $masked );
	}

	public function test_settings_payload_masked_key_contains_asterisks(): void {
		$repo = new LicenseSettingsRepository();
		$repo->save_license_key( self::FULL_KEY );

		$payload = ( new LicenseSettingsService( null, $repo ) )->get_license_server_settings_payload();
		$masked  = (string) $payload['storedLicenseKey'];

		$this->assertStringContainsString( '****', $masked );
	}

	public function test_settings_payload_returns_null_key_when_no_key_stored(): void {
		$repo    = new LicenseSettingsRepository();
		$payload = ( new LicenseSettingsService( null, $repo ) )->get_license_server_settings_payload();

		$this->assertNull( $payload['storedLicenseKey'] );
	}

	public function test_save_settings_response_never_contains_full_key(): void {
		$repo = new LicenseSettingsRepository();
		$repo->save_license_key( self::FULL_KEY );
		update_option( 'wp_react_ui_license_server_url', 'https://licenses.example.test', false );

		$result = ( new LicenseSettingsService( null, $repo ) )->save_license_server_settings(
			'https://licenses.example.test'
		);

		$this->assertIsArray( $result );
		$this->assertNotSame( self::FULL_KEY, $result['storedLicenseKey'] );
		$this->assertStringNotContainsString( self::FULL_KEY, (string) $result['storedLicenseKey'] );
	}

	// -------------------------------------------------------------------------
	// mask_license_key — unit tests for the masking algorithm
	// -------------------------------------------------------------------------

	public function test_mask_license_key_masks_standard_64_char_hex_key(): void {
		$masked = LicenseSettingsService::mask_license_key( self::FULL_KEY );

		$this->assertSame(
			self::KEY_PREFIX . str_repeat( '*', 56 ) . self::KEY_SUFFIX,
			$masked
		);
	}

	public function test_mask_license_key_returns_empty_string_for_empty_input(): void {
		$this->assertSame( '', LicenseSettingsService::mask_license_key( '' ) );
	}

	public function test_mask_license_key_masks_entire_key_when_eight_chars_or_fewer(): void {
		$this->assertSame( '********', LicenseSettingsService::mask_license_key( 'abcd1234' ) );
		$this->assertSame( '*', LicenseSettingsService::mask_license_key( 'a' ) );
		$this->assertSame( '********', LicenseSettingsService::mask_license_key( '12345678' ) );
	}

	public function test_mask_license_key_masks_middle_section_for_nine_char_key(): void {
		$masked = LicenseSettingsService::mask_license_key( 'abcd12345' );

		$this->assertSame( 'abcd*2345', $masked );
	}

	public function test_mask_license_key_does_not_equal_original(): void {
		$key    = self::FULL_KEY;
		$masked = LicenseSettingsService::mask_license_key( $key );

		$this->assertNotSame( $key, $masked );
		$this->assertStringNotContainsString( $key, $masked );
	}
}
