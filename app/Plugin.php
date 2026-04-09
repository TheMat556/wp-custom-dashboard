<?php
/**
 * Plugin composition root wrapper.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi;

use WpReactUi\Bootstrap\PluginBootstrap;

defined( 'ABSPATH' ) || exit;

/**
 * Thin application entrypoint for the legacy plugin runtime.
 */
final class Plugin {

	/**
	 * Boots the plugin through the additive bootstrap layer.
	 *
	 * @return void
	 */
	public static function boot(): void {
		PluginBootstrap::boot();
	}
}
