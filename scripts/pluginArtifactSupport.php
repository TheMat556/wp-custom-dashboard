<?php
/**
 * Artifact packaging support for the deployable WP React UI plugin.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

use WpReactUi\Contracts\PluginArtifactContract;

require_once dirname( __DIR__ ) . '/contracts/php/PluginArtifactContract.php';

/**
 * Returns the project root.
 *
 * @return string
 */
function wp_react_ui_project_root(): string {
	return dirname( __DIR__ );
}

/**
 * Returns the artifacts directory path.
 *
 * @return string
 */
function wp_react_ui_artifacts_dir(): string {
	return wp_react_ui_project_root() . '/artifacts';
}

/**
 * Returns the staged artifact directory path.
 *
 * @return string
 */
function wp_react_ui_artifact_stage_dir(): string {
	return wp_react_ui_artifacts_dir() . '/' . PluginArtifactContract::ARTIFACT_SLUG;
}

/**
 * Returns the packaged artifact zip path.
 *
 * @return string
 */
function wp_react_ui_artifact_zip_path(): string {
	return wp_react_ui_artifacts_dir() . '/' . PluginArtifactContract::ARTIFACT_SLUG . '.zip';
}

/**
 * Returns the artifact checksum path.
 *
 * @return string
 */
function wp_react_ui_artifact_checksum_path(): string {
	return wp_react_ui_artifact_zip_path() . '.sha256';
}

/**
 * Recursively deletes a path when it exists.
 *
 * @param string $path File or directory path.
 * @return void
 */
function wp_react_ui_remove_path( string $path ): void {
	if ( ! file_exists( $path ) ) {
		return;
	}

	if ( is_file( $path ) || is_link( $path ) ) {
		unlink( $path );
		return;
	}

	$items = scandir( $path );

	if ( false === $items ) {
		throw new RuntimeException( 'Failed to scan path for removal: ' . $path );
	}

	foreach ( $items as $item ) {
		if ( '.' === $item || '..' === $item ) {
			continue;
		}

		wp_react_ui_remove_path( $path . '/' . $item );
	}

	rmdir( $path );
}

/**
 * Ensures a directory exists.
 *
 * @param string $path Directory path.
 * @return void
 */
function wp_react_ui_ensure_directory( string $path ): void {
	if ( is_dir( $path ) ) {
		return;
	}

	if ( ! mkdir( $path, 0777, true ) && ! is_dir( $path ) ) {
		throw new RuntimeException( 'Failed to create directory: ' . $path );
	}
}

/**
 * Copies a file or directory into the artifact stage.
 *
 * @param string $source Source path.
 * @param string $destination Destination path.
 * @return void
 */
function wp_react_ui_copy_path( string $source, string $destination ): void {
	if ( is_file( $source ) ) {
		wp_react_ui_ensure_directory( dirname( $destination ) );

		if ( ! copy( $source, $destination ) ) {
			throw new RuntimeException( 'Failed to copy file: ' . $source );
		}

		return;
	}

	wp_react_ui_ensure_directory( $destination );

	$items = scandir( $source );

	if ( false === $items ) {
		throw new RuntimeException( 'Failed to scan source path: ' . $source );
	}

	foreach ( $items as $item ) {
		if ( '.' === $item || '..' === $item ) {
			continue;
		}

		wp_react_ui_copy_path( $source . '/' . $item, $destination . '/' . $item );
	}
}

/**
 * Normalizes mtimes in the stage directory for repeatable zipping.
 *
 * @param string $path Stage path.
 * @return void
 */
function wp_react_ui_normalize_mtimes( string $path ): void {
	if ( ! file_exists( $path ) ) {
		return;
	}

	if ( is_dir( $path ) ) {
		$items = scandir( $path );

		if ( false === $items ) {
			throw new RuntimeException( 'Failed to scan path for mtime normalization: ' . $path );
		}

		foreach ( $items as $item ) {
			if ( '.' === $item || '..' === $item ) {
				continue;
			}

			wp_react_ui_normalize_mtimes( $path . '/' . $item );
		}
	}

	touch( $path, PluginArtifactContract::NORMALIZED_TIMESTAMP );
}

/**
 * Returns all staged files as sorted relative paths.
 *
 * @param string $base_dir Stage directory.
 * @return array<int, string>
 */
function wp_react_ui_collect_stage_files( string $base_dir ): array {
	$base_length = strlen( rtrim( $base_dir, '/' ) ) + 1;
	$paths       = array();
	$iterator    = new RecursiveIteratorIterator(
		new RecursiveDirectoryIterator(
			$base_dir,
			FilesystemIterator::SKIP_DOTS
		)
	);

	foreach ( $iterator as $file_info ) {
		if ( ! $file_info->isFile() ) {
			continue;
		}

		$paths[] = substr( $file_info->getPathname(), $base_length );
	}

	sort( $paths );

	return $paths;
}

/**
 * Reads and decodes a Vite manifest.
 *
 * @param string $base_dir Project root or staged artifact root.
 * @return array<string, mixed>
 */
function wp_react_ui_read_manifest( string $base_dir ): array {
	$manifest_path = rtrim( $base_dir, '/' ) . '/dist/.vite/manifest.json';

	if ( ! is_file( $manifest_path ) ) {
		throw new RuntimeException( 'Manifest file not found: ' . $manifest_path );
	}

	$contents = file_get_contents( $manifest_path );

	if ( false === $contents ) {
		throw new RuntimeException( 'Failed to read manifest file: ' . $manifest_path );
	}

	$manifest = json_decode( $contents, true );

	if ( ! is_array( $manifest ) ) {
		throw new RuntimeException( 'Failed to decode manifest JSON: ' . $manifest_path );
	}

	return $manifest;
}

/**
 * Verifies the stage directory or source tree against the artifact contract.
 *
 * @param string $base_dir Project root or staged artifact root.
 * @return array{manifest: array<string, mixed>, files: array<int, string>}
 */
function wp_react_ui_verify_artifact_tree( string $base_dir ): array {
	foreach ( PluginArtifactContract::REQUIRED_RUNTIME_FILES as $relative_path ) {
		$absolute_path = rtrim( $base_dir, '/' ) . '/' . $relative_path;

		if ( ! file_exists( $absolute_path ) ) {
			throw new RuntimeException( 'Required runtime file missing: ' . $relative_path );
		}
	}

	foreach ( PluginArtifactContract::FORBIDDEN_ARTIFACT_PATHS as $relative_path ) {
		$absolute_path = rtrim( $base_dir, '/' ) . '/' . $relative_path;

		if ( file_exists( $absolute_path ) ) {
			throw new RuntimeException( 'Forbidden path present in artifact: ' . $relative_path );
		}
	}

	$manifest = wp_react_ui_read_manifest( $base_dir );

	foreach ( PluginArtifactContract::REQUIRED_MANIFEST_ENTRIES as $entry_key ) {
		if ( ! isset( $manifest[ $entry_key ] ) || ! is_array( $manifest[ $entry_key ] ) ) {
			throw new RuntimeException( 'Required manifest entry missing: ' . $entry_key );
		}

		$entry_file = $manifest[ $entry_key ]['file'] ?? null;

		if ( ! is_string( $entry_file ) || '' === $entry_file ) {
			throw new RuntimeException( 'Manifest entry missing built file: ' . $entry_key );
		}

		$built_path = rtrim( $base_dir, '/' ) . '/dist/' . $entry_file;

		if ( ! is_file( $built_path ) ) {
			throw new RuntimeException( 'Built asset missing for manifest entry: ' . $entry_key );
		}
	}

	$files = wp_react_ui_collect_stage_files( $base_dir );

	return array(
		'manifest' => $manifest,
		'files'    => $files,
	);
}

/**
 * Writes an artifact manifest file to the stage directory.
 *
 * @param string            $stage_dir Stage directory.
 * @param array<int, string> $files Relative file paths.
 * @return void
 */
function wp_react_ui_write_artifact_manifest( string $stage_dir, array $files ): void {
	$entries = array();

	foreach ( $files as $relative_path ) {
		$absolute_path = $stage_dir . '/' . $relative_path;
		$entries[]     = array(
			'path'   => $relative_path,
			'sha256' => hash_file( 'sha256', $absolute_path ),
			'size'   => filesize( $absolute_path ),
		);
	}

	$payload = array(
		'artifact' => PluginArtifactContract::ARTIFACT_SLUG,
		'files'    => $entries,
	);

	file_put_contents(
		$stage_dir . '/artifact-manifest.json',
		json_encode( $payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . PHP_EOL
	);
}

/**
 * Creates the artifact zip from the stage directory.
 *
 * @param string $stage_dir Stage directory.
 * @param string $zip_path Zip output path.
 * @return void
 */
function wp_react_ui_create_artifact_zip( string $stage_dir, string $zip_path ): void {
	$zip = new ZipArchive();

	if ( true !== $zip->open( $zip_path, ZipArchive::CREATE | ZipArchive::OVERWRITE ) ) {
		throw new RuntimeException( 'Failed to create artifact zip: ' . $zip_path );
	}

	$files = wp_react_ui_collect_stage_files( $stage_dir );

	foreach ( $files as $relative_path ) {
		$absolute_path = $stage_dir . '/' . $relative_path;
		$zip_path_name = PluginArtifactContract::ARTIFACT_SLUG . '/' . $relative_path;

		if ( ! $zip->addFile( $absolute_path, $zip_path_name ) ) {
			throw new RuntimeException( 'Failed to add file to artifact zip: ' . $relative_path );
		}
	}

	$zip->close();
}

/**
 * Verifies the zip contains the expected staged files under the artifact root directory.
 *
 * @param string            $zip_path Zip output path.
 * @param array<int, string> $stage_files Relative staged file paths.
 * @return void
 */
function wp_react_ui_verify_artifact_zip( string $zip_path, array $stage_files ): void {
	$zip = new ZipArchive();

	if ( true !== $zip->open( $zip_path ) ) {
		throw new RuntimeException( 'Failed to open artifact zip: ' . $zip_path );
	}

	$expected = array_map(
		static function ( string $relative_path ): string {
			return PluginArtifactContract::ARTIFACT_SLUG . '/' . $relative_path;
		},
		$stage_files
	);

	$actual = array();

	for ( $index = 0; $index < $zip->numFiles; $index++ ) {
		$actual[] = $zip->getNameIndex( $index );
	}

	sort( $expected );
	sort( $actual );

	$zip->close();

	if ( $expected !== $actual ) {
		throw new RuntimeException( 'Artifact zip contents do not match the staged artifact tree.' );
	}
}
