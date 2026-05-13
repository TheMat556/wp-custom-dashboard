<?php
/**
 * Tests for REST API validation utilities.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Tests;

use WpReactUi\Rest\RestValidator;
use PHPUnit\Framework\TestCase;

/**
 * Tests for RestValidator class (pure unit tests with no WP dependencies).
 */
class RestValidatorTest extends TestCase {

	public function test_validate_string_rejects_non_string(): void {
		$this->assertFalse( RestValidator::validate_string( 123 ) );
		$this->assertFalse( RestValidator::validate_string( array() ) );
		$this->assertFalse( RestValidator::validate_string( null ) );
	}

	public function test_validate_string_rejects_empty_string(): void {
		$this->assertFalse( RestValidator::validate_string( '' ) );
	}

	public function test_validate_string_accepts_valid_string(): void {
		$this->assertTrue( RestValidator::validate_string( 'hello' ) );
		$this->assertTrue( RestValidator::validate_string( 'a' ) );
		$this->assertTrue( RestValidator::validate_string( str_repeat( 'x', 256 ) ) );
	}

	public function test_validate_string_respects_min_length(): void {
		$this->assertFalse( RestValidator::validate_string( 'hi', 3, 256 ) );
		$this->assertTrue( RestValidator::validate_string( 'hi', 2, 256 ) );
		$this->assertTrue( RestValidator::validate_string( 'hi', 1, 256 ) );
	}

	public function test_validate_string_respects_max_length(): void {
		$this->assertFalse( RestValidator::validate_string( 'hello', 1, 4 ) );
		$this->assertTrue( RestValidator::validate_string( 'hello', 1, 5 ) );
		$this->assertTrue( RestValidator::validate_string( 'hello', 1, 6 ) );
	}

	public function test_validate_optional_string_accepts_empty(): void {
		$this->assertTrue( RestValidator::validate_optional_string( '' ) );
		$this->assertTrue( RestValidator::validate_optional_string( null ) );
	}

	public function test_validate_optional_string_accepts_valid(): void {
		$this->assertTrue( RestValidator::validate_optional_string( 'hello' ) );
	}

	public function test_validate_license_key_requires_min_8_chars(): void {
		$this->assertFalse( RestValidator::validate_license_key( 'short' ) );
		$this->assertTrue( RestValidator::validate_license_key( '12345678' ) );
	}

	public function test_validate_license_key_respects_max_512(): void {
		$this->assertFalse( RestValidator::validate_license_key( str_repeat( 'x', 513 ) ) );
		$this->assertTrue( RestValidator::validate_license_key( str_repeat( 'x', 512 ) ) );
	}

	public function test_validate_url_accepts_valid_urls(): void {
		$this->assertTrue( RestValidator::validate_url( 'https://example.com' ) );
		$this->assertTrue( RestValidator::validate_url( 'http://localhost' ) );
	}

	public function test_validate_url_rejects_invalid_urls(): void {
		$this->assertFalse( RestValidator::validate_url( 'not a url' ) );
		$this->assertFalse( RestValidator::validate_url( 123 ) );
	}

	public function test_validate_optional_url_accepts_empty(): void {
		$this->assertTrue( RestValidator::validate_optional_url( '' ) );
		$this->assertTrue( RestValidator::validate_optional_url( null ) );
	}

	public function test_validate_optional_url_accepts_valid(): void {
		$this->assertTrue( RestValidator::validate_optional_url( 'https://example.com' ) );
	}

	public function test_validate_optional_url_rejects_invalid(): void {
		$this->assertFalse( RestValidator::validate_optional_url( 'not a url' ) );
	}

	public function test_validate_integer_accepts_numeric_values(): void {
		$this->assertTrue( RestValidator::validate_integer( 0 ) );
		$this->assertTrue( RestValidator::validate_integer( 100 ) );
	}

	public function test_validate_integer_respects_min_value(): void {
		$this->assertFalse( RestValidator::validate_integer( -1, 0, PHP_INT_MAX ) );
		$this->assertTrue( RestValidator::validate_integer( 0, 0, PHP_INT_MAX ) );
	}

	public function test_validate_integer_respects_max_value(): void {
		$this->assertFalse( RestValidator::validate_integer( 100, 0, 50 ) );
		$this->assertTrue( RestValidator::validate_integer( 50, 0, 50 ) );
	}

	public function test_validate_optional_integer_accepts_empty(): void {
		$this->assertTrue( RestValidator::validate_optional_integer( '' ) );
		$this->assertTrue( RestValidator::validate_optional_integer( null ) );
	}

	public function test_validate_optional_integer_accepts_valid(): void {
		$this->assertTrue( RestValidator::validate_optional_integer( 100 ) );
	}

	public function test_validate_enum_accepts_values_in_list(): void {
		$allowed = array( 'light', 'dark', 'system' );
		$this->assertTrue( RestValidator::validate_enum( 'light', $allowed ) );
		$this->assertTrue( RestValidator::validate_enum( 'dark', $allowed ) );
		$this->assertTrue( RestValidator::validate_enum( 'system', $allowed ) );
	}

	public function test_validate_enum_rejects_values_not_in_list(): void {
		$allowed = array( 'light', 'dark', 'system' );
		$this->assertFalse( RestValidator::validate_enum( 'invalid', $allowed ) );
		$this->assertFalse( RestValidator::validate_enum( 'Light', $allowed ) );
	}

	public function test_validate_enum_uses_strict_comparison(): void {
		$allowed = array( 'light', 'dark', 'system' );
		$this->assertFalse( RestValidator::validate_enum( 1, $allowed ) );
		$this->assertFalse( RestValidator::validate_enum( true, $allowed ) );
	}

	public function test_validate_boolean_accepts_booleans(): void {
		$this->assertTrue( RestValidator::validate_boolean( true ) );
		$this->assertTrue( RestValidator::validate_boolean( false ) );
	}

	public function test_validate_mb_string_counts_multibyte_chars(): void {
		$this->assertTrue( RestValidator::validate_mb_string( 'ü', 1, 10 ) );
		$this->assertTrue( RestValidator::validate_mb_string( 'über', 1, 10 ) );
	}

	public function test_validate_mb_string_respects_character_limits(): void {
		$this->assertFalse( RestValidator::validate_mb_string( 'hello', 10, 100 ) );
		$this->assertFalse( RestValidator::validate_mb_string( 'hello', 1, 3 ) );
		$this->assertTrue( RestValidator::validate_mb_string( 'hello', 1, 5 ) );
	}

	public function test_validate_optional_mb_string_accepts_empty(): void {
		$this->assertTrue( RestValidator::validate_optional_mb_string( '' ) );
		$this->assertTrue( RestValidator::validate_optional_mb_string( null ) );
	}

	public function test_validate_optional_mb_string_accepts_valid(): void {
		$this->assertTrue( RestValidator::validate_optional_mb_string( 'hello' ) );
	}

	public function test_validate_uri_structure_accepts_empty(): void {
		$this->assertTrue( RestValidator::validate_uri_structure( '' ) );
		$this->assertTrue( RestValidator::validate_uri_structure( null ) );
	}

	public function test_validate_uri_structure_accepts_domain(): void {
		$this->assertTrue( RestValidator::validate_uri_structure( 'https://example.com/' ) );
		$this->assertTrue( RestValidator::validate_uri_structure( 'http://localhost:8080' ) );
	}

	public function test_validate_uri_structure_rejects_non_string(): void {
		$this->assertFalse( RestValidator::validate_uri_structure( 123 ) );
		$this->assertFalse( RestValidator::validate_uri_structure( array() ) );
	}

	public function test_validate_uri_structure_rejects_userinfo(): void {
		$this->assertFalse( RestValidator::validate_uri_structure( 'https://user:pass@example.com/' ) );
	}

	public function test_validate_uri_structure_rejects_ipv4(): void {
		$this->assertFalse( RestValidator::validate_uri_structure( 'http://127.0.0.1/' ) );
		$this->assertFalse( RestValidator::validate_uri_structure( 'http://10.0.0.5/' ) );
		// Octal IPv4
		$this->assertFalse( RestValidator::validate_uri_structure( 'http://0177.0.0.1/' ) );
		// Integer-form IPv4
		$this->assertFalse( RestValidator::validate_uri_structure( 'http://2130706433/' ) );
		// Hex-form IPv4
		$this->assertFalse( RestValidator::validate_uri_structure( 'http://0x7f000001/' ) );
	}

	public function test_validate_uri_structure_rejects_ipv6(): void {
		$this->assertFalse( RestValidator::validate_uri_structure( 'http://[::1]/' ) );
		$this->assertFalse( RestValidator::validate_uri_structure( 'http://[fe80::1]/' ) );
	}

	public function test_validate_uri_structure_rejects_ipv6_with_zone_id(): void {
		$this->assertFalse( RestValidator::validate_uri_structure( 'http://[fe80::1%25eth0]/' ) );
		$this->assertFalse( RestValidator::validate_uri_structure( 'http://[::1%25lo0]/' ) );
	}

	public function test_validate_uri_structure_rejects_consecutive_dots(): void {
		$this->assertFalse( RestValidator::validate_uri_structure( 'http://foo..bar/' ) );
	}

	public function test_validate_uri_structure_rejects_non_http_scheme(): void {
		$this->assertFalse( RestValidator::validate_uri_structure( 'file:///etc/passwd' ) );
		$this->assertFalse( RestValidator::validate_uri_structure( 'ftp://example.com/' ) );
	}

	public function test_validate_uri_structure_rejects_missing_host(): void {
		$this->assertFalse( RestValidator::validate_uri_structure( 'http:///' ) );
		$this->assertFalse( RestValidator::validate_uri_structure( 'not a url' ) );
	}
}
