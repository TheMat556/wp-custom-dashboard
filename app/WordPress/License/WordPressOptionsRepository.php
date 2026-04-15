<?php
/**
 * WordPress options repository adapter.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\WordPress\License;

use WpReactUi\License\Contracts\OptionsRepositoryInterface;

defined('ABSPATH') || exit;

/**
 * Implements OptionsRepositoryInterface using WordPress options.
 *
 * Maps the domain layer options interface to WordPress option functions,
 * allowing the domain to remain framework-agnostic while using WordPress
 * infrastructure in production.
 */
final class WordPressOptionsRepository implements OptionsRepositoryInterface {
	/**
	 * Retrieves an option value using WordPress get_option.
	 *
	 * @param string $key Option key.
	 * @param mixed  $default Default value if option not found.
	 * @return mixed Option value, or $default if not found.
	 */
	public function get(string $key, mixed $default = null): mixed {
		return get_option($key, $default);
	}

	/**
	 * Updates an option value using WordPress update_option.
	 *
	 * @param string $key Option key.
	 * @param mixed  $value New value.
	 * @return bool True on success, false on failure.
	 */
	public function update(string $key, mixed $value): bool {
		return false !== update_option($key, $value);
	}

	/**
	 * Deletes an option using WordPress delete_option.
	 *
	 * @param string $key Option key.
	 * @return bool True on success, false on failure.
	 */
	public function delete(string $key): bool {
		return delete_option($key);
	}
}
