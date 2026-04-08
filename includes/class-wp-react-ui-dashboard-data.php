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
'siteHealth'       => self::get_site_health(),
'activityPerMonth' => self::get_activity_per_month(),
'contentBreakdown' => self::get_content_breakdown(),
'pendingUpdates'   => self::get_pending_updates(),
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
$result['score'] = round( ( $passed / $total ) * 100 );
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
$year  = (int) date( 'Y', $ts );
$month = (int) date( 'n', $ts );

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
'month'    => date( 'M', $ts ),
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
'plugins' => $plugins,
'themes'  => $themes,
'core'    => $core,
'total'   => $plugins + $themes + $core,
);
}
}
