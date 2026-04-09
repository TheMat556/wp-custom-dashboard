<?php
/**
 * Verifies the staged and zipped WP React UI plugin artifact.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

require_once __DIR__ . '/pluginArtifactSupport.php';

$stage_dir     = wp_react_ui_artifact_stage_dir();
$zip_path      = wp_react_ui_artifact_zip_path();
$checksum_path = wp_react_ui_artifact_checksum_path();

if ( ! is_dir( $stage_dir ) ) {
	throw new RuntimeException( 'Artifact stage directory not found: ' . $stage_dir );
}

if ( ! is_file( $zip_path ) ) {
	throw new RuntimeException( 'Artifact zip not found: ' . $zip_path );
}

$verification = wp_react_ui_verify_artifact_tree( $stage_dir );
$stage_files  = $verification['files'];

if ( ! in_array( 'artifact-manifest.json', $stage_files, true ) ) {
	throw new RuntimeException( 'Artifact manifest file missing from stage directory.' );
}

wp_react_ui_verify_artifact_zip( $zip_path, $stage_files );

if ( is_file( $checksum_path ) ) {
	$expected_checksum = hash_file( 'sha256', $zip_path ) . '  ' . basename( $zip_path );
	$actual_checksum   = trim( (string) file_get_contents( $checksum_path ) );

	if ( $expected_checksum !== $actual_checksum ) {
		throw new RuntimeException( 'Artifact checksum file does not match the zip contents.' );
	}
}

echo 'Verified artifact stage: ' . $stage_dir . PHP_EOL;
echo 'Verified artifact zip: ' . $zip_path . PHP_EOL;
echo 'Verified files: ' . count( $stage_files ) . PHP_EOL;
