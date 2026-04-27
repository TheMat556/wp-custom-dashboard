<?php

declare(strict_types=1);

/**
 * AUTO-GENERATED from contracts/source. Do not edit.
 */

namespace WpReactUi\Contracts\Generated;

defined( 'ABSPATH' ) || exit;

final class BootPayload {
	public const TOP_LEVEL_KEYS = array(
		'menu',
		'siteName',
		'branding',
		'theme',
		'adminUrl',
		'publicUrl',
		'navigation',
		'nonce',
		'restUrl',
		'logoutUrl',
		'assetsUrl',
		'locale',
		'user',
		'license',
		'shellRoutes'
	);
	public const BRANDING_KEYS = array(
		'siteName',
		'logos',
		'useLongLogo',
		'primaryColor',
		'fontPreset'
	);
	public const BRANDING_LOGO_KEYS = array(
		'lightUrl',
		'darkUrl',
		'longUrl',
		'defaultUrl'
	);
	public const NAVIGATION_KEYS = array(
		'fullReloadPageParams',
		'shellDisabledPagenow',
		'breakoutPagenow',
		'openInNewTabPatterns'
	);
	public const USER_KEYS = array(
		'name',
		'role',
		'canManageOptions'
	);
	public const SHELL_ROUTE_KEYS = array(
		'slug',
		'label',
		'entrypoint_url'
	);
}
