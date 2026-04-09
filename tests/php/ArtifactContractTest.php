<?php
/**
 * Contract tests for the packaged plugin runtime files and build outputs.
 */

use WpReactUi\Contracts\PluginArtifactContract;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/contracts/php/PluginArtifactContract.php';
require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class ArtifactContractTest extends TestCase {

	private string $project_root;

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
		$this->project_root = dirname( __DIR__, 2 );
	}

	public function test_source_tree_contains_required_runtime_files(): void {
		foreach ( PluginArtifactContract::REQUIRED_RUNTIME_FILES as $relative_path ) {
			$this->assertFileExists(
				$this->project_root . '/' . $relative_path,
				'Missing required runtime file: ' . $relative_path
			);
		}
	}

	public function test_build_manifest_contains_required_entries_and_assets(): void {
		$manifest_path = $this->project_root . '/dist/.vite/manifest.json';
		$this->assertFileExists( $manifest_path );

		$contents = file_get_contents( $manifest_path );
		$this->assertNotFalse( $contents );

		$manifest = json_decode( $contents, true );
		$this->assertIsArray( $manifest );

		foreach ( PluginArtifactContract::REQUIRED_MANIFEST_ENTRIES as $entry_key ) {
			$this->assertArrayHasKey( $entry_key, $manifest );
			$this->assertArrayHasKey( 'file', $manifest[ $entry_key ] );
			$this->assertFileExists( $this->project_root . '/dist/' . $manifest[ $entry_key ]['file'] );
		}
	}

	public function test_asset_loader_resolves_required_entry_urls_and_preloads(): void {
		WP_React_UI_Asset_Loader::clear_cache();

		foreach ( PluginArtifactContract::REQUIRED_MANIFEST_ENTRIES as $entry_key ) {
			$url = WP_React_UI_Asset_Loader::get_entry_asset_url( $entry_key );

			$this->assertIsString( $url, 'Failed to resolve asset URL for manifest entry: ' . $entry_key );
			$this->assertStringContainsString( '/dist/', $url );
		}

		$preload_assets = WP_React_UI_Asset_Loader::get_preload_assets();

		$this->assertNotEmpty( $preload_assets['js'] );
		$this->assertNotEmpty( $preload_assets['css'] );
	}
}
