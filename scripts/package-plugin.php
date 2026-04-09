<?php
/**
 * Builds the deployable WP React UI plugin artifact.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

require_once __DIR__ . '/pluginArtifactSupport.php';

$project_root  = wp_react_ui_project_root();
$artifacts_dir = wp_react_ui_artifacts_dir();
$stage_dir     = wp_react_ui_artifact_stage_dir();
$zip_path      = wp_react_ui_artifact_zip_path();
$checksum_path = wp_react_ui_artifact_checksum_path();

wp_react_ui_ensure_directory( $artifacts_dir );
wp_react_ui_remove_path( $stage_dir );

if ( file_exists( $zip_path ) ) {
	unlink( $zip_path );
}

if ( file_exists( $checksum_path ) ) {
	unlink( $checksum_path );
}

wp_react_ui_ensure_directory( $stage_dir );

foreach ( WpReactUi\Contracts\PluginArtifactContract::INCLUDED_TOP_LEVEL_PATHS as $relative_path ) {
	$source_path      = $project_root . '/' . $relative_path;
	$destination_path = $stage_dir . '/' . $relative_path;

	if ( ! file_exists( $source_path ) ) {
		throw new RuntimeException( 'Included artifact path is missing: ' . $relative_path );
	}

	wp_react_ui_copy_path( $source_path, $destination_path );
}

wp_react_ui_normalize_mtimes( $stage_dir );

$verification = wp_react_ui_verify_artifact_tree( $stage_dir );
$files        = $verification['files'];

wp_react_ui_write_artifact_manifest( $stage_dir, $files );
wp_react_ui_normalize_mtimes( $stage_dir . '/artifact-manifest.json' );

$stage_files = wp_react_ui_collect_stage_files( $stage_dir );

wp_react_ui_create_artifact_zip( $stage_dir, $zip_path );
wp_react_ui_verify_artifact_zip( $zip_path, $stage_files );

$checksum = hash_file( 'sha256', $zip_path );
file_put_contents( $checksum_path, $checksum . '  ' . basename( $zip_path ) . PHP_EOL );

echo 'Staged artifact: ' . $stage_dir . PHP_EOL;
echo 'Created zip: ' . $zip_path . PHP_EOL;
echo 'SHA256: ' . $checksum . PHP_EOL;
