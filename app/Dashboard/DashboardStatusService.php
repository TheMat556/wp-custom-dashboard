<?php
/**
 * Dashboard status and readiness service.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Dashboard;

defined( 'ABSPATH' ) || exit;

/**
 * Builds legal, business, SEO, and onboarding dashboard payloads.
 */
final class DashboardStatusService {
	public function __construct(
		private DashboardMetricsService $metrics,
		private DashboardCalendarService $calendar
	) {}

	/**
	 * Returns legal compliance data.
	 *
	 * @return array
	 */
	public function get_legal_compliance(): array {
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$privacy_policy_id = (int) get_option( 'wp_page_for_privacy_policy', 0 );
		if ( $privacy_policy_id ) {
			$privacy_post = get_post( $privacy_policy_id );
			$privacy      = array(
				'exists'    => true,
				'published' => $privacy_post && 'publish' === $privacy_post->post_status,
				'status'    => $privacy_post ? $privacy_post->post_status : 'none',
				'title'     => $privacy_post ? $privacy_post->post_title : '',
				'editUrl'   => admin_url( 'post.php?post=' . $privacy_policy_id . '&action=edit' ),
				'viewUrl'   => $privacy_post && 'publish' === $privacy_post->post_status ? get_permalink( $privacy_policy_id ) : null,
			);
		} else {
			$privacy = $this->find_legal_page( array( 'datenschutz', 'datenschutzerklärung', 'privacy', 'privacy policy' ) )
				?? array( 'exists' => false, 'published' => false );
		}

		$impressum = $this->find_legal_page( array( 'impressum', 'imprint', 'legal notice' ) )
			?? array( 'exists' => false, 'published' => false );

		$cookie_plugins = array(
			'cookie-law-info/cookie-law-info.php',
			'cookiebot/cookiebot.php',
			'gdpr-cookie-compliance/moove-gdpr.php',
			'cookie-notice/cookie-notice.php',
			'complianz-gdpr/complianz-gdpr.php',
			'real-cookie-banner/real-cookie-banner.php',
		);
		$cookie_plugin  = null;

		foreach ( $cookie_plugins as $plugin_file ) {
			if ( is_plugin_active( $plugin_file ) ) {
				$cookie_plugin = basename( dirname( $plugin_file ) );
				break;
			}
		}

		$tracking_plugins = array(
			'google-analytics-for-wordpress/googleanalytics.php',
			'wp-statistics/wp-statistics.php',
			'google-site-kit/google-site-kit.php',
			'matomo/matomo.php',
			'analytify/analytify.php',
		);
		$has_tracking     = false;

		foreach ( $tracking_plugins as $plugin_file ) {
			if ( is_plugin_active( $plugin_file ) ) {
				$has_tracking = true;
				break;
			}
		}

		return array(
			'privacyPolicy'          => $privacy,
			'impressum'              => $impressum,
			'cookiePlugin'           => $cookie_plugin,
			'trackingWithoutConsent' => $has_tracking && ! $cookie_plugin,
		);
	}

	/**
	 * Returns key business-function status data.
	 *
	 * @return array
	 */
	public function get_business_functions(): array {
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$functions = array();
		$calendar  = $this->calendar->get_calendar_preview();

		if ( null !== $calendar ) {
			$functions['bookings'] = array(
				'available'     => true,
				'status'        => 'active',
				'totalUpcoming' => count( $calendar['upcoming'] ?? array() ),
				'totalToday'    => $calendar['totalToday'] ?? 0,
				'note'          => 'Booking system is active. Periodically test the booking form to verify it works end-to-end.',
				'testUrl'       => get_home_url(),
			);
		} else {
			$functions['bookings'] = array(
				'available' => false,
				'status'    => 'not_installed',
			);
		}

		$form_plugins = array(
			'contact-form-7/wp-contact-form-7.php' => 'Contact Form 7 (free)',
			'gravityforms/gravityforms.php'         => 'Gravity Forms',
			'wpforms-lite/wpforms.php'              => 'WPForms (free)',
			'formidable/formidable.php'             => 'Formidable Forms',
			'ninja-forms/ninja-forms.php'           => 'Ninja Forms (free)',
			'fluentform/fluentform.php'             => 'FluentForms (free)',
		);
		$active_form  = null;

		foreach ( $form_plugins as $plugin_file => $name ) {
			if ( is_plugin_active( $plugin_file ) ) {
				$active_form = $name;
				break;
			}
		}

		if ( $active_form ) {
			$functions['contactForms'] = array(
				'available' => true,
				'plugin'    => $active_form,
				'status'    => 'active',
				'note'      => $active_form . ' is active. Send a test submission periodically to confirm email delivery works.',
			);
		} else {
			$functions['contactForms'] = array(
				'available' => false,
				'status'    => 'not_installed',
				'note'      => 'No contact form plugin detected.',
			);
		}

		$smtp_plugins = array(
			'wp-mail-smtp/wp_mail_smtp.php'                      => 'WP Mail SMTP (free)',
			'post-smtp/postman-smtp.php'                        => 'Post SMTP',
			'fluent-smtp/fluent-smtp.php'                       => 'FluentSMTP (free)',
			'easy-wp-smtp/easy-wp-smtp.php'                     => 'Easy WP SMTP (free)',
			'sendgrid-email-delivery-simplified/wpsendgrid.php' => 'SendGrid',
		);
		$active_smtp  = null;

		foreach ( $smtp_plugins as $plugin_file => $name ) {
			if ( is_plugin_active( $plugin_file ) ) {
				$active_smtp = $name;
				break;
			}
		}

		$functions['emailDelivery'] = array(
			'smtpPlugin' => $active_smtp,
			'status'     => $active_smtp ? 'configured' : 'default',
			'note'       => $active_smtp
				? $active_smtp . ' is active — emails should be delivered reliably.'
				: 'Using WordPress default email (unreliable — may end up in spam). Consider WP Mail SMTP (free).',
		);

		return $functions;
	}

	/**
	 * Returns basic SEO checks.
	 *
	 * @return array
	 */
	public function get_seo_basics(): array {
		global $wpdb;

		$checks     = array();
		$discourage = '0' === get_option( 'blog_public' );

		$checks['searchVisible'] = array(
			'ok'       => ! $discourage,
			'label'    => $discourage ? 'Search engines are blocked (Settings → Reading)' : 'Visible to search engines',
			'critical' => $discourage,
			'url'      => admin_url( 'options-reading.php' ),
		);

		$home_page_id = (int) get_option( 'page_on_front', 0 );
		if ( $home_page_id ) {
			$home_page     = get_post( $home_page_id );
			$title_value   = $home_page ? $home_page->post_title : '';
			$home_title_ok = strlen( $title_value ) >= 10;
			$edit_url      = admin_url( 'post.php?post=' . $home_page_id . '&action=edit' );
		} else {
			$title_value   = get_option( 'blogname', '' );
			$home_title_ok = strlen( $title_value ) >= 5;
			$edit_url      = admin_url( 'options-general.php' );
		}

		$checks['homeTitle'] = array(
			'ok'    => $home_title_ok,
			'value' => $title_value,
			'label' => $home_title_ok ? 'Homepage title is set' : 'Homepage title is missing or too short',
			'url'   => $edit_url,
		);

		$sitemap_url      = home_url( '/sitemap.xml' );
		$sitemap_response = wp_remote_head( $sitemap_url, array( 'timeout' => 5, 'sslverify' => false ) );
		$sitemap_ok       = ! is_wp_error( $sitemap_response ) && 200 === (int) wp_remote_retrieve_response_code( $sitemap_response );

		$checks['sitemap'] = array(
			'ok'    => $sitemap_ok,
			'label' => $sitemap_ok ? 'Sitemap found at /sitemap.xml' : 'No sitemap found at /sitemap.xml',
			'url'   => $sitemap_url,
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$short = (int) $wpdb->get_var(
			"SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'page' AND post_status = 'publish' AND CHAR_LENGTH(post_title) < 10"
		);

		$checks['pageTitles'] = array(
			'ok'         => 0 === $short,
			'shortCount' => $short,
			'label'      => $short > 0 ? $short . ' page(s) have very short titles' : 'All page titles look good',
			'url'        => admin_url( 'edit.php?post_type=page' ),
		);

		$ok_count = count(
			array_filter(
				$checks,
				static function ( array $check ): bool {
					return (bool) $check['ok'];
				}
			)
		);
		$score    = (int) round( ( $ok_count / count( $checks ) ) * 100 );

		return array(
			'score'  => $score,
			'checks' => $checks,
			'plugin' => defined( 'WPSEO_VERSION' ) ? 'yoast' : ( defined( 'RANK_MATH_VERSION' ) ? 'rankmath' : null ),
		);
	}

	/**
	 * Returns plugin-aware SEO overview data.
	 *
	 * @return array
	 */
	public function get_seo_overview(): array {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$total_pages = (int) $wpdb->get_var(
			"SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'page' AND post_status = 'publish'"
		);

		$plugin = null;
		if ( defined( 'WPSEO_VERSION' ) ) {
			$plugin = 'yoast';
		} elseif ( defined( 'RANK_MATH_VERSION' ) ) {
			$plugin = 'rankmath';
		} elseif ( defined( 'AIOSEO_VERSION' ) || class_exists( 'All_in_One_SEO_Pack' ) ) {
			$plugin = 'aioseo';
		}

		$issues       = array();
		$issues_count = 0;

		if ( 'yoast' === $plugin && $total_pages > 0 ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$missing_meta = (int) $wpdb->get_var(
				"SELECT COUNT(p.ID) FROM {$wpdb->posts} p
				 LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_yoast_wpseo_metadesc'
				 WHERE p.post_type = 'page' AND p.post_status = 'publish'
				   AND (pm.meta_value IS NULL OR pm.meta_value = '')"
			);

			if ( $missing_meta > 0 ) {
				$issues[] = array(
					'label' => $missing_meta . ' page' . ( $missing_meta > 1 ? 's' : '' ) . ' missing meta description',
					'url'   => 'edit.php?post_type=page',
				);
				$issues_count += $missing_meta;
			}
		}

		if ( $total_pages > 0 ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$short_pages = $wpdb->get_results(
				"SELECT ID, post_title FROM {$wpdb->posts}
				 WHERE post_type = 'page' AND post_status = 'publish' AND CHAR_LENGTH(post_title) < 10
				 LIMIT 5"
			);

			foreach ( $short_pages as $page ) {
				$title    = '' !== $page->post_title ? $page->post_title : '(untitled)';
				$issues[] = array(
					'label'   => '"' . $title . '" has a very short title',
					'url'     => 'post.php?post=' . $page->ID . '&action=edit',
					'editUrl' => admin_url( 'post.php?post=' . $page->ID . '&action=edit' ),
				);
				$issues_count++;
			}
		}

		$score = $total_pages > 0
			? max( 0, (int) round( ( 1 - min( 1.0, $issues_count / $total_pages ) ) * 100 ) )
			: 100;

		return array(
			'score'      => $score,
			'issues'     => $issues,
			'plugin'     => $plugin,
			'totalPages' => $total_pages,
		);
	}

	/**
	 * Returns onboarding checklist entries.
	 *
	 * @return array
	 */
	public function get_onboarding_checklist(): array {
		$checklist     = array();
		$site_title    = get_bloginfo( 'name' );
		$default_names = array( 'My WordPress Blog', 'My Blog', 'WordPress', '' );
		$title_ok      = ! in_array( $site_title, $default_names, true ) && strlen( $site_title ) > 3;

		$checklist[] = array(
			'key'   => 'site-title',
			'label' => 'Set your site name and tagline',
			'done'  => $title_ok,
			'url'   => 'options-general.php',
		);

		$page_count = (int) ( wp_count_posts( 'page' )->publish ?? 0 );
		$checklist[] = array(
			'key'   => 'first-page',
			'label' => 'Create and publish your first page',
			'done'  => $page_count > 0,
			'url'   => 'post-new.php?post_type=page',
		);

		$legal_keywords  = array( 'datenschutz', 'impressum', 'privacy', 'legal', 'cookie', 'terms', 'agb' );
		$all_drafts      = get_posts( array( 'post_type' => 'page', 'post_status' => 'draft', 'posts_per_page' => 50 ) );
		$has_legal_draft = false;

		foreach ( $all_drafts as $page ) {
			$lower = strtolower( $page->post_title );
			foreach ( $legal_keywords as $keyword ) {
				if ( false !== strpos( $lower, $keyword ) ) {
					$has_legal_draft = true;
					break 2;
				}
			}
		}

		$checklist[] = array(
			'key'   => 'legal-pages',
			'label' => 'Publish your privacy policy & legal pages',
			'done'  => ! $has_legal_draft,
			'url'   => 'edit.php?post_status=draft&post_type=page',
		);

		$updates     = $this->metrics->get_pending_updates();
		$checklist[] = array(
			'key'   => 'updates',
			'label' => 'Apply all available updates (free)',
			'done'  => 0 === $updates['total'],
			'url'   => 'update-core.php',
		);

		$health    = get_transient( 'health-check-site-status-result' );
		$health_ok = $health && isset( $health['status'] ) && 'good' === $health['status'];
		$checklist[] = array(
			'key'   => 'site-health',
			'label' => 'Fix site health issues',
			'done'  => $health_ok,
			'url'   => 'site-health.php',
		);

		return $checklist;
	}

	/**
	 * Returns overall site readiness score.
	 *
	 * @return int
	 */
	public function get_site_readiness_score(): int {
		$checklist = $this->get_onboarding_checklist();

		if ( empty( $checklist ) ) {
			return 100;
		}

		$done = count(
			array_filter(
				$checklist,
				static function ( array $item ): bool {
					return (bool) $item['done'];
				}
			)
		);

		return (int) round( ( $done / count( $checklist ) ) * 100 );
	}

	/**
	 * Searches for a legal page by title keywords.
	 *
	 * @param array $keywords Title fragments.
	 * @return array|null
	 */
	private function find_legal_page( array $keywords ): ?array {
		$pages = get_posts(
			array(
				'post_type'      => 'page',
				'post_status'    => array( 'publish', 'draft', 'pending' ),
				'posts_per_page' => 100,
			)
		);

		foreach ( $pages as $page ) {
			$lower = strtolower( $page->post_title );
			foreach ( $keywords as $keyword ) {
				if ( false !== strpos( $lower, $keyword ) ) {
					$days_old = (int) ceil( ( time() - strtotime( $page->post_modified_gmt ) ) / DAY_IN_SECONDS );

					return array(
						'exists'    => true,
						'published' => 'publish' === $page->post_status,
						'status'    => $page->post_status,
						'title'     => $page->post_title,
						'daysOld'   => $days_old,
						'editUrl'   => admin_url( 'post.php?post=' . $page->ID . '&action=edit' ),
						'viewUrl'   => 'publish' === $page->post_status ? get_permalink( $page->ID ) : null,
					);
				}
			}
		}

		return null;
	}
}
