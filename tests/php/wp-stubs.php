<?php
/**
 * Minimal WordPress function stubs for unit testing.
 *
 * Each stub is defined only if the real function does not exist,
 * allowing the same tests to run with or without WP loaded.
 *
 * Tests can override behaviour via the global $wp_test_state array.
 */

global $wp_test_state;

$wp_test_state = array(
	'options'    => array(),
	'transients' => array(),
	'user_meta'  => array(),
	'posts'      => array(),
	'user_id'    => 1,
	'settings_errors' => array(),
);

/**
 * Reset test state between tests.
 */
function wp_test_reset_state(): void {
	global $wp_test_state;
	$wp_test_state = array(
		'options'    => array(),
		'transients' => array(),
		'user_meta'  => array(),
		'posts'      => array(),
		'user_id'    => 1,
		'settings_errors' => array(),
	);
}

if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	function wp_strip_all_tags( string $text, bool $remove_breaks = false ): string {
		$text = strip_tags( $text );
		if ( $remove_breaks ) {
			$text = preg_replace( '/[\r\n\t ]+/', ' ', $text );
		}
		return trim( $text );
	}
}

if ( ! function_exists( 'absint' ) ) {
	function absint( $value ): int {
		return abs( (int) $value );
	}
}

if ( ! function_exists( 'get_option' ) ) {
	function get_option( string $option, $default = false ) {
		global $wp_test_state;
		return $wp_test_state['options'][ $option ] ?? $default;
	}
}

if ( ! function_exists( 'update_option' ) ) {
	function update_option( string $option, $value, $autoload = null ): bool {
		global $wp_test_state;
		$wp_test_state['options'][ $option ] = $value;
		return true;
	}
}

if ( ! function_exists( 'get_transient' ) ) {
	function get_transient( string $key ) {
		global $wp_test_state;
		return $wp_test_state['transients'][ $key ] ?? false;
	}
}

if ( ! function_exists( 'set_transient' ) ) {
	function set_transient( string $key, $value, int $expiration = 0 ): bool {
		global $wp_test_state;
		$wp_test_state['transients'][ $key ] = $value;
		return true;
	}
}

if ( ! function_exists( 'delete_transient' ) ) {
	function delete_transient( string $key ): bool {
		global $wp_test_state;
		unset( $wp_test_state['transients'][ $key ] );
		return true;
	}
}

if ( ! function_exists( 'get_current_user_id' ) ) {
	function get_current_user_id(): int {
		global $wp_test_state;
		return $wp_test_state['user_id'];
	}
}

if ( ! function_exists( 'get_user_meta' ) ) {
	function get_user_meta( int $user_id, string $key = '', bool $single = false ) {
		global $wp_test_state;
		$val = $wp_test_state['user_meta'][ $user_id ][ $key ] ?? null;
		if ( $single ) {
			return $val ?? '';
		}
		return $val !== null ? array( $val ) : array();
	}
}

if ( ! function_exists( 'get_post' ) ) {
	function get_post( $id ) {
		global $wp_test_state;
		return $wp_test_state['posts'][ $id ] ?? null;
	}
}

if ( ! function_exists( 'wp_attachment_is_image' ) ) {
	function wp_attachment_is_image( int $id ): bool {
		global $wp_test_state;
		$post = $wp_test_state['posts'][ $id ] ?? null;
		return $post && ( $post->is_image ?? false );
	}
}

if ( ! function_exists( 'wp_get_attachment_image_url' ) ) {
	function wp_get_attachment_image_url( int $id, $size = 'thumbnail' ) {
		global $wp_test_state;
		$post = $wp_test_state['posts'][ $id ] ?? null;
		return $post ? ( $post->url ?? false ) : false;
	}
}

if ( ! function_exists( 'get_bloginfo' ) ) {
	function get_bloginfo( string $show = '' ): string {
		if ( 'name' === $show ) {
			return 'Test Site';
		}
		return '';
	}
}

if ( ! function_exists( 'plugins_url' ) ) {
	function plugins_url( string $path = '', string $plugin = '' ): string {
		return 'http://localhost/wp-content/plugins/wp-custom-dashboard/' . $path;
	}
}

if ( ! function_exists( 'get_post_types' ) ) {
	function get_post_types( $args = array() ): array {
		return array( 'post', 'page' );
	}
}

if ( ! function_exists( 'post_type_supports' ) ) {
	function post_type_supports( string $post_type, string $feature ): bool {
		// Default: 'post' supports comments, 'page' does not.
		return 'post' === $post_type && 'comments' === $feature;
	}
}

if ( ! function_exists( 'wp_parse_args' ) ) {
	function wp_parse_args( $args, $defaults = array() ): array {
		if ( is_object( $args ) ) {
			$args = get_object_vars( $args );
		} elseif ( ! is_array( $args ) ) {
			parse_str( $args, $args );
		}
		return array_merge( $defaults, $args );
	}
}

if ( ! function_exists( 'sanitize_text_field' ) ) {
	function sanitize_text_field( string $str ): string {
		return trim( strip_tags( $str ) );
	}
}

if ( ! function_exists( 'wp_unslash' ) ) {
	function wp_unslash( $value ) {
		return is_string( $value ) ? stripslashes( $value ) : $value;
	}
}

if ( ! function_exists( 'add_settings_error' ) ) {
	function add_settings_error( string $setting, string $code, string $message, string $type = 'error' ): void {
		global $wp_test_state;
		$wp_test_state['settings_errors'][] = array(
			'setting' => $setting,
			'code'    => $code,
			'message' => $message,
			'type'    => $type,
		);
	}
}

if ( ! function_exists( 'apply_filters' ) ) {
	function apply_filters( string $hook, ...$args ) {
		return $args[0] ?? null;
	}
}

if ( ! function_exists( 'current_user_can' ) ) {
	function current_user_can( string $capability ): bool {
		return true;
	}
}
