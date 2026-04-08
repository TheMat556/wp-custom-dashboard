<?php
/**
 * Gathers data for the React dashboard widgets.
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

class WP_React_UI_Dashboard_Data {

	/**
	 * Returns aggregated dashboard data for the React shell.
	 *
	 * @return array
	 */
	public static function get_dashboard_data(): array {
		return array(
			'atAGlance'        => self::get_at_a_glance(),
			'recentPosts'      => self::get_recent_posts(),
			'siteHealth'       => self::get_site_health(),
			'postsPerMonth'    => self::get_posts_per_month(),
			'contentBreakdown' => self::get_content_breakdown(),
		);
	}

	private static function get_at_a_glance(): array {
		$posts    = wp_count_posts( 'post' );
		$pages    = wp_count_posts( 'page' );
		$comments = wp_count_comments();
		$users    = count_users();

		return array(
			'posts'           => (int) ( $posts->publish ?? 0 ),
			'postsDraft'      => (int) ( $posts->draft ?? 0 ),
			'pages'           => (int) ( $pages->publish ?? 0 ),
			'pagesDraft'      => (int) ( $pages->draft ?? 0 ),
			'comments'        => (int) ( $comments->approved ?? 0 ),
			'commentsPending' => (int) ( $comments->moderated ?? 0 ),
			'users'           => (int) ( $users['total_users'] ?? 0 ),
			'wpVersion'       => get_bloginfo( 'version' ),
			'phpVersion'      => PHP_VERSION,
		);
	}

	private static function get_recent_posts(): array {
		$posts = get_posts(
			array(
				'numberposts' => 5,
				'post_status' => array( 'publish', 'draft', 'pending' ),
				'orderby'     => 'modified',
				'order'       => 'DESC',
			)
		);

		return array_map(
			function ( $post ) {
				return array(
					'id'       => $post->ID,
					'title'    => $post->post_title ?: '(no title)',
					'status'   => $post->post_status,
					'author'   => get_the_author_meta( 'display_name', $post->post_author ),
					'modified' => $post->post_modified_gmt,
					'editUrl'  => get_edit_post_link( $post->ID, 'raw' ),
				);
			},
			$posts
		);
	}

	private static function get_site_health(): array {
		$result = array(
			'status' => 'unknown',
			'score'  => 0,
		);

		// Prefer the cached transient stored by WP's own Site Health page.
		$cached = get_transient( 'health-check-site-status-result' );
		if ( $cached && isset( $cached['status'] ) ) {
			$status = sanitize_text_field( $cached['status'] );
			if ( in_array( $status, array( 'good', 'recommended', 'critical' ), true ) ) {
				$result['status'] = $status;
				$result['score']  = 'good' === $status ? 90 : ( 'recommended' === $status ? 65 : 30 );
				return $result;
			}
		}

		// Attempt a lightweight live check if admin includes are available.
		try {
			if ( ! defined( 'WP_ADMIN' ) ) {
				define( 'WP_ADMIN', true );
			}

			foreach ( array(
				'misc.php',
				'update.php',
				'plugin.php',
				'class-wp-site-health.php',
			) as $file ) {
				$path = ABSPATH . 'wp-admin/includes/' . $file;
				if ( file_exists( $path ) ) {
					require_once $path;
				}
			}

			if ( ! class_exists( 'WP_Site_Health' ) ) {
				return $result;
			}

			$tests = WP_Site_Health::get_tests();
			$total = 0;
			$passed = 0;

			if ( ! empty( $tests['direct'] ) ) {
				foreach ( $tests['direct'] as $test ) {
					if ( ! is_callable( $test['test'] ) ) {
						continue;
					}
					$total++;
					try {
						$test_result = call_user_func( $test['test'] );
						if ( isset( $test_result['status'] ) && 'good' === $test_result['status'] ) {
							$passed++;
						}
					} catch ( \Throwable $e ) {
						// Individual test failure — skip.
					}
				}
			}

			if ( $total > 0 ) {
				$result['score'] = round( ( $passed / $total ) * 100 );
				if ( $result['score'] >= 80 ) {
					$result['status'] = 'good';
				} elseif ( $result['score'] >= 50 ) {
					$result['status'] = 'recommended';
				} else {
					$result['status'] = 'critical';
				}
			}
		} catch ( \Throwable $e ) {
			// Site Health checks failed — return unknown status.
		}

		return $result;
	}

	private static function get_posts_per_month(): array {
		global $wpdb;
		$results = array();
		for ( $i = 5; $i >= 0; $i-- ) {
			$ts    = strtotime( "-{$i} months" );
			$year  = date( 'Y', $ts );
			$month = date( 'n', $ts );
			$count = (int) $wpdb->get_var( $wpdb->prepare(
				"SELECT COUNT(*) FROM {$wpdb->posts}
				 WHERE post_type = 'post'
				   AND post_status = 'publish'
				   AND YEAR(post_date) = %d
				   AND MONTH(post_date) = %d",
				$year, $month
			) );
			$results[] = array(
				'month' => date( 'M Y', $ts ),
				'posts' => $count,
			);
		}
		return $results;
	}

	private static function get_content_breakdown(): array {
		$posts    = wp_count_posts( 'post' );
		$pages    = wp_count_posts( 'page' );
		$comments = wp_count_comments();
		return array(
			array( 'name' => 'Posts',    'value' => (int)( $posts->publish ?? 0 ) ),
			array( 'name' => 'Drafts',   'value' => (int)( ( $posts->draft ?? 0 ) + ( $pages->draft ?? 0 ) ) ),
			array( 'name' => 'Pages',    'value' => (int)( $pages->publish ?? 0 ) ),
			array( 'name' => 'Comments', 'value' => (int)( $comments->approved ?? 0 ) ),
		);
	}
}
