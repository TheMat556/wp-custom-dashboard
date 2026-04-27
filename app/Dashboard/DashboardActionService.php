<?php
/**
 * Dashboard action-item service.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Dashboard;

defined( 'ABSPATH' ) || exit;

/**
 * Builds actionable dashboard guidance items.
 */
final class DashboardActionService {

	/**
	 * Returns actionable dashboard items.
	 *
	 * @return array
	 */
	public function get_action_items(): array {
		global $wpdb;

		$errors   = array();
		$warnings = array();
		$infos    = array();

		$speed = get_transient( 'wp_react_ui_site_speed' );
		if ( false !== $speed && isset( $speed['status'] ) && 'error' === $speed['status'] ) {
			$errors[] = array(
				'type'        => 'health',
				'severity'    => 'error',
				'title'       => 'Website is not reachable',
				'impact'      => 'Visitors cannot access your site right now — you are losing potential customers.',
				'description' => 'Check with your hosting provider. They can tell you if the server is running.',
				'action'      => 'Check site health',
				'url'         => 'site-health.php',
			);
		}

		$legal_keywords = array( 'datenschutz', 'impressum', 'privacy', 'legal', 'cookie', 'terms', 'agb', 'haftung' );
		$legal_ids      = array();
		$all_drafts     = get_posts( array( 'post_type' => 'page', 'post_status' => 'draft', 'posts_per_page' => 50 ) );

		foreach ( $all_drafts as $page ) {
			$lower = strtolower( $page->post_title );
			foreach ( $legal_keywords as $keyword ) {
				if ( false !== strpos( $lower, $keyword ) ) {
					$legal_ids[] = $page->ID;
					$days        = (int) ceil( ( time() - strtotime( $page->post_modified_gmt ) ) / DAY_IN_SECONDS );
					$errors[]    = array(
						'type'        => 'content',
						'severity'    => 'error',
						'title'       => '"' . $page->post_title . '" is not published',
						'impact'      => 'This legal page is a draft for ' . $days . ' days. Unpublished legal pages may violate data protection law and put your business at risk.',
						'description' => 'Open the page, review its content, and publish it. Then check that it is linked in your website footer.',
						'action'      => 'Publish now',
						'url'         => 'post.php?post=' . $page->ID . '&action=edit',
					);
					break;
				}
			}
		}

		$core_updates = get_site_transient( 'update_core' );
		if ( $core_updates && ! empty( $core_updates->updates ) ) {
			foreach ( $core_updates->updates as $update ) {
				if ( isset( $update->response ) && 'upgrade' === $update->response ) {
					$warnings[] = array(
						'type'        => 'update',
						'severity'    => 'warning',
						'title'       => 'WordPress ' . ( $update->version ?? '' ) . ' is available',
						'impact'      => 'Running an outdated WordPress version is a security risk and may cause compatibility issues.',
						'description' => 'Create a backup first (one click in most hosting dashboards), then update. Your content will not be affected.',
						'action'      => 'Update WordPress',
						'url'         => 'update-core.php',
					);
					break;
				}
			}
		}

		$plugin_updates = get_site_transient( 'update_plugins' );
		if ( $plugin_updates && ! empty( $plugin_updates->response ) ) {
			$count      = count( $plugin_updates->response );
			$warnings[] = array(
				'type'        => 'update',
				'severity'    => 'warning',
				'title'       => $count . ' plugin update' . ( $count > 1 ? 's' : '' ) . ' available',
				'impact'      => 'Outdated plugins are the most common cause of WordPress security breaches.',
				'description' => 'Make a backup first. Updates are usually safe and take under a minute.',
				'action'      => 'Update plugins',
				'url'         => 'update-core.php',
			);
		}

		$theme_updates = get_site_transient( 'update_themes' );
		if ( $theme_updates && ! empty( $theme_updates->response ) ) {
			$count      = count( $theme_updates->response );
			$warnings[] = array(
				'type'        => 'update',
				'severity'    => 'warning',
				'title'       => $count . ' theme update' . ( $count > 1 ? 's' : '' ) . ' available',
				'impact'      => 'Theme updates can include security fixes. Your content and images are stored separately and won\'t be lost.',
				'description' => 'Backup first, then update. If the design looks off afterwards, you can roll back.',
				'action'      => 'Update themes',
				'url'         => 'update-core.php',
			);
		}

		$cached_health = get_transient( 'health-check-site-status-result' );
		if ( $cached_health && isset( $cached_health['status'] ) && in_array( $cached_health['status'], array( 'recommended', 'critical' ), true ) ) {
			if ( 'critical' === $cached_health['status'] ) {
				$errors[] = array(
					'type'        => 'health',
					'severity'    => 'error',
					'title'       => 'WordPress detected critical configuration issues',
					'impact'      => 'These issues can affect your site\'s security or availability.',
					'description' => 'The WordPress Site Health tool found serious problems. Open the report to see exactly what to fix.',
					'action'      => 'View report',
					'url'         => 'site-health.php',
				);
			} else {
				$warnings[] = array(
					'type'        => 'health',
					'severity'    => 'warning',
					'title'       => 'WordPress found configuration improvements',
					'impact'      => 'These issues could slow your site or create minor security risks.',
					'description' => 'Not urgent, but worth reviewing when you have a few minutes.',
					'action'      => 'View report',
					'url'         => 'site-health.php',
				);
			}
		}

		$exclude_ids  = ! empty( $legal_ids ) ? $legal_ids : array( 0 );
		$placeholders = implode( ',', array_fill( 0, count( $exclude_ids ), '%d' ) );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$old_count = (int) $wpdb->get_var(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber
				"SELECT COUNT(*) FROM %i
				 WHERE post_type = 'page' AND post_status = 'draft'
				   AND post_modified < %s
				   AND ID NOT IN ({$placeholders})",
				array_merge( array( $wpdb->posts, gmdate( 'Y-m-d', strtotime( '-30 days' ) ) ), $exclude_ids )
			)
		);

		if ( $old_count > 0 ) {
			$infos[] = array(
				'type'        => 'content',
				'severity'    => 'info',
				'title'       => $old_count . ' draft page' . ( $old_count > 1 ? 's' : '' ) . ' not updated in 30+ days',
				'impact'      => 'These pages are not visible to visitors, but they clutter your admin area.',
				'description' => 'Decide whether to finish and publish them or delete them.',
				'action'      => 'Review',
				'url'         => 'edit.php?post_status=draft&post_type=page',
			);
		}

		return array_merge( $errors, $warnings, $infos );
	}
}
