<?php
/**
 * Shell bootstrap orchestration for WP React UI.
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Thin bootstrapper for shell-related subsystems.
 */
class WP_React_UI_Shell_Bootstrap {

	/**
	 * Registers plugin hooks for the admin shell lifecycle.
	 *
	 * @return void
	 */
	public static function init(): void {
		WP_React_UI_Shell_Embed_Mode::init();
		WP_React_UI_Shell_Early_Boot::init();
		WP_React_UI_Shell_Admin_Assets::init();
		\WpReactUi\WordPress\Chat\ChatPage::init();
		\WpReactUi\WordPress\License\LicenseSettings::init();

		add_action( 'rest_api_init', array( 'WP_React_UI_REST_API', 'register' ) );
	}
}
