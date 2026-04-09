<?php
/**
 * Embed mode handling for WP React UI.
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Handles iframe-rendered admin screens.
 */
class WP_React_UI_Shell_Embed_Mode {

	/**
	 * Registers embed-mode hooks.
	 *
	 * @return void
	 */
	public static function init(): void {
		add_action( 'admin_head', array( self::class, 'render_reset_styles' ), 0 );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue_bridge_script' ) );
		add_filter( 'wp_redirect', array( self::class, 'preserve_redirect' ) );
	}

	/**
	 * Removes native chrome from iframe-rendered admin screens.
	 *
	 * @return void
	 */
	public static function render_reset_styles(): void {
		if ( ! wp_react_ui_is_embed_mode() ) {
			return;
		}

		echo '<style id="wp-react-ui-embed-reset">
html, body { margin: 0 !important; padding: 0 !important; height: 100% !important; min-height: 100% !important; overflow: auto !important; background: transparent !important; }
html.wp-toolbar { padding-top: 0 !important; }
#wpwrap, #wpbody, #wpcontent, #wpbody-content { height: 100% !important; min-height: 100% !important; }
#adminmenuback, #adminmenuwrap, #adminmenumain, #wpadminbar, #wpfooter { display: none !important; }
#wpbody { padding-top: 0 !important; }
#wpcontent { margin-left: 0 !important; float: none !important; }
#wpbody-content { margin-top: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; }
#wpwrap { display: block !important; }
</style>';
	}

	/**
	 * Enqueues the embed bridge script into iframe-rendered admin screens.
	 *
	 * @return void
	 */
	public static function enqueue_bridge_script(): void {
		if ( ! wp_react_ui_is_embed_mode() ) {
			return;
		}

		$bridge_url = WP_React_UI_Asset_Loader::get_entry_asset_url( 'src/embedBridge.ts' );
		if ( ! $bridge_url ) {
			return;
		}

		wp_enqueue_script(
			'wp-react-ui-embed-bridge',
			$bridge_url,
			array(),
			null, // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
			true
		);

		wp_localize_script(
			'wp-react-ui-embed-bridge',
			'wpReactUiEmbed',
			array(
				'openInNewTabPatterns' => WP_React_UI_Branding_Settings::get_navigation_preferences()['openInNewTabPatterns'],
				'shellRouteSlugs'      => WP_React_UI_Shell_Localization::get_shell_route_slugs(),
				'selfPluginBasename'   => plugin_basename( dirname( __DIR__, 3 ) . '/wp-custom-dashboard.php' ),
			)
		);

		add_filter(
			'script_loader_tag',
			function ( $tag, $handle ) {
				if ( 'wp-react-ui-embed-bridge' === $handle ) {
					$tag = str_replace( '<script ', '<script type="module" crossorigin ', $tag );
				}
				return $tag;
			},
			10,
			2
		);
	}

	/**
	 * Preserves embed mode across admin redirects triggered inside the iframe.
	 *
	 * @param string $location Redirect target.
	 * @return string
	 */
	public static function preserve_redirect( string $location ): string {
		if ( ! wp_react_ui_is_embed_mode() ) {
			return $location;
		}

		$path              = wp_parse_url( $location, PHP_URL_PATH );
		$admin_path_prefix = wp_react_ui_get_admin_path_prefix();

		if ( is_string( $path ) && ( $path === $admin_path_prefix || str_starts_with( $path, $admin_path_prefix . '/' ) ) ) {
			return add_query_arg( 'wp_shell_embed', '1', $location );
		}

		return $location;
	}
}
