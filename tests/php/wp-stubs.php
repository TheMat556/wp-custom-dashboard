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
	'actions'    => array(),
	'rest_routes' => array(),
	'localized_scripts' => array(),
	'capabilities' => array(
		'read'           => true,
		'manage_options' => true,
	),
	'is_user_logged_in' => true,
	'update_option_result' => true,
	'update_user_meta_result' => true,
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
		'actions'    => array(),
		'rest_routes' => array(),
		'localized_scripts' => array(),
		'capabilities' => array(
			'read'           => true,
			'manage_options' => true,
		),
		'is_user_logged_in' => true,
		'update_option_result' => true,
		'update_user_meta_result' => true,
		'user_id'    => 1,
		'settings_errors' => array(),
	);
}

/**
 * Returns all callbacks registered for a given action.
 *
 * @param string $hook Hook name.
 * @return array<int, mixed>
 */
function wp_test_get_actions( string $hook ): array {
	global $wp_test_state;
	return $wp_test_state['actions'][ $hook ] ?? array();
}

/**
 * Returns the registered REST routes.
 *
 * @return array<string, mixed>
 */
function wp_test_get_rest_routes(): array {
	global $wp_test_state;
	return $wp_test_state['rest_routes'];
}

/**
 * Returns a localized script payload by handle and object name.
 *
 * @param string $handle Script handle.
 * @param string $object_name JS object name.
 * @return mixed|null
 */
function wp_test_get_localized_script( string $handle, string $object_name ) {
	global $wp_test_state;
	return $wp_test_state['localized_scripts'][ $handle ][ $object_name ] ?? null;
}

/**
 * Normalizes an array to ordered keys for compatibility assertions.
 *
 * @param array $input Source array.
 * @return array<int, string>
 */
function wp_test_sorted_keys( array $input ): array {
	$keys = array_keys( $input );
	sort( $keys );
	return $keys;
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
		if ( false === $wp_test_state['update_option_result'] ) {
			return false;
		}
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

if ( ! function_exists( 'update_user_meta' ) ) {
	function update_user_meta( int $user_id, string $meta_key, $meta_value, $prev_value = '' ): bool {
		global $wp_test_state;
		if ( false === $wp_test_state['update_user_meta_result'] ) {
			return false;
		}
		$wp_test_state['user_meta'][ $user_id ][ $meta_key ] = $meta_value;
		return true;
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
		if ( 'version' === $show ) {
			return '6.7-test';
		}
		return '';
	}
}

if ( ! function_exists( 'wp_get_current_user' ) ) {
	function wp_get_current_user() {
		return (object) array(
			'ID'           => 1,
			'display_name' => 'Test Admin',
			'user_login'   => 'test-admin',
			'roles'        => array( 'administrator' ),
		);
	}
}

if ( ! function_exists( 'plugins_url' ) ) {
	function plugins_url( string $path = '', string $plugin = '' ): string {
		return 'http://localhost/wp-content/plugins/wp-custom-dashboard/' . $path;
	}
}

if ( ! function_exists( 'plugin_dir_path' ) ) {
	function plugin_dir_path( string $path ): string {
		return dirname( $path ) . '/';
	}
}

if ( ! function_exists( 'plugin_dir_url' ) ) {
	function plugin_dir_url( string $path ): string {
		return 'http://localhost/wp-content/plugins/wp-custom-dashboard/';
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
		global $wp_test_state;
		return $wp_test_state['capabilities'][ $capability ] ?? true;
	}
}

if ( ! function_exists( 'is_user_logged_in' ) ) {
	function is_user_logged_in(): bool {
		global $wp_test_state;
		return (bool) $wp_test_state['is_user_logged_in'];
	}
}

if ( ! function_exists( 'add_action' ) ) {
	function add_action( string $hook, $callback, int $priority = 10, int $accepted_args = 1 ): bool {
		global $wp_test_state;
		$wp_test_state['actions'][ $hook ][] = array(
			'callback'      => $callback,
			'priority'      => $priority,
			'accepted_args' => $accepted_args,
		);
		return true;
	}
}

if ( ! function_exists( 'admin_url' ) ) {
	function admin_url( string $path = '' ): string {
		return 'http://localhost/wp-admin/' . ltrim( $path, '/' );
	}
}

if ( ! function_exists( 'home_url' ) ) {
	function home_url( string $path = '' ): string {
		return 'http://localhost/' . ltrim( $path, '/' );
	}
}

if ( ! function_exists( 'rest_url' ) ) {
	function rest_url( string $path = '' ): string {
		return 'http://localhost/wp-json/' . ltrim( $path, '/' );
	}
}

if ( ! function_exists( 'wp_create_nonce' ) ) {
	function wp_create_nonce( string $action = '' ): string {
		return 'test-rest-nonce';
	}
}

if ( ! function_exists( 'wp_logout_url' ) ) {
	function wp_logout_url( string $redirect = '' ): string {
		return 'http://localhost/wp-login.php?action=logout';
	}
}

if ( ! function_exists( 'get_locale' ) ) {
	function get_locale(): string {
		return 'en_US';
	}
}

if ( ! function_exists( 'register_rest_route' ) ) {
	function register_rest_route( string $namespace, string $route, array $args, bool $override = false ): bool {
		global $wp_test_state;
		$wp_test_state['rest_routes'][ $namespace . $route ] = array(
			'namespace' => $namespace,
			'route'     => $route,
			'args'      => $args,
			'override'  => $override,
		);
		return true;
	}
}

if ( ! function_exists( 'rest_ensure_response' ) ) {
	function rest_ensure_response( $response ) {
		return $response;
	}
}

if ( ! function_exists( 'wp_localize_script' ) ) {
	function wp_localize_script( string $handle, string $object_name, $l10n ): bool {
		global $wp_test_state;
		$wp_test_state['localized_scripts'][ $handle ][ $object_name ] = $l10n;
		return true;
	}
}

if ( ! function_exists( 'wp_count_comments' ) ) {
	function wp_count_comments() {
		return (object) array( 'moderated' => 0 );
	}
}

if ( ! function_exists( 'wp_get_update_data' ) ) {
	function wp_get_update_data(): array {
		return array(
			'counts' => array(
				'total'   => 0,
				'plugins' => 0,
				'themes'  => 0,
			),
		);
	}
}

if ( ! function_exists( 'wp_count_posts' ) ) {
	function wp_count_posts( string $post_type = 'post' ) {
		return (object) array(
			'publish' => 0,
			'draft'   => 0,
		);
	}
}

if ( ! function_exists( 'count_users' ) ) {
	function count_users(): array {
		return array( 'total_users' => 0 );
	}
}

if ( ! function_exists( 'get_site_transient' ) ) {
	function get_site_transient( string $transient ) {
		if ( 'update_plugins' === $transient || 'update_core' === $transient ) {
			return (object) array(
				'response'     => array(),
				'updates'      => array(),
				'last_checked' => null,
			);
		}
		if ( 'update_themes' === $transient ) {
			return (object) array( 'response' => array() );
		}
		return false;
	}
}

if ( ! function_exists( 'wp_get_theme' ) ) {
	function wp_get_theme( string $stylesheet = '' ) {
		return new class() {
			public function get( string $key ): string {
				return '';
			}
		};
	}
}

if ( ! function_exists( 'get_plugin_data' ) ) {
	function get_plugin_data( string $plugin_file, bool $markup = true, bool $translate = true ): array {
		return array(
			'Name'    => basename( $plugin_file, '.php' ),
			'Version' => '0.0.0-test',
		);
	}
}

if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		private string $code;
		private string $message;
		private $data;

		public function __construct( string $code = '', string $message = '', $data = null ) {
			$this->code    = $code;
			$this->message = $message;
			$this->data    = $data;
		}

		public function get_error_message(): string {
			return $this->message;
		}

		public function get_error_code(): string {
			return $this->code;
		}

		public function get_error_data() {
			return $this->data;
		}
	}
}

if ( ! function_exists( 'is_wp_error' ) ) {
	function is_wp_error( $thing ): bool {
		return $thing instanceof WP_Error;
	}
}

if ( ! function_exists( 'wp_remote_get' ) ) {
	function wp_remote_get( string $url, array $args = array() ) {
		return new WP_Error( 'stubbed_remote_get', 'Remote GET disabled in tests' );
	}
}

if ( ! function_exists( 'wp_remote_head' ) ) {
	function wp_remote_head( string $url, array $args = array() ) {
		return new WP_Error( 'stubbed_remote_head', 'Remote HEAD disabled in tests' );
	}
}

if ( ! function_exists( 'wp_remote_retrieve_response_code' ) ) {
	function wp_remote_retrieve_response_code( $response ): int {
		if ( is_array( $response ) && isset( $response['response']['code'] ) ) {
			return (int) $response['response']['code'];
		}
		return 0;
	}
}

if ( ! function_exists( 'current_time' ) ) {
	function current_time( string $type = 'mysql', bool $gmt = false ) {
		return 'timestamp' === $type ? time() : gmdate( 'Y-m-d H:i:s' );
	}
}

if ( ! function_exists( 'human_time_diff' ) ) {
	function human_time_diff( int $from, int $to = 0 ): string {
		return '0 seconds';
	}
}

if ( ! function_exists( 'get_posts' ) ) {
	function get_posts( array $args = array() ): array {
		return array();
	}
}

if ( ! function_exists( 'get_permalink' ) ) {
	function get_permalink( int $post_id ): string {
		return 'http://localhost/?p=' . $post_id;
	}
}

if ( ! function_exists( 'get_edit_post_link' ) ) {
	function get_edit_post_link( int $post_id, string $context = '' ): string {
		return 'http://localhost/wp-admin/post.php?post=' . $post_id . '&action=edit';
	}
}

if ( ! function_exists( 'get_home_url' ) ) {
	function get_home_url( $blog_id = null, string $path = '', string $scheme = null ): string {
		return home_url( $path );
	}
}

if ( ! function_exists( 'is_plugin_active' ) ) {
	function is_plugin_active( string $plugin ): bool {
		return false;
	}
}

if ( ! function_exists( 'delete_option' ) ) {
	function delete_option( string $option ): bool {
		global $wp_test_state;
		unset( $wp_test_state['options'][ $option ] );
		return true;
	}
}

if ( ! function_exists( 'wp_safe_redirect' ) ) {
	function wp_safe_redirect( string $location, int $status = 302 ): bool {
		return true;
	}
}

if ( ! function_exists( 'wp_verify_nonce' ) ) {
	function wp_verify_nonce( string $nonce, string $action = '' ): bool {
		return true;
	}
}

if ( ! function_exists( 'remove_action' ) ) {
	function remove_action( string $hook, $callback, int $priority = 10 ): bool {
		return true;
	}
}

if ( ! function_exists( 'wp_enqueue_media' ) ) {
	function wp_enqueue_media(): void {
	}
}

if ( ! function_exists( 'wp_enqueue_script' ) ) {
	function wp_enqueue_script( string $handle, string $src = '', array $deps = array(), $ver = false, bool $in_footer = false ): bool {
		return true;
	}
}

if ( ! function_exists( 'add_filter' ) ) {
	function add_filter( string $hook, $callback, int $priority = 10, int $accepted_args = 1 ): bool {
		return true;
	}
}

if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( string $key ): string {
		return strtolower( preg_replace( '/[^a-zA-Z0-9_\-]/', '', $key ) );
	}
}

if ( ! function_exists( 'sanitize_hex_color' ) ) {
	function sanitize_hex_color( string $color ): string {
		return preg_match( '/^#(?:[0-9a-fA-F]{3}){1,2}$/', $color ) ? strtolower( $color ) : '';
	}
}

if ( ! function_exists( 'esc_url_raw' ) ) {
	function esc_url_raw( string $url ): string {
		return $url;
	}
}

if ( ! function_exists( 'wp_parse_url' ) ) {
	function wp_parse_url( string $url, int $component = -1 ) {
		return parse_url( $url, $component );
	}
}

if ( ! function_exists( 'untrailingslashit' ) ) {
	function untrailingslashit( string $value ): string {
		return rtrim( $value, '/' );
	}
}

if ( ! class_exists( 'WP_REST_Request' ) ) {
	class WP_REST_Request {
		/** @var array<string, mixed> */
		private array $params;

		/** @var mixed */
		private $json_params;

		public function __construct( array $params = array(), $json_params = array() ) {
			$this->params      = $params;
			$this->json_params = $json_params;
		}

		public function get_param( string $key ) {
			return $this->params[ $key ] ?? null;
		}

		public function get_json_params() {
			return $this->json_params;
		}
	}
}

if ( ! function_exists( 'get_userdata' ) ) {
	function get_userdata( int $user_id ) {
		return (object) array(
			'ID'           => $user_id,
			'display_name' => 'User ' . $user_id,
		);
	}
}

if ( ! function_exists( 'wp_is_post_revision' ) ) {
	function wp_is_post_revision( int $post_id ): bool {
		return false;
	}
}

if ( ! function_exists( 'wp_is_post_autosave' ) ) {
	function wp_is_post_autosave( int $post_id ): bool {
		return false;
	}
}

global $wpdb;

if ( ! isset( $wpdb ) ) {
	$wpdb = new class() {
		public string $prefix = 'wp_';
		public string $posts = 'wp_posts';

		public function get_var( $query ) {
			return '';
		}

		public function get_col( $query ): array {
			return array();
		}

		public function get_results( $query, $output = OBJECT ): array {
			return array();
		}

		public function prepare( string $query, ...$args ): string {
			return $query;
		}
	};
}
