<?php
/**
 * Shell localization payload builder for WP React UI.
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Builds the frontend boot payload for the React shell.
 */
class WP_React_UI_Shell_Localization {

	/**
	 * Returns the localized payload passed to the React shell.
	 *
	 * @return array
	 */
	public static function get_payload(): array {
		$user          = wp_get_current_user();
		$theme         = get_user_meta( $user->ID, 'wp_react_ui_theme', true );
		$branding      = WP_React_UI_Branding_Settings::get_frontend_branding();
		$special_pages = wp_react_ui_get_special_page_config();

		if ( ! $theme ) {
			$theme = 'light';
		}

		return array(
			'menu'      => WP_React_UI_Menu_Repository::get_menu_data(),
			'siteName'  => $branding['siteName'],
			'branding'  => $branding,
			'theme'     => $theme,
			'adminUrl'  => admin_url(),
			'publicUrl' => home_url( '/' ),
			'navigation' => array(
				'fullReloadPageParams' => array_values( $special_pages['full_reload_page_params'] ),
				'shellDisabledPagenow' => array_values( $special_pages['shell_disabled_pagenow'] ),
				'breakoutPagenow'      => array_values( $special_pages['breakout_pagenow'] ),
			),
			'nonce'     => wp_create_nonce( 'wp_rest' ),
			'restUrl'   => rest_url( 'wp-react-ui/v1' ),
			'logoutUrl' => wp_logout_url( admin_url() ),
			'assetsUrl' => plugins_url( 'dist/', dirname( __DIR__ ) . '/wp-custom-dashboard.php' ),
			'user'      => array(
				'name' => $user->display_name,
				'role' => implode( ', ', $user->roles ),
			),
		);
	}
}
