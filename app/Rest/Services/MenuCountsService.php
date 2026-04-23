<?php
/**
 * Menu counts service for REST transport extraction.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Services;

defined( 'ABSPATH' ) || exit;

/**
 * Returns the lightweight menu badge counts payload.
 */
final class MenuCountsService {

	/**
	 * Returns the REST-ready menu counts payload.
	 *
	 * @return array{counts: array<string, int>}
	 */
	public function get_menu_counts_payload(): array {
		$counts   = array();
		$comments = wp_count_comments();
		$pending  = isset( $comments->moderated ) ? (int) $comments->moderated : 0;

		if ( $pending > 0 ) {
			$counts['edit-comments.php'] = $pending;
		}

		$update_data    = wp_get_update_data();
		$total_updates  = isset( $update_data['counts']['total'] ) ? (int) $update_data['counts']['total'] : 0;
		$plugin_updates = isset( $update_data['counts']['plugins'] ) ? (int) $update_data['counts']['plugins'] : 0;
		$theme_updates  = isset( $update_data['counts']['themes'] ) ? (int) $update_data['counts']['themes'] : 0;

		if ( $total_updates > 0 ) {
			$counts['update-core.php'] = $total_updates;
		}

		if ( $plugin_updates > 0 ) {
			$counts['plugins.php'] = $plugin_updates;
		}

		if ( $theme_updates > 0 ) {
			$counts['themes.php'] = $theme_updates;
		}

		return array( 'counts' => $counts );
	}
}
