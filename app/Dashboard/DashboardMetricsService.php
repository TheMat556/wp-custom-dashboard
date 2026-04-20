<?php
/**
 * Dashboard metrics service.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Dashboard;

defined( 'ABSPATH' ) || exit;

/**
 * Builds dashboard metrics and performance payloads.
 */
final class DashboardMetricsService {

	/**
	 * Returns at-a-glance site metrics.
	 *
	 * @return array
	 */
	public function get_at_a_glance(): array {
		$posts = wp_count_posts( 'post' );
		$pages = wp_count_posts( 'page' );
		$users = count_users();

		return array(
			'posts'          => (int) ( $posts->publish ?? 0 ),
			'postsDraft'     => (int) ( $posts->draft ?? 0 ),
			'pages'          => (int) ( $pages->publish ?? 0 ),
			'pagesDraft'     => (int) ( $pages->draft ?? 0 ),
			'users'          => (int) ( $users['total_users'] ?? 0 ),
			'wpVersion'      => get_bloginfo( 'version' ),
			'phpVersion'     => PHP_VERSION,
			'lastBackupDate' => $this->get_last_backup_date(),
		);
	}

	/**
	 * Returns the date of the most recent WPVivid backup, or null if unavailable.
	 *
	 * @return string|null Formatted date string (Y-m-d H:i) or null.
	 */
	private function get_last_backup_date(): ?string {
		$list = get_option( 'wpvivid_backup_list', array() );
		if ( empty( $list ) || ! is_array( $list ) ) {
			return null;
		}

		$latest = 0;
		foreach ( $list as $backup ) {
			if ( isset( $backup['create_time'] ) && is_numeric( $backup['create_time'] ) ) {
				$ts = (int) $backup['create_time'];
				if ( $ts > $latest ) {
					$latest = $ts;
				}
			}
		}

		return $latest > 0 ? wp_date( 'Y-m-d H:i', $latest ) : null;
	}

	/**
	 * Returns site health summary data.
	 *
	 * @return array{status: string, score: int}
	 */
	public function get_site_health(): array {
		$result = array(
			'status' => 'unknown',
			'score'  => 0,
		);
		$cached = get_transient( 'health-check-site-status-result' );

		if ( $cached && isset( $cached['status'] ) ) {
			$status = sanitize_text_field( $cached['status'] );

			if ( in_array( $status, array( 'good', 'recommended', 'critical' ), true ) ) {
				$result['status'] = $status;
				$result['score']  = 'good' === $status ? 90 : ( 'recommended' === $status ? 65 : 30 );

				return $result;
			}
		}

		try {
			if ( ! defined( 'WP_ADMIN' ) ) {
				define( 'WP_ADMIN', true );
			}

			foreach ( array( 'misc.php', 'update.php', 'plugin.php', 'class-wp-site-health.php' ) as $file ) {
				$path = ABSPATH . 'wp-admin/includes/' . $file;
				if ( file_exists( $path ) ) {
					require_once $path;
				}
			}

			if ( ! class_exists( 'WP_Site_Health' ) ) {
				return $result;
			}

			$tests  = \WP_Site_Health::get_tests();
			$total  = 0;
			$passed = 0;

			if ( ! empty( $tests['direct'] ) ) {
				foreach ( $tests['direct'] as $test ) {
					if ( ! is_callable( $test['test'] ) ) {
						continue;
					}

					$total++;

					try {
						$check = call_user_func( $test['test'] );
						if ( isset( $check['status'] ) && 'good' === $check['status'] ) {
							$passed++;
						}
					} catch ( \Throwable $exception ) {
						continue;
					}
				}
			}

			if ( $total > 0 ) {
				$result['score']  = (int) round( ( $passed / $total ) * 100 );
				$result['status'] = $result['score'] >= 80 ? 'good' : ( $result['score'] >= 50 ? 'recommended' : 'critical' );
			}
		} catch ( \Throwable $exception ) {
			return $result;
		}

		return $result;
	}

	/**
	 * Returns update counts and detailed update lists.
	 *
	 * @return array
	 */
	public function get_pending_updates(): array {
		if ( ! function_exists( 'get_plugin_data' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$plugins_list = array();
		$themes_list  = array();
		$core_list    = array();

		$plugin_updates = get_site_transient( 'update_plugins' );
		if ( $plugin_updates && ! empty( $plugin_updates->response ) ) {
			foreach ( $plugin_updates->response as $slug => $data ) {
				$file      = WP_PLUGIN_DIR . '/' . $slug;
				$installed = file_exists( $file ) ? get_plugin_data( $file, false, false ) : array();
				$plugins_list[] = array(
					'slug'           => $slug,
					'name'           => $installed['Name'] ?? basename( $slug, '.php' ),
					'currentVersion' => $installed['Version'] ?? '?',
					'newVersion'     => $data->new_version ?? '?',
					'url'            => $data->url ?? '',
					'requiresWP'     => $data->requires ?? null,
					'requiresPHP'    => $data->requires_php ?? null,
					'testedUpTo'     => $data->tested ?? null,
				);
			}
		}

		$theme_updates = get_site_transient( 'update_themes' );
		if ( $theme_updates && ! empty( $theme_updates->response ) ) {
			foreach ( $theme_updates->response as $slug => $data ) {
				$theme         = wp_get_theme( $slug );
				$theme_name    = $theme->get( 'Name' );
				$theme_version = $theme->get( 'Version' );
				$themes_list[] = array(
					'slug'           => $slug,
					'name'           => '' !== $theme_name ? $theme_name : $slug,
					'currentVersion' => '' !== $theme_version ? $theme_version : '?',
					'newVersion'     => $data['new_version'] ?? '?',
					'url'            => $data['url'] ?? '',
				);
			}
		}

		$core_updates = get_site_transient( 'update_core' );
		if ( $core_updates && ! empty( $core_updates->updates ) ) {
			foreach ( $core_updates->updates as $update ) {
				if ( isset( $update->response ) && 'upgrade' === $update->response ) {
					$core_list[] = array(
						'currentVersion' => get_bloginfo( 'version' ),
						'newVersion'     => $update->version ?? '?',
					);
					break;
				}
			}
		}

		return array(
			'plugins'     => count( $plugins_list ),
			'themes'      => count( $themes_list ),
			'core'        => count( $core_list ),
			'total'       => count( $plugins_list ) + count( $themes_list ) + count( $core_list ),
			'lastChecked' => isset( $plugin_updates->last_checked ) ? (int) $plugin_updates->last_checked : null,
			'pluginList'  => $plugins_list,
			'themeList'   => $themes_list,
			'coreList'    => $core_list,
		);
	}

	/**
	 * Returns daily page-view counts for the last 30 days.
	 *
	 * @return array
	 */
	public function get_visitor_trend(): array {
		$results    = array();
		$total_now  = 0;
		$total_prev = 0;

		for ( $i = 59; $i >= 0; $i-- ) {
			$timestamp = strtotime( "-{$i} days" );
			$day       = gmdate( 'Y-m-d', $timestamp );
			$views     = (int) get_transient( 'wp_react_ui_pv_' . $day );

			if ( $i < 30 ) {
				$results[] = array(
					'date'  => gmdate( 'M d', $timestamp ),
					'views' => $views,
				);
				$total_now += $views;
			} else {
				$total_prev += $views;
			}
		}

		$trend = $total_prev > 0
			? (int) round( ( ( $total_now - $total_prev ) / $total_prev ) * 100 )
			: 0;

		return array(
			'days'      => $results,
			'total'     => $total_now,
			'prevTotal' => $total_prev,
			'trendPct'  => $trend,
		);
	}

	/**
	 * Returns country visit counts.
	 *
	 * @return array
	 */
	public function get_country_stats(): array {
		global $wpdb;

		$table = $wpdb->prefix . 'statistics_visitor';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.NoCaching
		if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) !== $table ) {
			return array();
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$columns = $wpdb->get_col(
			$wpdb->prepare( 'SHOW COLUMNS FROM %i', $table )
		);
		$column  = in_array( 'location', $columns, true ) ? 'location' : 'country';
		$since   = gmdate( 'Y-m-d', strtotime( '-30 days' ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				'SELECT %i AS country, COUNT(*) AS visits
				 FROM %i
				 WHERE last_counter >= %s
				   AND %i != \'\'
				   AND %i != \'xx\'
				   AND %i != \'--\'
				 GROUP BY %i
				 ORDER BY visits DESC
				 LIMIT 10',
				$column,
				$table,
				$since,
				$column,
				$column,
				$column,
				$column
			),
			ARRAY_A
		);

		return array_map(
			static function ( array $row ): array {
				return array(
					'country' => strtoupper( (string) $row['country'] ),
					'visits'  => (int) $row['visits'],
				);
			},
			$rows ?? array()
		);
	}

	/**
	 * Returns homepage response-time data.
	 *
	 * @return array
	 */
	public function get_site_speed(): array {
		$cached = get_transient( 'wp_react_ui_site_speed' );
		if ( false !== $cached ) {
			$cached['history'] = get_option( 'wp_react_ui_speed_history', array() );
			return $cached;
		}

		$now      = time();
		$start    = microtime( true );
		$response = wp_remote_get(
			home_url( '/' ),
			array(
				'timeout'    => 8,
				'headers'    => array( 'Cache-Control' => 'no-cache' ),
				'user-agent' => 'WP-React-UI-Health/1.0',
			)
		);
		$ms = (int) round( ( microtime( true ) - $start ) * 1000 );

		$history = get_option( 'wp_react_ui_speed_history', array() );
		if ( ! is_array( $history ) ) {
			$history = array();
		}

		if ( is_wp_error( $response ) ) {
			$error_msg   = $response->get_error_message();
			$error_class = 'connection';
			$reason      = 'Could not connect to your homepage.';

			if ( false !== strpos( $error_msg, 'timed out' ) || false !== strpos( $error_msg, 'timeout' ) ) {
				$reason      = 'The server took too long to respond (timeout). This often means the server is overloaded or a plugin is causing a fatal error on the homepage.';
				$error_class = 'timeout';
			} elseif ( false !== strpos( $error_msg, 'SSL' ) || false !== strpos( $error_msg, 'ssl' ) ) {
				$reason      = 'SSL certificate error — the HTTPS certificate may be expired or misconfigured. Visitors see a browser security warning.';
				$error_class = 'ssl';
			} elseif ( false !== strpos( $error_msg, 'dns' ) || false !== strpos( $error_msg, 'resolve' ) || false !== strpos( $error_msg, 'Name or service not known' ) ) {
				$reason      = 'Domain name could not be resolved (DNS failure). This can happen when the domain expired or DNS settings changed recently.';
				$error_class = 'dns';
			} elseif ( false !== strpos( $error_msg, 'refused' ) ) {
				$reason      = 'Connection refused — the web server is not accepting connections. The server process may have crashed.';
				$error_class = 'server_down';
			}

			$history[] = array( 'ts' => $now, 'ok' => false, 'ms' => null );
			$history   = array_slice( $history, -48 );
			update_option( 'wp_react_ui_speed_history', $history, false );

			$first_fail = get_option( 'wp_react_ui_first_fail_ts', 0 );
			if ( ! $first_fail ) {
				update_option( 'wp_react_ui_first_fail_ts', $now, false );
				$first_fail = $now;
			}

			return array(
				'ms'          => null,
				'status'      => 'error',
				'reason'      => $reason,
				'errorClass'  => $error_class,
				'errorDetail' => $error_msg,
				'checkedAt'   => $now,
				'firstFailAt' => (int) $first_fail,
				'history'     => $history,
			);
		}

		$http_code = (int) wp_remote_retrieve_response_code( $response );
		$status    = $ms < 600 ? 'good' : ( $ms < 1500 ? 'fair' : 'slow' );

		$history[] = array( 'ts' => $now, 'ok' => true, 'ms' => $ms );
		$history   = array_slice( $history, -48 );
		update_option( 'wp_react_ui_speed_history', $history, false );
		delete_option( 'wp_react_ui_first_fail_ts' );

		$result = array(
			'ms'        => $ms,
			'status'    => $status,
			'httpCode'  => $http_code,
			'checkedAt' => $now,
			'history'   => $history,
		);

		set_transient( 'wp_react_ui_site_speed', $result, 5 * MINUTE_IN_SECONDS );

		return $result;
	}

	/**
	 * Returns recent and draft page overview data.
	 *
	 * @return array
	 */
	public function get_pages_overview(): array {
		$map = static function ( \WP_Post $page ): array {
			$days_old = (int) ceil( ( time() - strtotime( $page->post_modified_gmt ) ) / DAY_IN_SECONDS );
			$title    = '' !== $page->post_title ? $page->post_title : '(untitled)';

			return array(
				'id'       => $page->ID,
				'title'    => $title,
				'modified' => human_time_diff( strtotime( $page->post_modified_gmt ) ) . ' ago',
				'daysOld'  => $days_old,
				'editUrl'  => admin_url( 'post.php?post=' . $page->ID . '&action=edit' ),
				'viewUrl'  => get_permalink( $page->ID ),
			);
		};

		$recent      = get_posts( array( 'post_type' => 'page', 'post_status' => 'publish', 'posts_per_page' => 6, 'orderby' => 'modified', 'order' => 'DESC' ) );
		$drafts      = get_posts( array( 'post_type' => 'page', 'post_status' => 'draft', 'posts_per_page' => 6, 'orderby' => 'modified', 'order' => 'DESC' ) );
		$page_counts = wp_count_posts( 'page' );

		return array(
			'recent'         => array_map( $map, $recent ),
			'drafts'         => array_map( $map, $drafts ),
			'totalPublished' => (int) ( $page_counts->publish ?? 0 ),
			'totalDrafts'    => (int) ( $page_counts->draft ?? 0 ),
		);
	}
}
