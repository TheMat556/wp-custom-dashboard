<?php
/**
 * Feature filter interface — domain layer abstraction.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License\Contracts;

defined('ABSPATH') || exit;

/**
 * Filter interface for applying plugin hooks to feature lists.
 *
 * Abstracts away WordPress filter functions from the domain layer,
 * enabling pure unit testing without framework dependencies.
 */
interface FeatureFilterInterface {
	/**
	 * Applies a filter hook to a feature array.
	 *
	 * @param string   $hook Hook name.
	 * @param array<string> $features Feature identifiers.
	 * @return array<string> Filtered features.
	 */
	public function filter(string $hook, array $features): array;
}
