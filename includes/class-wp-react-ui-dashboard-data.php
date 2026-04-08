<?php
/**
 * Gathers data for the React dashboard widgets.
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

class WP_React_UI_Dashboard_Data {

/**
 * Register front-end page-view tracking hook.
 */
public static function init(): void {
add_action( 'template_redirect', array( __CLASS__, 'track_page_view' ) );
}

/**
 * Increment today's page-view counter (front-end only, skips bots/feeds).
 */
public static function track_page_view(): void {
if ( is_feed() || is_trackback() ) {
return;
}
$ua = isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';
if ( $ua && preg_match( '/bot|crawl|slurp|spider|curl|wget|facebookexternalhit/i', $ua ) ) {
return;
}
$today = gmdate( 'Y-m-d' );
$key   = 'wp_react_ui_pv_' . $today;
$count = (int) get_transient( $key );
set_transient( $key, $count + 1, 2 * DAY_IN_SECONDS );
}

/**
 * Returns aggregated dashboard data for the React shell.
 *
 * @return array
 */
public static function get_dashboard_data(): array {
	return array(
		'atAGlance'           => self::get_at_a_glance(),
		'siteHealth'          => self::get_site_health(),
		'pendingUpdates'      => self::get_pending_updates(),
		'visitorTrend'        => self::get_visitor_trend(),
		'countryStats'        => self::get_country_stats(),
		'siteSpeed'           => self::get_site_speed(),
		'pagesOverview'       => self::get_pages_overview(),
		'actionItems'         => self::get_action_items(),
		'seoOverview'         => self::get_seo_overview(),
		'onboardingChecklist' => self::get_onboarding_checklist(),
		'siteReadinessScore'  => self::get_site_readiness_score(),
		'calendarPreview'     => self::get_calendar_preview(),
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

private static function get_site_health(): array {
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
$tests  = WP_Site_Health::get_tests();
$total  = 0;
$passed = 0;
if ( ! empty( $tests['direct'] ) ) {
foreach ( $tests['direct'] as $test ) {
if ( ! is_callable( $test['test'] ) ) {
continue;
}
$total++;
try {
$r = call_user_func( $test['test'] );
if ( isset( $r['status'] ) && 'good' === $r['status'] ) {
$passed++;
}
} catch ( \Throwable $e ) {
// skip.
}
}
}
if ( $total > 0 ) {
$result['score']  = round( ( $passed / $total ) * 100 );
$result['status'] = $result['score'] >= 80 ? 'good' : ( $result['score'] >= 50 ? 'recommended' : 'critical' );
}
} catch ( \Throwable $e ) {
// Site Health checks failed.
}

return $result;
}

/**
 * Returns post and comment counts for the last 6 months.
 */
private static function get_activity_per_month(): array {
global $wpdb;
$results = array();
for ( $i = 5; $i >= 0; $i-- ) {
$ts    = strtotime( "-{$i} months" );
$year  = (int) gmdate( 'Y', $ts );
$month = (int) gmdate( 'n', $ts );

$posts = (int) $wpdb->get_var( $wpdb->prepare(
"SELECT COUNT(*) FROM {$wpdb->posts}
 WHERE post_type = 'post' AND post_status = 'publish'
   AND YEAR(post_date) = %d AND MONTH(post_date) = %d",
$year, $month
) );

$comments = (int) $wpdb->get_var( $wpdb->prepare(
"SELECT COUNT(*) FROM {$wpdb->comments}
 WHERE comment_approved = '1'
   AND YEAR(comment_date) = %d AND MONTH(comment_date) = %d",
$year, $month
) );

$results[] = array(
'month'    => gmdate( 'M', $ts ),
'posts'    => $posts,
'comments' => $comments,
);
}
return $results;
}

private static function get_content_breakdown(): array {
$posts    = wp_count_posts( 'post' );
$pages    = wp_count_posts( 'page' );
$comments = wp_count_comments();
return array(
array( 'name' => 'Posts',    'value' => (int) ( $posts->publish ?? 0 ) ),
array( 'name' => 'Drafts',   'value' => (int) ( ( $posts->draft ?? 0 ) + ( $pages->draft ?? 0 ) ) ),
array( 'name' => 'Pages',    'value' => (int) ( $pages->publish ?? 0 ) ),
array( 'name' => 'Comments', 'value' => (int) ( $comments->approved ?? 0 ) ),
);
}

/**
 * Returns counts of available plugin, theme and core updates.
 */
private static function get_pending_updates(): array {
$plugins = 0;
$themes  = 0;
$core    = 0;

$plugin_updates = get_site_transient( 'update_plugins' );
if ( $plugin_updates && ! empty( $plugin_updates->response ) ) {
$plugins = count( $plugin_updates->response );
}

$theme_updates = get_site_transient( 'update_themes' );
if ( $theme_updates && ! empty( $theme_updates->response ) ) {
$themes = count( $theme_updates->response );
}

$core_updates = get_site_transient( 'update_core' );
if ( $core_updates && ! empty( $core_updates->updates ) ) {
foreach ( $core_updates->updates as $update ) {
if ( isset( $update->response ) && 'upgrade' === $update->response ) {
$core++;
}
}
}

return array(
'plugins'     => $plugins,
'themes'      => $themes,
'core'        => $core,
'total'       => $plugins + $themes + $core,
'lastChecked' => isset( $plugin_updates->last_checked ) ? (int) $plugin_updates->last_checked : null,
);
}

/**
 * Returns daily page-view counts for the last 30 days.
 */
private static function get_visitor_trend(): array {
$results = array();
for ( $i = 29; $i >= 0; $i-- ) {
$ts  = strtotime( "-{$i} days" );
$day = gmdate( 'Y-m-d', $ts );
$results[] = array(
'date'  => gmdate( 'M d', $ts ),
'views' => (int) get_transient( 'wp_react_ui_pv_' . $day ),
);
}
return $results;
}

/**
 * Returns country visit counts.
 * Uses WP Statistics plugin table if available, otherwise empty.
 */
private static function get_country_stats(): array {
global $wpdb;

// Try WP Statistics (most common analytics plugin).
$table = $wpdb->prefix . 'statistics_visitor';
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.NoCaching
if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) !== $table ) {
return array();
}

// Detect column name (older versions use 'country', newer use 'location').
$columns    = $wpdb->get_col( "SHOW COLUMNS FROM `{$table}`" ); // phpcs:ignore
$col        = in_array( 'location', $columns, true ) ? 'location' : 'country';
$thirty_ago = gmdate( 'Y-m-d', strtotime( '-30 days' ) );

$rows = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
$wpdb->prepare(
"SELECT `{$col}` AS country, COUNT(*) AS visits
 FROM `{$table}`
 WHERE last_counter >= %s
   AND `{$col}` != ''
   AND `{$col}` != 'xx'
   AND `{$col}` != '--'
 GROUP BY `{$col}`
 ORDER BY visits DESC
 LIMIT 10",
$thirty_ago
),
ARRAY_A
);

return array_map(
function ( $row ) {
return array(
'country' => strtoupper( (string) $row['country'] ),
'visits'  => (int) $row['visits'],
);
},
$rows ?? array()
);
}

/**
 * Measures homepage response time (cached 5 min).
 */
private static function get_site_speed(): array {
$cached = get_transient( 'wp_react_ui_site_speed' );
if ( false !== $cached ) {
return $cached;
}
$start    = microtime( true );
$response = wp_remote_get(
home_url( '/' ),
array(
'timeout'    => 8,
'sslverify'  => false,
'headers'    => array( 'Cache-Control' => 'no-cache' ),
'user-agent' => 'WP-React-UI-Health/1.0',
)
);
$ms = (int) round( ( microtime( true ) - $start ) * 1000 );
if ( is_wp_error( $response ) ) {
$error_msg = $response->get_error_message();
$reason    = 'Could not connect to your homepage.';
if ( false !== strpos( $error_msg, 'timed out' ) || false !== strpos( $error_msg, 'timeout' ) ) {
$reason = 'The server timed out — it took too long to respond.';
} elseif ( false !== strpos( $error_msg, 'SSL' ) || false !== strpos( $error_msg, 'ssl' ) ) {
$reason = 'SSL certificate issue — the security certificate may be expired or misconfigured.';
} elseif ( false !== strpos( $error_msg, 'dns' ) || false !== strpos( $error_msg, 'resolve' ) || false !== strpos( $error_msg, 'Name or service not known' ) ) {
$reason = 'Domain could not be resolved — the DNS settings may have changed.';
} elseif ( false !== strpos( $error_msg, 'refused' ) ) {
$reason = 'Connection refused — the web server may not be running.';
}
return array( 'ms' => null, 'status' => 'error', 'reason' => $reason );
}
$status = $ms < 600 ? 'good' : ( $ms < 1500 ? 'fair' : 'slow' );
$result = array( 'ms' => $ms, 'status' => $status );
set_transient( 'wp_react_ui_site_speed', $result, 5 * MINUTE_IN_SECONDS );
return $result;
}

/**
 * Returns published and draft pages.
 */
private static function get_pages_overview(): array {
$map = function ( $p ) {
$days_old = (int) ceil( ( time() - strtotime( $p->post_modified_gmt ) ) / DAY_IN_SECONDS );
return array(
'id'       => $p->ID,
'title'    => $p->post_title ?: '(untitled)',
'modified' => human_time_diff( strtotime( $p->post_modified_gmt ) ) . ' ago',
'daysOld'  => $days_old,
'editUrl'  => admin_url( 'post.php?post=' . $p->ID . '&action=edit' ),
'viewUrl'  => get_permalink( $p->ID ),
);
};
$recent = get_posts(
array(
'post_type'      => 'page',
'post_status'    => 'publish',
'posts_per_page' => 6,
'orderby'        => 'modified',
'order'          => 'DESC',
)
);
$drafts = get_posts(
array(
'post_type'      => 'page',
'post_status'    => 'draft',
'posts_per_page' => 6,
'orderby'        => 'modified',
'order'          => 'DESC',
)
);
$page_counts = wp_count_posts( 'page' );
return array(
'recent'         => array_map( $map, $recent ),
'drafts'         => array_map( $map, $drafts ),
'totalPublished' => (int) ( $page_counts->publish ?? 0 ),
'totalDrafts'    => (int) ( $page_counts->draft ?? 0 ),
);
}

/**
 * Returns actionable items with plain-language descriptions, sorted by severity.
 * Severity: error (act now) > warning (review soon) > info (low priority).
 */
private static function get_action_items(): array {
global $wpdb;
$errors   = array();
$warnings = array();
$infos    = array();

// ── Critical: site unreachable ─────────────────────────────────────────
$speed = get_transient( 'wp_react_ui_site_speed' );
if ( false !== $speed && isset( $speed['status'] ) && 'error' === $speed['status'] ) {
$errors[] = array(
'type'        => 'health',
'severity'    => 'error',
'title'       => 'Your website is not reachable',
'description' => 'We could not load your homepage. Visitors may not be able to access your site right now. Check with your hosting provider — they can tell you if the server is running.',
'action'      => 'Check site health',
'url'         => 'site-health.php',
);
}

// ── Critical: legal pages still in draft ──────────────────────────────
$legal_keywords = array( 'datenschutz', 'impressum', 'privacy', 'legal', 'cookie', 'terms', 'agb', 'haftung' );
$legal_ids      = array();
$all_drafts     = get_posts(
array(
'post_type'      => 'page',
'post_status'    => 'draft',
'posts_per_page' => 50,
)
);
foreach ( $all_drafts as $page ) {
$lower = strtolower( $page->post_title );
$is_legal = false;
foreach ( $legal_keywords as $kw ) {
if ( false !== strpos( $lower, $kw ) ) {
$is_legal = true;
break;
}
}
if ( $is_legal ) {
$legal_ids[] = $page->ID;
$days = (int) ceil( ( time() - strtotime( $page->post_modified_gmt ) ) / DAY_IN_SECONDS );
$errors[] = array(
'type'        => 'content',
'severity'    => 'error',
'title'       => '"' . $page->post_title . '" is not published',
'description' => 'This legal page has been a draft for ' . $days . ' day' . ( $days > 1 ? 's' : '' ) . '. Legal pages like privacy policies must be publicly accessible — leaving this unpublished may violate data protection law.',
'action'      => 'Review now',
'url'         => 'post.php?post=' . $page->ID . '&action=edit',
);
}
}

// ── Warning: WordPress core update ────────────────────────────────────
$core_updates = get_site_transient( 'update_core' );
if ( $core_updates && ! empty( $core_updates->updates ) ) {
foreach ( $core_updates->updates as $update ) {
if ( isset( $update->response ) && 'upgrade' === $update->response ) {
$warnings[] = array(
'type'        => 'update',
'severity'    => 'warning',
'title'       => 'WordPress update available (' . $update->version . ')',
'description' => 'Core updates include security patches. WordPress automatically backs up your settings before updating, so your content stays safe.',
'action'      => 'Update now',
'url'         => 'update-core.php',
);
break;
}
}
}

// ── Warning: plugin updates ───────────────────────────────────────────
$plugin_updates = get_site_transient( 'update_plugins' );
if ( $plugin_updates && ! empty( $plugin_updates->response ) ) {
$count      = count( $plugin_updates->response );
$warnings[] = array(
'type'        => 'update',
'severity'    => 'warning',
'title'       => $count . ' plugin update' . ( $count > 1 ? 's' : '' ) . ' available',
'description' => 'Outdated plugins can have security gaps. Updates usually take under a minute and do not affect your content. If something looks different afterwards, you can roll back.',
'action'      => 'Update now',
'url'         => 'update-core.php',
);
}

// ── Warning: theme updates ────────────────────────────────────────────
$theme_updates = get_site_transient( 'update_themes' );
if ( $theme_updates && ! empty( $theme_updates->response ) ) {
$count      = count( $theme_updates->response );
$warnings[] = array(
'type'        => 'update',
'severity'    => 'warning',
'title'       => $count . ' theme update' . ( $count > 1 ? 's' : '' ) . ' available',
'description' => 'Theme updates can include design fixes and security improvements. Your texts and images are stored separately and won\'t be lost.',
'action'      => 'Update now',
'url'         => 'update-core.php',
);
}

// ── Warning: site health issues ───────────────────────────────────────
$cached_health = get_transient( 'health-check-site-status-result' );
if ( $cached_health && isset( $cached_health['status'] )
&& in_array( $cached_health['status'], array( 'recommended', 'critical' ), true ) ) {
$is_critical = 'critical' === $cached_health['status'];
if ( $is_critical ) {
$errors[] = array(
'type'        => 'health',
'severity'    => 'error',
'title'       => 'WordPress has detected critical configuration issues',
'description' => 'The WordPress Site Health tool has found serious problems with your server setup that could affect your site\'s security or availability.',
'action'      => 'View report',
'url'         => 'site-health.php',
);
} else {
$warnings[] = array(
'type'        => 'health',
'severity'    => 'warning',
'title'       => 'WordPress has detected configuration issues',
'description' => 'The WordPress Site Health tool checks your server setup. Some issues can slow down your site or create security risks.',
'action'      => 'View report',
'url'         => 'site-health.php',
);
}
}

// ── Info: old non-legal drafts ────────────────────────────────────────
$exclude_ids = ! empty( $legal_ids ) ? $legal_ids : array( 0 );
$placeholders = implode( ',', array_fill( 0, count( $exclude_ids ), '%d' ) );
$old_count   = (int) $wpdb->get_var( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
$wpdb->prepare(
"SELECT COUNT(*) FROM {$wpdb->posts}
 WHERE post_type = 'page' AND post_status = 'draft'
   AND post_modified < %s
   AND ID NOT IN ({$placeholders})",
array_merge( array( gmdate( 'Y-m-d', strtotime( '-30 days' ) ) ), $exclude_ids )
)
);
if ( $old_count > 0 ) {
$infos[] = array(
'type'        => 'content',
'severity'    => 'info',
'title'       => $old_count . ' draft page' . ( $old_count > 1 ? 's' : '' ) . ' not updated in 30+ days',
'description' => 'These pages were started but not finished. You may want to either complete and publish them, or delete them to keep things tidy.',
'action'      => 'Review',
'url'         => 'edit.php?post_status=draft&post_type=page',
);
}

return array_merge( $errors, $warnings, $infos );
}

/**
 * Returns upcoming bookings from the H-Bricks-Elements calendar plugin.
 * Returns null if the plugin is not active.
 */
private static function get_calendar_preview(): ?array {
global $wpdb;

if ( ! function_exists( 'is_plugin_active' ) ) {
require_once ABSPATH . 'wp-admin/includes/plugin.php';
}

$plugin_file = 'h-bricks-elements/plugin.php';
if ( ! is_plugin_active( $plugin_file ) ) {
return null;
}

$table = $wpdb->prefix . 'hbe_bookings';
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.NoCaching
if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) !== $table ) {
return null;
}

$now      = current_time( 'mysql' );
$in_7days = gmdate( 'Y-m-d H:i:s', strtotime( '+7 days' ) );

// phpcs:ignore WordPress.DB.DirectDatabaseQuery
$bookings = $wpdb->get_results(
$wpdb->prepare(
"SELECT id, calendar_id, customer_name, start_datetime, end_datetime, status
 FROM {$table}
 WHERE start_datetime >= %s
   AND start_datetime <= %s
   AND status != 'cancelled'
 ORDER BY start_datetime ASC
 LIMIT 10",
$now,
$in_7days
),
ARRAY_A
);

if ( empty( $bookings ) ) {
return array( 'available' => true, 'upcoming' => array(), 'totalToday' => 0 );
}

$today = current_time( 'Y-m-d' );
$today_count = 0;
$items = array();
foreach ( $bookings as $b ) {
$start_date = substr( $b['start_datetime'], 0, 10 );
if ( $start_date === $today ) {
$today_count++;
}
$items[] = array(
'id'           => (int) $b['id'],
'customerName' => $b['customer_name'],
'startDate'    => $b['start_datetime'],
'endDate'      => $b['end_datetime'],
'status'       => $b['status'],
'calendarId'   => (int) $b['calendar_id'],
'isToday'      => $start_date === $today,
);
}

return array(
'available'  => true,
'upcoming'   => $items,
'totalToday' => $today_count,
);
}

/**
 * Returns an onboarding checklist for new site owners.
 */
private static function get_onboarding_checklist(): array {
$checklist = array();

// 1. Site title not default.
$site_title    = get_bloginfo( 'name' );
$default_names = array( 'My WordPress Blog', 'My Blog', 'WordPress', '' );
$title_ok      = ! in_array( $site_title, $default_names, true ) && strlen( $site_title ) > 3;
$checklist[] = array(
'key'   => 'site-title',
'label' => 'Set your site name and tagline',
'done'  => $title_ok,
'url'   => 'options-general.php',
);

// 2. At least one published page.
$page_count  = (int) ( wp_count_posts( 'page' )->publish ?? 0 );
$checklist[] = array(
'key'   => 'first-page',
'label' => 'Create and publish your first page',
'done'  => $page_count > 0,
'url'   => 'post-new.php?post_type=page',
);

// 3. No legal pages still in draft.
$legal_keywords = array( 'datenschutz', 'impressum', 'privacy', 'legal', 'cookie', 'terms', 'agb' );
$all_drafts     = get_posts( array( 'post_type' => 'page', 'post_status' => 'draft', 'posts_per_page' => 50 ) );
$has_legal_draft = false;
foreach ( $all_drafts as $dp ) {
$lower = strtolower( $dp->post_title );
foreach ( $legal_keywords as $kw ) {
if ( false !== strpos( $lower, $kw ) ) {
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

// 4. No pending updates.
$updates     = self::get_pending_updates();
$checklist[] = array(
'key'   => 'updates',
'label' => 'Apply all available updates',
'done'  => 0 === $updates['total'],
'url'   => 'update-core.php',
);

// 5. Site health good.
$health      = get_transient( 'health-check-site-status-result' );
$health_ok   = $health && isset( $health['status'] ) && 'good' === $health['status'];
$checklist[] = array(
'key'   => 'site-health',
'label' => 'Fix site health issues',
'done'  => $health_ok,
'url'   => 'site-health.php',
);

return $checklist;
}

/**
 * Calculates an overall site readiness score (0–100) based on the onboarding checklist.
 */
private static function get_site_readiness_score(): int {
$checklist = self::get_onboarding_checklist();
if ( empty( $checklist ) ) {
return 100;
}
$done = count( array_filter( $checklist, function ( $item ) { return (bool) $item['done']; } ) );
return (int) round( ( $done / count( $checklist ) ) * 100 );
}

/**
 * Returns a basic SEO overview.
 */
private static function get_seo_overview(): array {
global $wpdb;
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
$missing_meta = (int) $wpdb->get_var(
"SELECT COUNT(p.ID) FROM {$wpdb->posts} p
 LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_yoast_wpseo_metadesc'
 WHERE p.post_type = 'page' AND p.post_status = 'publish'
   AND (pm.meta_value IS NULL OR pm.meta_value = '')"
);
if ( $missing_meta > 0 ) {
$issues[]      = array(
'label' => $missing_meta . ' page' . ( $missing_meta > 1 ? 's' : '' ) . ' missing meta description',
'url'   => 'edit.php?post_type=page',
);
$issues_count += $missing_meta;
}
}
if ( $total_pages > 0 ) {
$short_title_pages = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
"SELECT ID, post_title FROM {$wpdb->posts}
 WHERE post_type = 'page' AND post_status = 'publish' AND CHAR_LENGTH(post_title) < 10
 LIMIT 5"
);
foreach ( $short_title_pages as $sp ) {
$title = $sp->post_title ?: '(untitled)';
$issues[] = array(
'label'   => '"' . $title . '" has a very short title',
'url'     => 'post.php?post=' . $sp->ID . '&action=edit',
'editUrl' => admin_url( 'post.php?post=' . $sp->ID . '&action=edit' ),
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
}
