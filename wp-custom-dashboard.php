<?php
/**
 * Plugin Name: WP React UI
 * Description: Replaces Navbar and Sidebar with React + Ant Design
 * Version: 1.0.0
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/includes/class-wp-react-ui-asset-loader.php';
require_once __DIR__ . '/includes/class-wp-react-ui-branding-settings.php';
require_once __DIR__ . '/includes/class-wp-react-ui-rest-api.php';

WP_React_UI_Branding_Settings::init();

// ─── Admin Init ───────────────────────────────────────────────────────────────

add_action(
	'admin_init',
	function () {

		remove_action( 'in_admin_header', 'wp_admin_bar_render', 0 );
		remove_action( 'wp_head', '_admin_bar_bump_cb' );

		$manifest_path = plugin_dir_path( __FILE__ ) . 'dist/.vite/manifest.json';
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
);

// ─── Clear menu cache on plugin activation / deactivation. ───────────────────

add_action(
	'activated_plugin',
	function () {
		WP_React_UI_Asset_Loader::clear_menu_cache();
	}
);

add_action(
	'deactivated_plugin',
	function () {
		WP_React_UI_Asset_Loader::clear_menu_cache();
	}
);

add_action(
	'after_switch_theme',
	function () {
		WP_React_UI_Asset_Loader::clear_menu_cache();
	}
);

// ─── Admin Head ───────────────────────────────────────────────────────────────

add_action(
	'admin_head',
	function () {

		// Enqueue Google Fonts via wp_enqueue_style() for standards compliance.
		wp_enqueue_style(
			'wp-react-ui-inter-font',
			'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
			array(),
			null // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
		);

		global $pagenow;
		$editor_pages = array( 'post.php', 'post-new.php', 'site-editor.php' );
		if ( in_array( $pagenow, $editor_pages, true ) ) {
			return;
		}

		$preload_assets = WP_React_UI_Asset_Loader::get_preload_assets();

		foreach ( $preload_assets['css'] as $css_url ) {
			echo '<link rel="preload" href="' . esc_url( $css_url ) . '" as="style">' . "\n";
		}

		foreach ( $preload_assets['js'] as $js_url ) {
			echo '<link rel="modulepreload" href="' . esc_url( $js_url ) . '">' . "\n";
		}

		static $critical_css = null;
		if ( null === $critical_css ) {
			// Reading a local plugin file — wp_remote_get() is for remote URLs only.
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			$critical_css = file_get_contents( __DIR__ . '/includes/critical.css' );
		}
		// Local plugin CSS file — not user input, esc_html() would break CSS selectors.
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '<style id="wp-react-ui-critical">' . $critical_css . '</style>';

		// Sync sidebar collapsed state and theme before first paint to avoid layout shift.
		$theme = get_user_meta( get_current_user_id(), 'wp_react_ui_theme', true );
		if ( ! $theme ) {
			$theme = 'light';
		}

		echo '<script id="wp-react-ui-early-state">';
		echo '(function(){';
		echo 'var d=document.documentElement,b=document.body;';
		// Read localStorage to set correct grid column width immediately.
		echo 'try{var c=localStorage.getItem("wp-react-sidebar-collapsed")==="true";';
		echo 'var m=window.innerWidth<768;';
		echo 'd.style.setProperty("--sidebar-width",m?"0px":c?"64px":"240px");}catch(e){}';
		// Apply server-known theme to data-theme attributes.
		echo 'var t=' . wp_json_encode( $theme ) . ';';
		echo 'try{var st=localStorage.getItem("wp-react-ui-theme");';
		echo 'if(st==="dark"||st==="light"){t=st;}}catch(e){}';
		// b may be null when this script runs in head before body is parsed.
		echo 'if(b){b.setAttribute("data-theme",t);';
		echo 'if(t==="dark")b.classList.add("wp-react-dark");}';
		// Create the single React shell root as early as possible.
		// _wpRR is idempotent and safe to call multiple times.
		echo 'function _wpRR(){';
		echo 'var w=document.getElementById("wpwrap");if(!w)return;';
		// Re-read document.body directly as b was captured before body existed.
		echo 'var bd=document.body;';
		echo 'var th=(bd&&bd.getAttribute("data-theme"))||t;';
		echo 'if(bd&&!bd.getAttribute("data-theme")){bd.setAttribute("data-theme",th);';
		echo 'if(th==="dark")bd.classList.add("wp-react-dark");}';
		echo 'if(!document.getElementById("react-shell-root")){';
		echo 'var s=document.createElement("div");s.id="react-shell-root";';
		echo 's.setAttribute("data-theme",th);';
		echo 'var cc=document.getElementById("wpcontent");';
		echo 'cc?w.insertBefore(s,cc):w.appendChild(s);}';
		echo 'w.classList.add("has-react-shell");}';
		// pagereveal fires before first paint in Chrome 126+.
		echo 'window.addEventListener("pagereveal",_wpRR);';
		// DOMContentLoaded fallback for browsers without pagereveal support.
		echo 'document.addEventListener("DOMContentLoaded",_wpRR);';
		echo '})();</script>';

		// Preload branding logo images.
		$branding = WP_React_UI_Branding_Settings::get_frontend_branding();
		$logos    = isset( $branding['logos'] ) ? $branding['logos'] : array();

		if ( 'dark' === $theme && ! empty( $logos['darkUrl'] ) ) {
			$theme_logo = $logos['darkUrl'];
		} elseif ( ! empty( $logos['lightUrl'] ) ) {
			$theme_logo = $logos['lightUrl'];
		} else {
			$theme_logo = isset( $logos['defaultUrl'] ) ? $logos['defaultUrl'] : '';
		}

		if ( ! empty( $theme_logo ) ) {
			echo '<link rel="preload" href="' . esc_url( $theme_logo ) . '" as="image">' . "\n";
		}
	},
	1
);

// ─── REST API ─────────────────────────────────────────────────────────────────

add_action( 'rest_api_init', array( 'WP_React_UI_REST_API', 'register' ) );

// ─── Enqueue Scripts + Localize Data. ────────────────────────────────────────

add_action(
	'admin_enqueue_scripts',
	function () {
		global $pagenow;
		if ( in_array( $pagenow, array( 'post.php', 'post-new.php' ), true ) ) {
			return;
		}

		WP_React_UI_Asset_Loader::enqueue();

		$user  = wp_get_current_user();
		$theme = get_user_meta( $user->ID, 'wp_react_ui_theme', true );
		if ( ! $theme ) {
			$theme = 'light';
		}
		$branding = WP_React_UI_Branding_Settings::get_frontend_branding();

		wp_localize_script(
			'wp-react-ui',
			'wpReactUi',
			array(
				'menu'        => WP_React_UI_Asset_Loader::get_menu_data(),
				'siteName'    => $branding['siteName'],
				'branding'    => $branding,
				'theme'       => $theme,
				'adminUrl'    => admin_url(),
				'publicUrl'   => home_url( '/' ),
				'nonce'       => wp_create_nonce( 'wp_rest' ),
				'restUrl'     => rest_url( 'wp-react-ui/v1' ),
				'logoutUrl'   => wp_logout_url( admin_url() ),
				'logoutNonce' => wp_create_nonce( 'log-out' ),
				'assetsUrl'   => plugin_dir_url( __FILE__ ) . 'dist/',
				'user'        => array(
					'name' => $user->display_name,
					'role' => implode( ', ', $user->roles ),
				),
			)
		);
	}
);