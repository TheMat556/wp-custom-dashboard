<?php
/**
 * Dashboard page-view tracking service.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Dashboard;

defined( 'ABSPATH' ) || exit;

/**
 * Handles lightweight frontend page-view tracking.
 */
final class DashboardTrackingService {

	/**
	 * Registers dashboard tracking hooks.
	 *
	 * @return void
	 */
	public function register(): void {
		add_action( 'template_redirect', array( $this, 'track_page_view' ) );
	}

	/**
	 * Increments the current day page-view counter.
	 *
	 * @return void
	 */
	public function track_page_view(): void {
		if ( is_feed() || is_trackback() ) {
			return;
		}

		$ua = isset( $_SERVER['HTTP_USER_AGENT'] )
			? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) )
			: '';

		if ( $ua && preg_match( '/bot|crawl|slurp|spider|curl|wget|facebookexternalhit/i', $ua ) ) {
			return;
		}

		$today = gmdate( 'Y-m-d' );
		$key   = 'wp_react_ui_pv_' . $today;
		$count = (int) get_transient( $key );

		set_transient( $key, $count + 1, 2 * DAY_IN_SECONDS );
	}
}
