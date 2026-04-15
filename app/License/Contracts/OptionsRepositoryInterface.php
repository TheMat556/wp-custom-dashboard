<?php
/**
 * Options storage interface — domain layer abstraction.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License\Contracts;

defined('ABSPATH') || exit;

/**
 * Repository interface for persistent options storage.
 *
 * Abstracts away WordPress option functions from the domain layer,
 * enabling pure unit testing without framework dependencies.
 */
interface OptionsRepositoryInterface {
	/**
	 * Retrieves an option value.
	 *
	 * @param string $key Option key.
	 * @param mixed  $default Default value if option not found.
	 * @return mixed Option value, or $default if not found.
	 */
	public function get(string $key, mixed $default = null): mixed;

	/**
	 * Updates an option value.
	 *
	 * @param string $key Option key.
	 * @param mixed  $value New value.
	 * @return bool True on success, false on failure.
	 */
	public function update(string $key, mixed $value): bool;

	/**
	 * Deletes an option.
	 *
	 * @param string $key Option key.
	 * @return bool True on success, false on failure.
	 */
	public function delete(string $key): bool;
}
