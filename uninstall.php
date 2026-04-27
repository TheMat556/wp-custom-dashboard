<?php
/**
 * Uninstall handler for WP Custom Dashboard.
 *
 * Cleans up all plugin options, transients, and user meta when the plugin
 * is deleted via the WordPress admin plugins screen.
 *
 * @package WP_React_UI
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;

// ── Options ─────────────────────────────────────────────────────────────────

$options = array(
	'wp_react_ui_license_settings',
	'wp_react_ui_license_server_url',
	'wp_react_ui_branding_settings',
	'wp_react_ui_manifest_mtime',
	'wp_react_ui_options_migrated_v2',
	'wp_react_ui_navigation_preferences',
);

foreach ( $options as $option_name ) {
	delete_option( $option_name );
}

// ── Transients ───────────────────────────────────────────────────────────────

$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s OR option_name LIKE %s OR option_name LIKE %s",
		$wpdb->esc_like( '_transient_wp_react_ui_' ) . '%',
		$wpdb->esc_like( '_transient_timeout_wp_react_ui_' ) . '%',
		$wpdb->esc_like( '_transient_wprui_' ) . '%',
		$wpdb->esc_like( '_transient_timeout_wprui_' ) . '%'
	)
);

// ── User meta ────────────────────────────────────────────────────────────────

delete_metadata( 'user', 0, 'wp_react_ui_theme', '', true );

// Flush any remaining caches.
wp_cache_flush();
