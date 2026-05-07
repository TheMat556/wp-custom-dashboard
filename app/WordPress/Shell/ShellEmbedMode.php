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
		add_filter( 'wp_die_handler', array( self::class, 'get_die_handler' ) );
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

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- hardcoded embed-reset CSS, not user input.
		echo '<style id="wp-react-ui-embed-reset">' . self::get_embed_reset_css() . '</style>';
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
			self::get_embed_localization_data()
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

	/**
	 * Returns a wrapped die handler that injects the embed bridge into wp_die() output.
	 *
	 * When a page inside the iframe triggers wp_die() (e.g. nonce verification failure),
	 * the normal admin_enqueue_scripts hook never fires, so the embed bridge script is
	 * never loaded. Without the bridge, links on the error page navigate the top-level
	 * page instead of the iframe, causing the shell to boot a second time.
	 *
	 * This wrapper captures the default handler's HTML output and injects the bridge
	 * script and embed-reset styles before </body>.
	 *
	 * @param callable $default_handler The original wp_die handler.
	 * @return callable The wrapped handler.
	 */
	public static function get_die_handler( callable $default_handler ): callable {
		if ( ! wp_react_ui_is_embed_mode() ) {
			return $default_handler;
		}

		return function ( string $message, string $title = '', array $args = array() ) use ( $default_handler ): void {
			// Suppress exit so we can capture and modify the output.
			$args['exit'] = false;

			ob_start();
			try {
				$default_handler( $message, $title, $args );
			} finally {
				$html = ob_get_clean();
			}

			$injection = self::get_bridge_injection_markup();
			if ( $injection && str_contains( $html, '</body>' ) ) {
				$html = str_replace( '</body>', $injection . '</body>', $html );
			}

			echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

			// The original handler's exit was suppressed; replicate it now.
			die();
		};
	}

	/**
	 * Builds the markup to inject the embed bridge into a wp_die() page.
	 *
	 * Includes the embed-reset styles, the wpReactUiEmbed localization data,
	 * and the embedBridge module script.
	 *
	 * @return string The HTML markup, or empty string if the bridge asset is unavailable.
	 */
	private static function get_bridge_injection_markup(): string {
		$bridge_url = WP_React_UI_Asset_Loader::get_entry_asset_url( 'src/embedBridge.ts' );
		if ( ! $bridge_url ) {
			return '';
		}

		$styles = '<style id="wp-react-ui-embed-reset">' . self::get_embed_reset_css() . '</style>';

		$localization = '<script>window.wpReactUiEmbed=' . wp_json_encode( self::get_embed_localization_data() ) . ';</script>';
		// phpcs:ignore WordPress.WP.EnqueuedResources.NonEnqueuedScript -- wp_die() bypasses admin_enqueue_scripts; output-buffer injection is the only option.
		$bridge_tag = '<script type="module" crossorigin src="' . esc_url( $bridge_url ) . '"></script>';

		return $styles . $localization . $bridge_tag;
	}

	/**
	 * Returns the embed bridge localization payload.
	 *
	 * @return array The data passed to window.wpReactUiEmbed.
	 */
	private static function get_embed_localization_data(): array {
		return array(
			'openInNewTabPatterns' => WP_React_UI_Branding_Settings::get_navigation_preferences()['openInNewTabPatterns'],
			'shellRouteSlugs'      => WP_React_UI_Shell_Localization::get_shell_route_slugs(),
			'selfPluginBasename'   => plugin_basename( dirname( __DIR__, 3 ) . '/wp-custom-dashboard.php' ),
		);
	}

	/**
	 * Returns the raw CSS body that removes native WordPress chrome in embed mode.
	 *
	 * @return string The CSS rules (without wrapping <style> tags).
	 */
	private static function get_embed_reset_css(): string {
		return '
html { margin: 0 !important; padding: 0 !important; min-height: 100% !important; overflow: auto !important; }
html.wp-toolbar { padding-top: 0 !important; }
body { margin: 0 !important; padding: 0 !important; min-height: 100% !important; overflow: visible !important; scrollbar-gutter: stable !important; }
#wpwrap { min-height: 100% !important; height: auto !important; }
#wpbody, #wpcontent, #wpbody-content { min-height: 100% !important; height: auto !important; }
#adminmenuback, #adminmenuwrap, #adminmenumain, #wpadminbar, #wpfooter { display: none !important; }
#wpbody { padding-top: 0 !important; }
#wpcontent { margin-left: 0 !important; float: none !important; }
#wpbody-content { margin-top: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; }
#wpwrap { display: block !important; }
';
	}
}
