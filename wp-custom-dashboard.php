<?php
/**
 * Plugin Name: WP React UI
 * Description: Replaces Navbar and Sidebar with React + Ant Design
 * Version: 1.0.0
 * Requires PHP: 8.0
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/includes/class-wp-react-ui-asset-loader.php';
require_once __DIR__ . '/includes/class-wp-react-ui-branding-settings.php';
require_once __DIR__ . '/includes/class-wp-react-ui-menu-cache.php';
require_once __DIR__ . '/includes/class-wp-react-ui-menu-repository.php';
require_once __DIR__ . '/includes/class-wp-react-ui-rest-api.php';
require_once __DIR__ . '/includes/class-wp-react-ui-shell-localization.php';
require_once __DIR__ . '/includes/class-wp-react-ui-shell-admin-assets.php';
require_once __DIR__ . '/includes/class-wp-react-ui-shell-early-boot.php';
require_once __DIR__ . '/includes/class-wp-react-ui-shell-embed-mode.php';
require_once __DIR__ . '/includes/class-wp-react-ui-shell-bootstrap.php';

WP_React_UI_Branding_Settings::init();
WP_React_UI_Shell_Bootstrap::init();

/**
 * Returns the admin screens that need special handling.
 *
 * Shell_disabled_pagenow:
 * - Do not bootstrap the React shell on these core editors.
 *
 * Full_reload_page_params:
 * - Legacy field, kept for backward compat. With the iframe shell every page
 *   gets a fresh execution context so forced full reloads are no longer needed.
 *
 * Breakout_pagenow:
 * - Pages that must load as the top-level document instead of inside the iframe.
 *
 * @return array{shell_disabled_pagenow: string[], full_reload_page_params: string[], breakout_pagenow: string[]}
 */
function wp_react_ui_get_special_page_config(): array {
	return array(
		'shell_disabled_pagenow' => array(
			'post.php',
			'post-new.php',
			'site-editor.php',
		),
		'full_reload_page_params' => array(
			'site-health',
			'h-bricks-elements',
		),
		'breakout_pagenow' => array(
			'post.php',
			'post-new.php',
			'site-editor.php',
			'customize.php',
			'export.php',
		),
	);
}

/**
 * Returns the current site's wp-admin path prefix without a trailing slash.
 *
 * @return string
 */
function wp_react_ui_get_admin_path_prefix(): string {
	$admin_path = wp_parse_url( admin_url(), PHP_URL_PATH );

	if ( ! is_string( $admin_path ) || '' === $admin_path ) {
		return '/wp-admin';
	}

	return untrailingslashit( $admin_path );
}

/**
 * Returns true when the current request is loading inside the shell iframe.
 *
 * @return bool
 */
function wp_react_ui_is_embed_mode(): bool {
	// phpcs:disable WordPress.Security.NonceVerification
	$get_embed = isset( $_GET['wp_shell_embed'] ) && '1' === sanitize_text_field( wp_unslash( $_GET['wp_shell_embed'] ) );
	$post_embed = false;

	if ( isset( $_POST['wp_shell_embed'] ) ) {
		$post_embed = '1' === sanitize_text_field( wp_unslash( $_POST['wp_shell_embed'] ) );
	}
	// phpcs:enable

	return $get_embed || $post_embed;
}

/**
 * Determines whether the current admin screen is eligible for the React shell.
 *
 * @param string|null $pagenow Current admin filename.
 * @return bool
 */
function wp_react_ui_is_shell_page( ?string $pagenow = null ): bool {
	if ( wp_react_ui_is_embed_mode() ) {
		return false;
	}

	$current_page = is_string( $pagenow ) ? $pagenow : ( $GLOBALS['pagenow'] ?? '' );
	$config       = wp_react_ui_get_special_page_config();
	$disabled     = array_unique(
		array_merge(
			$config['shell_disabled_pagenow'],
			$config['breakout_pagenow']
		)
	);

	return ! in_array( $current_page, $disabled, true );
}

/**
 * Determines whether the React shell should bootstrap on the current admin screen.
 *
 * The shell only boots when the current page is eligible and the frontend entry
 * asset can be resolved. If assets are missing, the plugin falls back to the
 * native WordPress admin UI instead of risking a broken shell.
 *
 * @param string|null $pagenow Current admin filename.
 * @return bool
 */
function wp_react_ui_should_boot_shell( ?string $pagenow = null ): bool {
	return wp_react_ui_is_shell_page( $pagenow ) && WP_React_UI_Asset_Loader::can_boot_shell();
}
