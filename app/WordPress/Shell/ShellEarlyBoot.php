<?php
/**
 * Early boot rendering for WP React UI.
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Emits critical CSS, early boot state, and preload hints for the shell.
 */
class WP_React_UI_Shell_Early_Boot {

	/**
	 * Base64-encoded CSP nonce for the current request.
	 *
	 * @var string
	 */
	private static string $csp_nonce = '';

	/**
	 * Registers early-boot hooks.
	 *
	 * @return void
	 */
	public static function init(): void {
		add_action( 'admin_init', array( self::class, 'send_csp_header' ), 1 );
		add_action( 'admin_head', array( self::class, 'render_admin_head' ), 1 );
	}

	/**
	 * Returns the CSP nonce for this request, generating one if needed.
	 *
	 * @return string
	 */
	public static function get_csp_nonce(): string {
		if ( '' === self::$csp_nonce ) {
			self::$csp_nonce = base64_encode( random_bytes( 16 ) );
		}
		return self::$csp_nonce;
	}

	/**
	 * Sends a Content-Security-Policy header with directives for scripts, styles, frames, and other resources.
	 *
	 * All directives use nonces for inline scripts and styles. External resources are restricted
	 * to same-origin (self) with limited exceptions for data URIs (fonts, images).
	 *
	 * No third-party script hosts are included — the chat system is native and communicates
	 * server-side only.
	 *
	 * @return void
	 */
	public static function send_csp_header(): void {
		global $pagenow;
		if ( ! wp_react_ui_should_boot_shell( $pagenow ) ) {
			return;
		}

		if ( headers_sent() ) {
			return;
		}

		$nonce = self::get_csp_nonce();

		$directives = array(
			// Inline scripts must have the matching nonce. External scripts restricted to same-origin.
			"script-src 'self' 'nonce-{$nonce}'",
			// Inline styles must have the matching nonce. External stylesheets from same-origin only.
			"style-src 'self' 'nonce-{$nonce}'",
			// Frames restricted to same-origin WP admin pages only.
			"frame-src 'self'",
			// XHR/fetch calls only to same-origin WP REST API (no license server calls from browser).
			"connect-src 'self'",
			// Images can be same-origin, data URIs, or HTTPS (for external branding uploads).
			"img-src 'self' data: https:",
			// Fonts from same-origin or data URIs (for Ant Design and system fonts).
			"font-src 'self' data:",
			// Prevent plugins/Flash/PDF execution.
			"object-src 'none'",
			// Restrict base URL to same-origin only.
			"base-uri 'self'",
			// Restrict form submissions to same-origin only.
			"form-action 'self'",
			// Upgrade HTTP requests to HTTPS if possible.
			"upgrade-insecure-requests",
			// Block mixed (HTTP/HTTPS) content.
			"block-all-mixed-content",
		);

		header( 'Content-Security-Policy: ' . implode( '; ', $directives ) );
	}

	/**
	 * Renders preloads, critical CSS, and early boot state for the shell.
	 *
	 * @return void
	 */
	public static function render_admin_head(): void {
		global $pagenow;
		if ( ! wp_react_ui_should_boot_shell( $pagenow ) ) {
			return;
		}

		self::render_preload_tags();
		self::render_critical_css();
		self::render_boot_config_script();
		self::render_early_state_script();
		self::render_branding_preload();
	}

	/**
	 * Returns the shared early boot config used by PHP and the frontend stores.
	 *
	 * @return array
	 */
	private static function get_boot_config(): array {
		return array(
			'layout' => array(
				'mobileBreakpoint'    => 768,
				'collapsedStorageKey' => 'wp-react-sidebar-collapsed',
				'sidebarWidths'       => array(
					'expanded'  => 240,
					'collapsed' => 64,
					'mobile'    => 0,
				),
			),
			'theme'  => array(
				'storageKey' => 'wp-react-ui-theme',
			),
		);
	}

	/**
	 * Emits the shared boot config before the early-state script runs.
	 *
	 * @return void
	 */
	private static function render_boot_config_script(): void {
		$boot_config_json = wp_json_encode( self::get_boot_config() );

		$nonce = self::get_csp_nonce();

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '<script id="wp-react-ui-boot-config" nonce="' . esc_attr( $nonce ) . '">window.wpReactUiBoot=' . $boot_config_json . ';</script>';
	}

	/**
	 * Emits preload tags for built shell assets.
	 *
	 * @return void
	 */
	private static function render_preload_tags(): void {
		$preload_assets = WP_React_UI_Asset_Loader::get_preload_assets();

		foreach ( $preload_assets['css'] as $css_url ) {
			echo '<link rel="preload" href="' . esc_url( $css_url ) . '" as="style">' . "\n";
		}

		foreach ( $preload_assets['js'] as $js_url ) {
			echo '<link rel="modulepreload" href="' . esc_url( $js_url ) . '">' . "\n";
		}
	}

	/**
	 * Emits inline critical CSS.
	 *
	 * @return void
	 */
	private static function render_critical_css(): void {
		static $critical_css = null;

		if ( null === $critical_css ) {
			$critical_css_path = dirname( __DIR__, 3 ) . '/includes/critical.css';

			if ( is_readable( $critical_css_path ) ) {
				// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
				$critical_css = file_get_contents( $critical_css_path );
				$critical_css = false === $critical_css ? '' : $critical_css;
			} else {
				$critical_css = '';

				if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
					// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
					error_log( 'WP React UI: critical.css is not readable at ' . $critical_css_path );
				}
			}
		}

		$nonce = self::get_csp_nonce();

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '<style id="wp-react-ui-critical" nonce="' . esc_attr( $nonce ) . '">' . $critical_css . '</style>';
	}

	/**
	 * Emits the early-state boot script used before the React shell mounts.
	 *
	 * @return void
	 */
	private static function render_early_state_script(): void {
		$theme_json = wp_json_encode( self::get_user_theme() );

		$nonce = self::get_csp_nonce();

		// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '<script id="wp-react-ui-early-state" nonce="' . esc_attr( $nonce ) . '">';
		printf( self::get_early_state_script_template(), $theme_json );
		echo '</script>';
		// phpcs:enable
	}

	/**
	 * Returns the persisted user theme with a light fallback.
	 *
	 * @return string
	 */
	private static function get_user_theme(): string {
		$theme = get_user_meta( get_current_user_id(), 'wp_react_ui_theme', true );

		return is_string( $theme ) && '' !== $theme ? $theme : 'light';
	}

	/**
	 * Returns the early-boot script template used before React mounts.
	 *
	 * @return string
	 */
	private static function get_early_state_script_template(): string {
		return <<<'JS'
(function(){
	var docEl=document.documentElement;
	var body=document.body;
	var theme=%1$s;
	var bootConfig=window.wpReactUiBoot||{};
	var layoutConfig=bootConfig.layout||{};
	var sidebarWidths=layoutConfig.sidebarWidths||{};
	var themeConfig=bootConfig.theme||{};
	var breakpoint=typeof layoutConfig.mobileBreakpoint==="number"?layoutConfig.mobileBreakpoint:768;
	var collapsedKey=layoutConfig.collapsedStorageKey||"wp-react-sidebar-collapsed";
	var themeKey=themeConfig.storageKey||"wp-react-ui-theme";
	var expandedWidth=typeof sidebarWidths.expanded==="number"?sidebarWidths.expanded:240;
	var collapsedWidth=typeof sidebarWidths.collapsed==="number"?sidebarWidths.collapsed:64;
	var mobileWidth=typeof sidebarWidths.mobile==="number"?sidebarWidths.mobile:0;

	try {
		var sidebarCollapsed=localStorage.getItem(collapsedKey)==="true";
		var isMobile=window.innerWidth<breakpoint;
		var sidebarWidth=isMobile?mobileWidth:(sidebarCollapsed?collapsedWidth:expandedWidth);
		docEl.style.setProperty("--sidebar-width",sidebarWidth+"px");
	} catch (e) {}

	try {
		var storedTheme=localStorage.getItem(themeKey);
		if(storedTheme==="dark"||storedTheme==="light"){
			theme=storedTheme;
		}
	} catch (e) {}

	// Set data-theme on <html> immediately — document.documentElement is always
	// available in <head> scripts, unlike document.body which is null here.
	// This prevents a flash of unstyled content (FOUC) before the module script runs.
	docEl.setAttribute("data-theme",theme);
	docEl.classList.toggle("wp-react-dark",theme==="dark");

	if(body){
		body.setAttribute("data-theme",theme);
		body.classList.toggle("wp-react-dark",theme==="dark");
	}

	function ensureRoot(){
		var wpwrap=document.getElementById("wpwrap");
		if(!wpwrap){
			return;
		}

		var currentBody=document.body;
		var resolvedTheme=(currentBody&&currentBody.getAttribute("data-theme"))||theme;

		if(currentBody&&!currentBody.getAttribute("data-theme")){
			currentBody.setAttribute("data-theme",resolvedTheme);
			currentBody.classList.toggle("wp-react-dark",resolvedTheme==="dark");
		}

		if(!document.getElementById("react-shell-root")){
			var shellRoot=document.createElement("div");
			shellRoot.id="react-shell-root";
			shellRoot.setAttribute("data-theme",resolvedTheme);
			var wpcontent=document.getElementById("wpcontent");
			if(wpcontent){
				wpwrap.insertBefore(shellRoot,wpcontent);
			}else{
				wpwrap.appendChild(shellRoot);
			}
		}

		wpwrap.classList.add("has-react-shell");
	}

	window.addEventListener("pagereveal",ensureRoot);
	document.addEventListener("DOMContentLoaded",ensureRoot);
})();
JS;
	}

	/**
	 * Emits a preload for the theme-appropriate branding image.
	 *
	 * @return void
	 */
	private static function render_branding_preload(): void {
		$theme    = self::get_user_theme();
		$branding = WP_React_UI_Branding_Settings::get_frontend_branding();
		$logos    = isset( $branding['logos'] ) ? $branding['logos'] : array();

		if ( 'dark' === $theme && ! empty( $logos['darkUrl'] ) ) {
			$theme_logo = $logos['darkUrl'];
		} elseif ( ! empty( $logos['lightUrl'] ) ) {
			$theme_logo = $logos['lightUrl'];
		} else {
			$theme_logo = $logos['defaultUrl'] ?? '';
		}

		if ( ! empty( $theme_logo ) ) {
			echo '<link rel="preload" href="' . esc_url( $theme_logo ) . '" as="image">' . "\n";
		}
	}
}
