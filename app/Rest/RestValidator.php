<?php
/**
 * REST API validation callbacks and utilities.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest;

defined( 'ABSPATH' ) || exit;

/**
 * Centralized validation callbacks for REST route arguments.
 * All validators return true/false; WordPress converts false to 400 error.
 */
final class RestValidator {

	/**
	 * Validates a required non-empty string with max length.
	 *
	 * @param mixed $value     The value to validate.
	 * @param int   $min_length Minimum string length (default 1).
	 * @param int   $max_length Maximum string length (default 256).
	 * @return bool True if valid, false otherwise.
	 */
	public static function validate_string(
		$value,
		int $min_length = 1,
		int $max_length = 256
	): bool {
		if ( ! is_string( $value ) ) {
			return false;
		}
		$length = strlen( $value );
		return $length >= $min_length && $length <= $max_length;
	}

	/**
	 * Validates an optional string (may be empty) with max length.
	 *
	 * @param mixed $value     The value to validate.
	 * @param int   $max_length Maximum string length (default 256).
	 * @return bool True if valid or empty, false otherwise.
	 */
	public static function validate_optional_string(
		$value,
		int $max_length = 256
	): bool {
		if ( empty( $value ) ) {
			return true; // Optional field.
		}
		if ( ! is_string( $value ) ) {
			return false;
		}
		return strlen( $value ) <= $max_length;
	}

	/**
	 * Validates a license key (string, min 8, max 512 chars).
	 *
	 * @param mixed $value The value to validate.
	 * @return bool True if valid license key format, false otherwise.
	 */
	public static function validate_license_key( $value ): bool {
		return self::validate_string( $value, 8, 512 );
	}

	/**
	 * Validates a URL using WordPress built-in validation.
	 *
	 * Delegates to wp_http_validate_url which rejects private/loopback IPs
	 * and non-http(s) schemes against the default HTTP API allowlist. For
	 * comprehensive SSRF validation at request time, see
	 * WebhookTargetValidator in the license-server plugin.
	 *
	 * @param mixed $value The value to validate.
	 * @return bool True if valid URL, false otherwise.
	 */
	public static function validate_url( $value ): bool {
		if ( ! is_string( $value ) ) {
			return false;
		}
		return false !== wp_http_validate_url( $value );
	}

	/**
	 * Validates an optional URL.
	 *
	 * @param mixed $value The value to validate.
	 * @return bool True if valid URL or empty, false otherwise.
	 */
	public static function validate_optional_url( $value ): bool {
		if ( empty( $value ) ) {
			return true; // Optional field.
		}
		return self::validate_url( $value );
	}

	/**
	 * Validates an optional URI structure without DNS/SSRF checks.
	 *
	 * Accepts null and empty string (optional field). Only checks that
	 * a non-empty value parses as a valid http/https URI with a non-empty
	 * host. Does NOT resolve DNS or block private IPs.
	 *
	 * Use this for configuration fields that store a URI for later use
	 * (e.g. a license server URL). SSRF protection for those URIs must
	 * be applied at request time, not at save time.
	 *
	 * @param mixed $value The value to validate.
	 * @return bool True if valid http/https URI structure or empty, false otherwise.
	 */
	public static function validate_uri_structure( $value ): bool {
		if ( null === $value || '' === $value ) {
			return true;
		}
		if ( ! is_string( $value ) ) {
			return false;
		}
		$parts = wp_parse_url( $value );
		if ( ! is_array( $parts ) || empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
			return false;
		}
		// Reject userinfo (user:pass@host) — only bare hosts are valid for server URLs.
		if ( isset( $parts['user'] ) ) {
			return false;
		}
		// Reject IP-literal hosts (IPv4, IPv6) — only domain names and
		// single-label development hosts (localhost, *.test, *.local) are
		// allowed as server URLs. SSRF protection for domain-based hosts is
		// applied at request time via the http_request_host_is_external filter.
		$host = rtrim( (string) $parts['host'], '.' );

		// Reject empty DNS labels (consecutive dots).
		if ( str_contains( $host, '..' ) ) {
			return false;
		}
		// Reject all-numeric dotted forms (2–4 octets): full quad 127.0.0.1,
		// short forms 127.1 (= 127.0.0.1), 127.0.1 (= 127.0.0.1), and octal
		// quad 0177.0.0.1 (= 127.0.0.1). filter_var does not recognize octal
		// or short-form IPv4.
		if ( preg_match( '/^[0-9]+(\.[0-9]+){1,3}$/', $host ) ) {
			return false;
		}

		if ( filter_var( $host, FILTER_VALIDATE_IP ) ) {
			return false;
		}
		// Integer-form IPv4 (2130706433 = 127.0.0.1).
		if ( ctype_digit( $host ) ) {
			return false;
		}
		// Hex-form IPv4 (0x7f000001).
		if ( preg_match( '/^0x[0-9a-f]+$/i', $host ) ) {
			return false;
		}
		// Bracketed IPv6 — filter_var fails on brackets and on %zone-id suffixes,
		// so strip both before validating.
		if ( str_starts_with( $host, '[' ) && str_ends_with( $host, ']' ) ) {
			$inner    = substr( $host, 1, -1 );
			$zone_pos = strpos( $inner, '%' );
			if ( false !== $zone_pos ) {
				$inner = substr( $inner, 0, $zone_pos );
			}
			if ( filter_var( $inner, FILTER_VALIDATE_IP ) ) {
				return false;
			}
		}
		return in_array( strtolower( $parts['scheme'] ), array( 'http', 'https' ), true );
	}

	/**
	 * Validates an integer >= 0 (non-negative).
	 *
	 * @param mixed $value The value to validate.
	 * @param int   $min   Minimum value (default 0).
	 * @param int   $max   Maximum value (default PHP_INT_MAX).
	 * @return bool True if valid integer in range, false otherwise.
	 */
	public static function validate_integer(
		$value,
		int $min = 0,
		int $max = PHP_INT_MAX
	): bool {
		if ( is_numeric( $value ) ) {
			$int_value = (int) $value;
			return $int_value >= $min && $int_value <= $max;
		}
		return false;
	}

	/**
	 * Validates an optional integer >= 0.
	 *
	 * @param mixed $value The value to validate.
	 * @param int   $min   Minimum value (default 0).
	 * @param int   $max   Maximum value (default PHP_INT_MAX).
	 * @return bool True if valid integer or empty, false otherwise.
	 */
	public static function validate_optional_integer(
		$value,
		int $min = 0,
		int $max = PHP_INT_MAX
	): bool {
		if ( empty( $value ) ) {
			return true; // Optional field.
		}
		return self::validate_integer( $value, $min, $max );
	}

	/**
	 * Validates a value is in an allowed enum list.
	 *
	 * @param mixed $value  The value to validate.
	 * @param array $allowed Allowed values.
	 * @return bool True if value is in allowed list, false otherwise.
	 */
	public static function validate_enum( $value, array $allowed ): bool {
		return in_array( $value, $allowed, true );
	}

	/**
	 * Validates a boolean value.
	 *
	 * @param mixed $value The value to validate.
	 * @return bool True if valid boolean, false otherwise.
	 */
	public static function validate_boolean( $value ): bool {
		return is_bool( $value ) || rest_is_boolean( $value );
	}

	/**
	 * Validates a string by character length using mb_strlen (multibyte safe).
	 *
	 * @param mixed $value      The value to validate.
	 * @param int   $min_length Minimum string length.
	 * @param int   $max_length Maximum string length.
	 * @return bool True if valid, false otherwise.
	 */
	public static function validate_mb_string(
		$value,
		int $min_length = 1,
		int $max_length = 256
	): bool {
		if ( ! is_string( $value ) ) {
			return false;
		}
		$length = mb_strlen( $value );
		return $length >= $min_length && $length <= $max_length;
	}

	/**
	 * Validates an optional multibyte string.
	 *
	 * @param mixed $value      The value to validate.
	 * @param int   $max_length Maximum string length.
	 * @return bool True if valid or empty, false otherwise.
	 */
	public static function validate_optional_mb_string(
		$value,
		int $max_length = 256
	): bool {
		if ( empty( $value ) ) {
			return true; // Optional field.
		}
		if ( ! is_string( $value ) ) {
			return false;
		}
		return mb_strlen( $value ) <= $max_length;
	}
}
