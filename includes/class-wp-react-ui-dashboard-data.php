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
'seoBasics'           => self::get_seo_basics(),
'legalCompliance'     => self::get_legal_compliance(),
'businessFunctions'   => self::get_business_functions(),
'onboardingChecklist' => self::get_onboarding_checklist(),
'siteReadinessScore'  => self::get_site_readiness_score(),
'calendarPreview'     => self::get_calendar_preview(),
);
}

private static function get_at_a_glance(): array {
$posts    = wp_count_posts( 'post' );
$pages    = wp_count_posts( 'page' );
$users    = count_users();

return array(
'posts'      => (int) ( $posts->publish ?? 0 ),
'postsDraft' => (int) ( $posts->draft ?? 0 ),
'pages'      => (int) ( $pages->publish ?? 0 ),
'pagesDraft' => (int) ( $pages->draft ?? 0 ),
'users'      => (int) ( $users['total_users'] ?? 0 ),
'wpVersion'  => get_bloginfo( 'version' ),
'phpVersion' => PHP_VERSION,
);
}

private static function get_site_health(): array {
$result = array( 'status' => 'unknown', 'score' => 0 );
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
 * Returns plugin/theme/core update counts + detailed lists.
 */
private static function get_pending_updates(): array {
if ( ! function_exists( 'get_plugin_data' ) ) {
require_once ABSPATH . 'wp-admin/includes/plugin.php';
}

$plugins_list = array();
$themes_list  = array();
$core_list    = array();

$plugin_updates = get_site_transient( 'update_plugins' );
if ( $plugin_updates && ! empty( $plugin_updates->response ) ) {
foreach ( $plugin_updates->response as $slug => $data ) {
$file = WP_PLUGIN_DIR . '/' . $slug;
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
$theme = wp_get_theme( $slug );
$themes_list[] = array(
'slug'           => $slug,
'name'           => $theme->get( 'Name' ) ?: $slug,
'currentVersion' => $theme->get( 'Version' ) ?: '?',
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
 */
private static function get_visitor_trend(): array {
$results   = array();
$total_now = 0;
$total_prev = 0;
for ( $i = 59; $i >= 0; $i-- ) {
$ts    = strtotime( "-{$i} days" );
$day   = gmdate( 'Y-m-d', $ts );
$views = (int) get_transient( 'wp_react_ui_pv_' . $day );
if ( $i < 30 ) {
$results[] = array(
'date'  => gmdate( 'M d', $ts ),
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
'days'       => $results,
'total'      => $total_now,
'prevTotal'  => $total_prev,
'trendPct'   => $trend,
);
}

/**
 * Returns country visit counts.
 */
private static function get_country_stats(): array {
global $wpdb;
$table = $wpdb->prefix . 'statistics_visitor';
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.NoCaching
if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) !== $table ) {
return array();
}
$columns = $wpdb->get_col( "SHOW COLUMNS FROM `{$table}`" ); // phpcs:ignore
$col     = in_array( 'location', $columns, true ) ? 'location' : 'country';
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
 * Measures homepage response time.
 * Stores a history of the last 48 checks so the React side can show uptime trends.
 */
private static function get_site_speed(): array {
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
'sslverify'  => false,
'headers'    => array( 'Cache-Control' => 'no-cache' ),
'user-agent' => 'WP-React-UI-Health/1.0',
)
);
$ms = (int) round( ( microtime( true ) - $start ) * 1000 );

// Maintain rolling history (last 48 checks, ~4h at 5-min cadence).
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
$recent = get_posts( array( 'post_type' => 'page', 'post_status' => 'publish', 'posts_per_page' => 6, 'orderby' => 'modified', 'order' => 'DESC' ) );
$drafts = get_posts( array( 'post_type' => 'page', 'post_status' => 'draft', 'posts_per_page' => 6, 'orderby' => 'modified', 'order' => 'DESC' ) );
$page_counts = wp_count_posts( 'page' );
return array(
'recent'         => array_map( $map, $recent ),
'drafts'         => array_map( $map, $drafts ),
'totalPublished' => (int) ( $page_counts->publish ?? 0 ),
'totalDrafts'    => (int) ( $page_counts->draft ?? 0 ),
);
}

/**
 * Returns actionable items with plain-language descriptions.
 */
private static function get_action_items(): array {
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
foreach ( $legal_keywords as $kw ) {
if ( false !== strpos( $lower, $kw ) ) {
$legal_ids[] = $page->ID;
$days = (int) ceil( ( time() - strtotime( $page->post_modified_gmt ) ) / DAY_IN_SECONDS );
$errors[] = array(
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
$old_count    = (int) $wpdb->get_var( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
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
'impact'      => 'These pages are not visible to visitors, but they clutter your admin area.',
'description' => 'Decide whether to finish and publish them or delete them.',
'action'      => 'Review',
'url'         => 'edit.php?post_status=draft&post_type=page',
);
}

return array_merge( $errors, $warnings, $infos );
}

/**
 * Returns a legal compliance snapshot.
 */
private static function get_legal_compliance(): array {
if ( ! function_exists( 'is_plugin_active' ) ) {
require_once ABSPATH . 'wp-admin/includes/plugin.php';
}

// Privacy policy (WP core setting).
$pp_id = (int) get_option( 'wp_page_for_privacy_policy', 0 );
if ( $pp_id ) {
$pp   = get_post( $pp_id );
$privacy = array(
'exists'    => true,
'published' => $pp && 'publish' === $pp->post_status,
'status'    => $pp ? $pp->post_status : 'none',
'title'     => $pp ? $pp->post_title : '',
'editUrl'   => admin_url( 'post.php?post=' . $pp_id . '&action=edit' ),
'viewUrl'   => $pp && 'publish' === $pp->post_status ? get_permalink( $pp_id ) : null,
);
} else {
$found = self::find_legal_page( array( 'datenschutz', 'datenschutzerklärung', 'privacy', 'privacy policy' ) );
$privacy = $found ?? array( 'exists' => false, 'published' => false );
}

// Impressum.
$impressum = self::find_legal_page( array( 'impressum', 'imprint', 'legal notice' ) );
if ( ! $impressum ) {
$impressum = array( 'exists' => false, 'published' => false );
}

// Cookie consent plugin.
$cookie_plugins = array(
'cookie-law-info/cookie-law-info.php',
'cookiebot/cookiebot.php',
'gdpr-cookie-compliance/moove-gdpr.php',
'cookie-notice/cookie-notice.php',
'complianz-gdpr/complianz-gdpr.php',
'real-cookie-banner/real-cookie-banner.php',
);
$cookie_plugin = null;
foreach ( $cookie_plugins as $cp ) {
if ( is_plugin_active( $cp ) ) {
$cookie_plugin = basename( dirname( $cp ) );
break;
}
}

// Tracking without consent banner.
$tracking_plugins = array(
'google-analytics-for-wordpress/googleanalytics.php',
'wp-statistics/wp-statistics.php',
'google-site-kit/google-site-kit.php',
'matomo/matomo.php',
'analytify/analytify.php',
);
$has_tracking = false;
foreach ( $tracking_plugins as $tp ) {
if ( is_plugin_active( $tp ) ) {
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
 * Searches for a legal page by title keywords across all statuses.
 */
private static function find_legal_page( array $keywords ): ?array {
$pages = get_posts( array( 'post_type' => 'page', 'post_status' => array( 'publish', 'draft', 'pending' ), 'posts_per_page' => 100 ) );
foreach ( $pages as $page ) {
$lower = strtolower( $page->post_title );
foreach ( $keywords as $kw ) {
if ( false !== strpos( $lower, $kw ) ) {
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

/**
 * Returns the status of key business functions (bookings, forms, email).
 */
private static function get_business_functions(): array {
if ( ! function_exists( 'is_plugin_active' ) ) {
require_once ABSPATH . 'wp-admin/includes/plugin.php';
}

$functions = array();

// Bookings via h-bricks-elements.
$cal = self::get_calendar_preview();
if ( null !== $cal ) {
$functions['bookings'] = array(
'available'      => true,
'status'         => 'active',
'totalUpcoming'  => count( $cal['upcoming'] ?? array() ),
'totalToday'     => $cal['totalToday'] ?? 0,
'note'           => 'Booking system is active. Periodically test the booking form to verify it works end-to-end.',
'testUrl'        => get_home_url(),
);
} else {
$functions['bookings'] = array( 'available' => false, 'status' => 'not_installed' );
}

// Contact forms.
$form_plugins = array(
'contact-form-7/wp-contact-form-7.php' => 'Contact Form 7 (free)',
'gravityforms/gravityforms.php'         => 'Gravity Forms',
'wpforms-lite/wpforms.php'              => 'WPForms (free)',
'formidable/formidable.php'             => 'Formidable Forms',
'ninja-forms/ninja-forms.php'           => 'Ninja Forms (free)',
'fluentform/fluentform.php'             => 'FluentForms (free)',
);
$active_form = null;
foreach ( $form_plugins as $file => $name ) {
if ( is_plugin_active( $file ) ) {
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
$functions['contactForms'] = array( 'available' => false, 'status' => 'not_installed', 'note' => 'No contact form plugin detected.' );
}

// Email delivery.
$smtp_plugins = array(
'wp-mail-smtp/wp_mail_smtp.php'     => 'WP Mail SMTP (free)',
'post-smtp/postman-smtp.php'         => 'Post SMTP',
'fluent-smtp/fluent-smtp.php'        => 'FluentSMTP (free)',
'easy-wp-smtp/easy-wp-smtp.php'      => 'Easy WP SMTP (free)',
'sendgrid-email-delivery-simplified/wpsendgrid.php' => 'SendGrid',
);
$active_smtp = null;
foreach ( $smtp_plugins as $file => $name ) {
if ( is_plugin_active( $file ) ) {
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
 * Returns basic SEO checks that work without an SEO plugin.
 */
private static function get_seo_basics(): array {
global $wpdb;

$checks = array();

// Search engine visibility.
$discourage = '0' === get_option( 'blog_public' );
$checks['searchVisible'] = array(
'ok'       => ! $discourage,
'label'    => $discourage ? 'Search engines are blocked (Settings → Reading)' : 'Visible to search engines',
'critical' => $discourage,
'url'      => admin_url( 'options-reading.php' ),
);

// Homepage title.
$home_page_id = (int) get_option( 'page_on_front', 0 );
if ( $home_page_id ) {
$home_page       = get_post( $home_page_id );
$title_value     = $home_page ? $home_page->post_title : '';
$home_title_ok   = strlen( $title_value ) >= 10;
$edit_url        = admin_url( 'post.php?post=' . $home_page_id . '&action=edit' );
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

// Sitemap.
$sitemap_url      = home_url( '/sitemap.xml' );
$sitemap_response = wp_remote_head( $sitemap_url, array( 'timeout' => 5, 'sslverify' => false ) );
$sitemap_ok       = ! is_wp_error( $sitemap_response ) && 200 === (int) wp_remote_retrieve_response_code( $sitemap_response );
$checks['sitemap'] = array(
'ok'    => $sitemap_ok,
'label' => $sitemap_ok ? 'Sitemap found at /sitemap.xml' : 'No sitemap found at /sitemap.xml',
'url'   => $sitemap_url,
);

// Pages with very short titles.
$short = (int) $wpdb->get_var(
"SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'page' AND post_status = 'publish' AND CHAR_LENGTH(post_title) < 10"
);
$checks['pageTitles'] = array(
'ok'         => 0 === $short,
'shortCount' => $short,
'label'      => $short > 0 ? $short . ' page(s) have very short titles' : 'All page titles look good',
'url'        => admin_url( 'edit.php?post_type=page' ),
);

$ok_count = count( array_filter( $checks, function ( $c ) { return (bool) $c['ok']; } ) );
$score    = (int) round( ( $ok_count / count( $checks ) ) * 100 );

return array(
'score'  => $score,
'checks' => $checks,
'plugin' => defined( 'WPSEO_VERSION' ) ? 'yoast' : ( defined( 'RANK_MATH_VERSION' ) ? 'rankmath' : null ),
);
}

/**
 * Returns a basic SEO overview (plugin-aware).
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
$short_pages = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
"SELECT ID, post_title FROM {$wpdb->posts}
 WHERE post_type = 'page' AND post_status = 'publish' AND CHAR_LENGTH(post_title) < 10
 LIMIT 5"
);
foreach ( $short_pages as $sp ) {
$title    = $sp->post_title ?: '(untitled)';
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

/**
 * Returns upcoming bookings from the H-Bricks-Elements calendar plugin.
 */
private static function get_calendar_preview(): ?array {
global $wpdb;
if ( ! function_exists( 'is_plugin_active' ) ) {
require_once ABSPATH . 'wp-admin/includes/plugin.php';
}
if ( ! is_plugin_active( 'h-bricks-elements/plugin.php' ) ) {
return null;
}
$table = $wpdb->prefix . 'hbe_bookings';
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.NoCaching
if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) !== $table ) {
return null;
}
$today          = current_time( 'Y-m-d' );
$start_of_today = $today . ' 00:00:00';
$in_7days       = gmdate( 'Y-m-d H:i:s', strtotime( '+7 days', strtotime( $today . ' 00:00:00' ) ) );
// phpcs:ignore WordPress.DB.DirectDatabaseQuery
$bookings = $wpdb->get_results(
$wpdb->prepare(
"SELECT id, calendar_id, customer_name, start_datetime, end_datetime, status
 FROM {$table}
 WHERE start_datetime >= %s AND start_datetime <= %s AND status != 'cancelled'
 ORDER BY start_datetime ASC LIMIT 50",
$start_of_today, $in_7days
),
ARRAY_A
);
if ( empty( $bookings ) ) {
$week_days = array();
for ( $i = 0; $i < 7; $i++ ) {
$ts   = strtotime( "+{$i} days", strtotime( $today . ' 00:00:00' ) );
$date = gmdate( 'Y-m-d', $ts );
$week_days[] = array(
'date'     => $date,
'dayLabel' => gmdate( 'D', $ts ),
'dayNum'   => (int) gmdate( 'j', $ts ),
'month'    => gmdate( 'M', $ts ),
'isToday'  => $date === $today,
'bookings' => array(),
'count'    => 0,
);
}
return array( 'available' => true, 'upcoming' => array(), 'totalToday' => 0, 'weekDays' => $week_days );
}
$now         = current_time( 'mysql' );
$today_count = 0;
$upcoming    = array();
$by_date     = array();
foreach ( $bookings as $b ) {
$start_date = substr( $b['start_datetime'], 0, 10 );
$item       = array(
'id'           => (int) $b['id'],
'customerName' => $b['customer_name'],
'startDate'    => $b['start_datetime'],
'endDate'      => $b['end_datetime'],
'status'       => $b['status'],
'calendarId'   => (int) $b['calendar_id'],
'isToday'      => $start_date === $today,
);
if ( $start_date === $today ) {
$today_count++;
}
if ( $b['start_datetime'] >= $now ) {
$upcoming[] = $item;
}
if ( ! isset( $by_date[ $start_date ] ) ) {
$by_date[ $start_date ] = array();
}
$by_date[ $start_date ][] = $item;
}
$week_days = array();
for ( $i = 0; $i < 7; $i++ ) {
$ts   = strtotime( "+{$i} days", strtotime( $today . ' 00:00:00' ) );
$date = gmdate( 'Y-m-d', $ts );
$week_days[] = array(
'date'     => $date,
'dayLabel' => gmdate( 'D', $ts ),
'dayNum'   => (int) gmdate( 'j', $ts ),
'month'    => gmdate( 'M', $ts ),
'isToday'  => $date === $today,
'bookings' => $by_date[ $date ] ?? array(),
'count'    => isset( $by_date[ $date ] ) ? count( $by_date[ $date ] ) : 0,
);
}
return array( 'available' => true, 'upcoming' => $upcoming, 'totalToday' => $today_count, 'weekDays' => $week_days );
}

/**
 * Returns an onboarding checklist for new site owners.
 */
private static function get_onboarding_checklist(): array {
$checklist = array();
$site_title    = get_bloginfo( 'name' );
$default_names = array( 'My WordPress Blog', 'My Blog', 'WordPress', '' );
$title_ok      = ! in_array( $site_title, $default_names, true ) && strlen( $site_title ) > 3;
$checklist[] = array( 'key' => 'site-title', 'label' => 'Set your site name and tagline', 'done' => $title_ok, 'url' => 'options-general.php' );

$page_count  = (int) ( wp_count_posts( 'page' )->publish ?? 0 );
$checklist[] = array( 'key' => 'first-page', 'label' => 'Create and publish your first page', 'done' => $page_count > 0, 'url' => 'post-new.php?post_type=page' );

$legal_keywords  = array( 'datenschutz', 'impressum', 'privacy', 'legal', 'cookie', 'terms', 'agb' );
$all_drafts      = get_posts( array( 'post_type' => 'page', 'post_status' => 'draft', 'posts_per_page' => 50 ) );
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
$checklist[] = array( 'key' => 'legal-pages', 'label' => 'Publish your privacy policy & legal pages', 'done' => ! $has_legal_draft, 'url' => 'edit.php?post_status=draft&post_type=page' );

$updates     = self::get_pending_updates();
$checklist[] = array( 'key' => 'updates', 'label' => 'Apply all available updates (free)', 'done' => 0 === $updates['total'], 'url' => 'update-core.php' );

$health    = get_transient( 'health-check-site-status-result' );
$health_ok = $health && isset( $health['status'] ) && 'good' === $health['status'];
$checklist[] = array( 'key' => 'site-health', 'label' => 'Fix site health issues', 'done' => $health_ok, 'url' => 'site-health.php' );

return $checklist;
}

/**
 * Calculates an overall site readiness score (0–100).
 */
private static function get_site_readiness_score(): int {
$checklist = self::get_onboarding_checklist();
if ( empty( $checklist ) ) {
return 100;
}
$done = count( array_filter( $checklist, function ( $item ) { return (bool) $item['done']; } ) );
return (int) round( ( $done / count( $checklist ) ) * 100 );
}

}
