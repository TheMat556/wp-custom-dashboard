<?php
/**
 * Boot payload compatibility contract.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Contracts;

use WpReactUi\Contracts\Generated\BootPayload;

/**
 * Lists the expected boot payload keys for compatibility tests.
 */
final class BootPayloadContract {

	/**
	 * Top-level boot payload keys.
	 *
	 * @var array<int, string>
	 */
	public const TOP_LEVEL_KEYS = BootPayload::TOP_LEVEL_KEYS;

	/**
	 * Branding payload keys.
	 *
	 * @var array<int, string>
	 */
	public const BRANDING_KEYS = BootPayload::BRANDING_KEYS;

	/**
	 * Branding logo payload keys.
	 *
	 * @var array<int, string>
	 */
	public const BRANDING_LOGO_KEYS = BootPayload::BRANDING_LOGO_KEYS;

	/**
	 * Navigation payload keys.
	 *
	 * @var array<int, string>
	 */
	public const NAVIGATION_KEYS = BootPayload::NAVIGATION_KEYS;

	/**
	 * User payload keys.
	 *
	 * @var array<int, string>
	 */
	public const USER_KEYS = BootPayload::USER_KEYS;

	/**
	 * Plugin route payload keys.
	 *
	 * @var array<int, string>
	 */
	public const SHELL_ROUTE_KEYS = BootPayload::SHELL_ROUTE_KEYS;
}
