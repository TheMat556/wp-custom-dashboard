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
	 * @param mixed  $value     The value to validate.
	 * @param int    $min_length Minimum string length (default 1).
	 * @param int    $max_length Maximum string length (default 256).
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
	 * @param mixed  $value     The value to validate.
	 * @param int    $max_length Maximum string length (default 256).
	 * @return bool True if valid or empty, false otherwise.
	 */
	public static function validate_optional_string(
		$value,
		int $max_length = 256
	): bool {
		if ( empty( $value ) ) {
			return true; // Optional field
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
			return true; // Optional field
		}
		return self::validate_url( $value );
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
			return true; // Optional field
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
	 * @param mixed  $value      The value to validate.
	 * @param int    $min_length Minimum string length.
	 * @param int    $max_length Maximum string length.
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
	 * @param mixed  $value      The value to validate.
	 * @param int    $max_length Maximum string length.
	 * @return bool True if valid or empty, false otherwise.
	 */
	public static function validate_optional_mb_string(
		$value,
		int $max_length = 256
	): bool {
		if ( empty( $value ) ) {
			return true; // Optional field
		}
		if ( ! is_string( $value ) ) {
			return false;
		}
		return mb_strlen( $value ) <= $max_length;
	}
}
