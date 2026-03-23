<?php
/**
 * Asset loader for WP React UI.
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Handles Vite manifest parsing and asset enqueueing.
 */
class WP_React_UI_Asset_Loader {

	/**
	 * Vite dev server URL.
	 *
	 * @var string
	 */
	private static string $dev_url = 'http://localhost:5173';

	/**
	 * Absolute path to the dist directory.
	 *
	 * @var string
	 */
	private static string $dist_dir = '';

	/**
	 * Public URL to the dist directory.
	 *
	 * @var string
	 */
	private static string $dist_url = '';

	/**
	 * Transient key for the Vite manifest.
	 *
	 * @var string
	 */
	private const CACHE_MANIFEST = 'wp_react_ui_manifest';

	/**
	 * Transient key for the dev mode flag.
	 *
	 * @var string
	 */
	private const CACHE_DEV = 'wp_react_ui_is_dev';

	// ─── Init ─────────────────────────────────────────────────────────────────

	/**
	 * Initialises dist directory paths relative to the plugin root.
	 *
	 * @return void
	 */
	public static function init(): void {
		self::$dist_dir = plugin_dir_path( __DIR__ ) . 'dist/';
		self::$dist_url = plugin_dir_url( __DIR__ ) . 'dist/';
	}

	// ─── Dev mode detection ───────────────────────────────────────────────────

	/**
	 * Returns true when the Vite dev server is reachable and WP_DEBUG is on.
	 *
	 * @return bool
	 */
	public static function is_dev(): bool {
		if ( ! defined( 'WP_DEBUG' ) || ! WP_DEBUG ) {
			return false;
		}

		$cached = get_transient( self::CACHE_DEV );
		if ( false !== $cached ) {
			return (bool) $cached;
		}

		$response = wp_remote_get(
			self::$dev_url . '/@vite/client',
			array( 'timeout' => 1 )
		);
		$is_dev   = ! is_wp_error( $response );

		set_transient( self::CACHE_DEV, $is_dev ? '1' : '0', 10 );
		return $is_dev;
	}

	// ─── Manifest ─────────────────────────────────────────────────────────────

	/**
	 * Returns the parsed Vite manifest array, or null if unavailable.
	 *
	 * @return array|null
	 */
	private static function get_manifest(): ?array {
		$cached = get_transient( self::CACHE_MANIFEST );
		if ( false !== $cached ) {
			return $cached;
		}

		$manifest_path = self::$dist_dir . '.vite/manifest.json';
		if ( ! file_exists( $manifest_path ) ) {
			return null;
		}

		// Reading a local plugin file — wp_remote_get() is for remote URLs only.
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$manifest = json_decode( file_get_contents( $manifest_path ), true );
		if ( ! $manifest ) {
			return null;
		}

		set_transient( self::CACHE_MANIFEST, $manifest, DAY_IN_SECONDS );
		return $manifest;
	}

	/**
	 * Returns the public URL for a build entry, in either dev or production mode.
	 *
	 * @param string $entry_src Source entry path as used by Vite manifest keys.
	 * @return string|null
	 */
	public static function get_entry_asset_url( string $entry_src ): ?string {
		self::init();

		if ( self::is_dev() ) {
			return self::$dev_url . '/' . ltrim( $entry_src, '/' );
		}

		$manifest = self::get_manifest();
		if ( ! $manifest ) {
			return null;
		}

		$entry = $manifest[ $entry_src ] ?? null;
		if ( empty( $entry['file'] ) ) {
			return null;
		}

		return self::$dist_url . $entry['file'];
	}

	/**
	 * Returns true when the shell entry asset can be resolved in either dev or prod mode.
	 *
	 * @return bool
	 */
	public static function can_boot_shell(): bool {
		return null !== self::get_entry_asset_url( 'src/main.tsx' );
	}

	/**
	 * Returns CSS and JS asset URLs to preload for the main entry point.
	 *
	 * @return array{ css: string[], js: string[] }
	 */
	public static function get_preload_assets(): array {
		self::init();

		$manifest = self::get_manifest();
		if ( ! $manifest ) {
			return array(
				'css' => array(),
				'js'  => array(),
			);
		}

		$entry    = $manifest['src/main.tsx'] ?? null;
		$css_urls = array();
		$js_urls  = array();

		if ( empty( $entry['file'] ) ) {
			return array(
				'css' => array(),
				'js'  => array(),
			);
		}

		if ( ! empty( $entry['css'] ) ) {
			foreach ( $entry['css'] as $css_file ) {
				$css_urls[] = self::$dist_url . $css_file;
			}
		}

		$js_urls[] = self::$dist_url . $entry['file'];

		foreach ( ( $entry['imports'] ?? array() ) as $import_key ) {
			$import = $manifest[ $import_key ] ?? null;
			if ( empty( $import['file'] ) || ! str_ends_with( $import['file'], '.js' ) ) {
				continue;
			}

			$js_urls[] = self::$dist_url . $import['file'];
		}

		return array(
			'css' => array_values( array_unique( $css_urls ) ),
			'js'  => array_values( array_unique( $js_urls ) ),
		);
	}

	// ─── Cache clearing ───────────────────────────────────────────────────────

	/**
	 * Clears all plugin transient caches.
	 *
	 * @return void
	 */
	public static function clear_cache(): void {
		delete_transient( self::CACHE_MANIFEST );
		delete_transient( self::CACHE_DEV );
		WP_React_UI_Menu_Cache::clear();
	}

	// ─── Enqueue ──────────────────────────────────────────────────────────────

	/**
	 * Enqueues assets for either dev or production mode.
	 *
	 * @return void
	 */
	public static function enqueue(): void {
		self::init();
		if ( self::is_dev() ) {
			self::enqueue_dev();
		} else {
			self::enqueue_prod();
		}
	}

	/**
	 * Enqueues scripts directly from the Vite dev server with HMR support.
	 *
	 * @return void
	 */
	private static function enqueue_dev(): void {
		// Version is null intentionally — dev server assets are never cached.
		// phpcs:ignore WordPress.WP.EnqueuedResourceParameters.NotEnqueuedStylesheet, WordPress.WP.EnqueuedResourceParameters.MissingVersion
		wp_enqueue_script(
			'vite-client',
			self::$dev_url . '/@vite/client',
			array(),
			null, // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
			false
		);
		wp_enqueue_script(
			'wp-react-ui',
			self::$dev_url . '/src/main.tsx',
			array( 'vite-client' ),
			null, // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
			false
		);
		add_filter(
			'script_loader_tag',
			function ( $tag, $handle ) {
				if ( in_array( $handle, array( 'vite-client', 'wp-react-ui' ), true ) ) {
					$tag = str_replace( '<script ', '<script type="module" ', $tag );
				}
				return $tag;
			},
			10,
			2
		);
	}

	/**
	 * Enqueues content-hashed production assets from the Vite manifest.
	 *
	 * @return void
	 */
	private static function enqueue_prod(): void {
		$manifest = self::get_manifest();
		if ( ! $manifest ) {
			return;
		}

		$entry = $manifest['src/main.tsx'] ?? null;
		if ( ! $entry ) {
			return;
		}

		// Version is null — filename already contains a content hash.
		wp_enqueue_script(
			'wp-react-ui',
			self::$dist_url . $entry['file'],
			array(),
			null, // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
			false
		);

		// Enqueue entry CSS globally (no shadow DOM).
		$css_index = 0;
		foreach ( ( $entry['css'] ?? array() ) as $css_file ) {
			wp_enqueue_style(
				'wp-react-ui-css-' . $css_index,
				self::$dist_url . $css_file,
				array(),
				null // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
			);
			++$css_index;
		}

		// outside.css contains WordPress content area tweaks.
		$outside_entry = $manifest['src/outside.css'] ?? null;
		if ( ! empty( $outside_entry['file'] ) ) {
			wp_enqueue_style(
				'wp-react-ui-outside',
				self::$dist_url . $outside_entry['file'],
				array(),
				null // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
			);
		}

		add_filter(
			'script_loader_tag',
			function ( $tag, $handle ) {
				if ( 'wp-react-ui' === $handle ) {
					$tag = str_replace(
						'<script ',
						'<script type="module" crossorigin ',
						$tag
					);
				}
				return $tag;
			},
			10,
			2
		);
	}
}
