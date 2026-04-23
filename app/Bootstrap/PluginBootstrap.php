<?php
/**
 * Additive bootstrap/composition root for the legacy plugin.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Bootstrap;

defined( 'ABSPATH' ) || exit;

/**
 * Boots the existing legacy modules in their current order.
 */
final class PluginBootstrap {

	/**
	 * Returns the current legacy boot sequence.
	 *
	 * @return array<int, class-string>
	 */
	public static function legacy_init_sequence(): array {
		return array(
			'WP_React_UI_Branding_Settings',
			'WP_React_UI_Shell_Bootstrap',
			'WP_React_UI_Activity_Log',
			'WP_React_UI_Dashboard_Data',
		);
	}

	/**
	 * Boots the plugin without altering legacy runtime behavior.
	 *
	 * @return void
	 */
	public static function boot(): void {
		// Run option migrations before any other initialization.
		OptionsMigration::run();

		foreach ( self::legacy_init_sequence() as $class_name ) {
			if ( class_exists( $class_name ) && is_callable( array( $class_name, 'init' ) ) ) {
				$class_name::init();
			}
		}
	}
}
