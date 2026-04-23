<?php
/**
 * WordPress filter hook adapter.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\WordPress\License;

use WpReactUi\License\Contracts\FeatureFilterInterface;

defined( 'ABSPATH' ) || exit;

/**
 * Implements FeatureFilterInterface using WordPress apply_filters.
 *
 * Maps the domain layer filter interface to WordPress filter functions,
 * allowing the domain to remain framework-agnostic while using WordPress
 * hooks in production.
 */
final class WordPressFeatureFilter implements FeatureFilterInterface {
	/**
	 * Applies a WordPress filter hook to a feature array.
	 *
	 * @param string        $hook Hook name.
	 * @param array<string> $features Feature identifiers.
	 * @return array<string> Filtered features.
	 */
	public function filter( string $hook, array $features ): array {
		/**
		 * Filters the allowed features list.
		 *
		 * @param array<string> $features Feature identifiers.
		 */
		$filtered = apply_filters( $hook, $features );

		// Ensure the filter result is still an array.
		return is_array( $filtered ) ? $filtered : $features;
	}
}
