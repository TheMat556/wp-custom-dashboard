<?php
/**
 * REST route compatibility contract.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Contracts;

use WpReactUi\Contracts\Generated\Routes;

/**
 * Lists the existing route names and top-level response keys.
 */
final class RestRouteContract {

	/**
	 * Current REST namespace.
	 */
	public const REST_NAMESPACE = Routes::REST_NAMESPACE;

	/**
	 * Route definitions keyed by path.
	 *
	 * @var array<string, array{name: string, methods: array<int, string>, permission: string, featureFlag: string|null, requestSchema: string|null, requestKeys: array<int, string>, responseSchema: string|null, responseKeys: array<int, string>}>
	 */
	public const ROUTES = Routes::DEFINITIONS;

	/**
	 * Returns the expected route paths.
	 *
	 * @return array<int, string>
	 */
	public static function route_paths(): array {
		return Routes::route_paths();
	}
}
