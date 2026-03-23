<?php
/**
 * Admin asset lifecycle for WP React UI.
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Handles cache invalidation and asset enqueueing for the React shell.
 */
class WP_React_UI_Shell_Admin_Assets {

	/**
	 * Registers admin asset hooks.
	 *
	 * @return void
	 */
	public static function init(): void {
		add_action( 'admin_init', array( self::class, 'handle_admin_init' ) );
		add_action( 'admin_notices', array( self::class, 'render_shell_unavailable_notice' ) );
		add_action( 'activated_plugin', array( self::class, 'clear_menu_cache' ) );
		add_action( 'deactivated_plugin', array( self::class, 'clear_menu_cache' ) );
		add_action( 'after_switch_theme', array( self::class, 'clear_menu_cache' ) );
		add_action( 'set_user_role', array( self::class, 'clear_user_menu_cache' ), 10, 1 );
		add_action( 'profile_update', array( self::class, 'clear_user_menu_cache' ), 10, 1 );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue_admin_assets' ) );
	}

	/**
	 * Handles cache busting and admin housekeeping.
	 *
	 * @return void
	 */
	public static function handle_admin_init(): void {
		global $pagenow;
		if ( wp_react_ui_should_boot_shell( $pagenow ) ) {
			remove_action( 'in_admin_header', 'wp_admin_bar_render', 0 );
			remove_action( 'wp_head', '_admin_bar_bump_cb' );
		}

		$manifest_path = dirname( __DIR__ ) . '/dist/.vite/manifest.json';
		if ( file_exists( $manifest_path ) ) {
			$current_mtime = filemtime( $manifest_path );
			$cached_mtime  = get_option( 'wp_react_ui_manifest_mtime', 0 );

			if ( $current_mtime !== (int) $cached_mtime ) {
				WP_React_UI_Asset_Loader::clear_cache();
				update_option( 'wp_react_ui_manifest_mtime', $current_mtime );
			}
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( isset( $_GET['flush_react_cache'] ) && current_user_can( 'manage_options' )
			&& wp_verify_nonce( sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ?? '' ) ), 'flush_react_cache' ) ) {
			WP_React_UI_Asset_Loader::clear_cache();
			wp_safe_redirect( admin_url() );
			exit;
		}
	}

	/**
	 * Enqueues the React shell bundle and boot payload.
	 *
	 * @return void
	 */
	public static function enqueue_admin_assets(): void {
		global $pagenow;
		if ( ! wp_react_ui_should_boot_shell( $pagenow ) ) {
			return;
		}

		WP_React_UI_Asset_Loader::enqueue();
		wp_localize_script(
			'wp-react-ui',
			'wpReactUi',
			WP_React_UI_Shell_Localization::get_payload()
		);
	}

	/**
	 * Clears cached menu payloads.
	 *
	 * @return void
	 */
	public static function clear_menu_cache(): void {
		WP_React_UI_Menu_Cache::clear();
	}

	/**
	 * Clears cached menu payloads for one user when their role/profile changes.
	 *
	 * @param int $user_id User ID.
	 * @return void
	 */
	public static function clear_user_menu_cache( int $user_id ): void {
		WP_React_UI_Menu_Cache::clear_user( $user_id );
	}

	/**
	 * Renders a notice when shell-eligible screens fall back to native wp-admin
	 * because the built frontend assets are unavailable.
	 *
	 * @return void
	 */
	public static function render_shell_unavailable_notice(): void {
		global $pagenow;

		if ( wp_react_ui_is_embed_mode() || ! current_user_can( 'manage_options' ) ) {
			return;
		}

		if ( ! wp_react_ui_is_shell_page( $pagenow ) || WP_React_UI_Asset_Loader::can_boot_shell() ) {
			return;
		}

		echo '<div class="notice notice-error"><p><strong>WP React UI:</strong> Shell assets are unavailable, so native WordPress admin is being shown. Run <code>npm run build</code> and deploy the <code>dist/</code> directory.</p></div>';
	}
}
