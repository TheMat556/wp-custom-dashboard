<?php
/**
 * Asset loader for WP React UI.
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Handles Vite manifest parsing, asset enqueueing, and menu data caching.
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

	/**
	 * Transient key prefix for per-user menu data.
	 *
	 * @var string
	 */
	private const CACHE_MENU = 'wp_react_ui_menu';

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

		if ( ! empty( $entry['css'] ) ) {
			foreach ( $entry['css'] as $css_file ) {
				$css_urls[] = self::$dist_url . $css_file;
			}
		}

		foreach ( $manifest as $chunk ) {
			if ( empty( $chunk['file'] ) || ! str_ends_with( $chunk['file'], '.js' ) ) {
				continue;
			}

			$js_urls[] = self::$dist_url . $chunk['file'];
		}

		return array(
			'css' => $css_urls,
			'js'  => $js_urls,
		);
	}

	// ─── Cache clearing ───────────────────────────────────────────────────────

	/**
	 * Deletes all per-user menu transients from the database.
	 *
	 * @return void
	 */
	public static function clear_menu_cache(): void {
		global $wpdb;

		$prefix = self::CACHE_MENU;

		// Direct query required — no WordPress API supports wildcard transient deletion.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options}
				 WHERE option_name LIKE %s
				 OR    option_name LIKE %s",
				'_transient_' . $prefix . '_%',
				'_transient_timeout_' . $prefix . '_%'
			)
		);
	}

	/**
	 * Clears all plugin transient caches.
	 *
	 * @return void
	 */
	public static function clear_cache(): void {
		delete_transient( self::CACHE_MANIFEST );
		delete_transient( self::CACHE_DEV );
		self::clear_menu_cache();
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

	// ─── Comments enabled check ───────────────────────────────────────────────

	/**
	 * Returns true if any public post type supports comments.
	 *
	 * @return bool
	 */
	private static function are_comments_enabled(): bool {
		$post_types = get_post_types( array( 'public' => true ) );

		foreach ( $post_types as $pt ) {
			if ( post_type_supports( $pt, 'comments' ) ) {
				return true;
			}
		}

		return false;
	}

	// ─── Menu data ────────────────────────────────────────────────────────────

	/**
	 * Returns the admin menu items for the current user, from cache or live.
	 *
	 * @return array
	 */
	public static function get_menu_data(): array {
		$user_id   = get_current_user_id();
		$cache_key = self::CACHE_MENU . '_' . $user_id;
		$cached    = get_transient( $cache_key );

		if ( false !== $cached ) {
			return $cached;
		}

		global $menu, $submenu;
		$items = array();

		$comments_enabled = self::are_comments_enabled();

		foreach ( (array) $menu as $item ) {
			if ( empty( $item[0] ) ) {
				continue;
			}

			if ( ! $comments_enabled && isset( $item[2] ) && 'edit-comments.php' === $item[2] ) {
				continue;
			}

			['label' => $label, 'count' => $count] = self::parse_menu_label( $item[0] );
			if ( empty( $label ) ) {
				continue;
			}

			$slug     = $item[2];
			$children = array();

			if ( ! empty( $submenu[ $slug ] ) ) {
				foreach ( $submenu[ $slug ] as $sub ) {
					if ( empty( $sub[0] ) ) {
						continue;
					}

					['label' => $sub_label, 'count' => $sub_count] = self::parse_menu_label( $sub[0] );
					if ( empty( $sub_label ) ) {
						continue;
					}

					$children[] = array(
						'label' => $sub_label,
						'count' => $sub_count,
						'slug'  => $sub[2],
						'cap'   => $sub[1],
					);
				}
			}

			$items[] = array(
				'label'    => $label,
				'count'    => $count,
				'slug'     => $slug,
				'icon'     => $item[6] ?? '',
				'cap'      => $item[1],
				'children' => $children,
			);
		}

		set_transient( $cache_key, $items, HOUR_IN_SECONDS );
		return $items;
	}

	/**
	 * Parses a raw WordPress menu label into a clean label and optional count.
	 *
	 * @param string $raw Raw menu label string possibly containing HTML span counts.
	 * @return array{ label: string, count: int|null }
	 */
	private static function parse_menu_label( string $raw ): array {
		$count = null;

		if ( preg_match( '/<span[^>]*>\s*(\d+)\s*<\/span>/i', $raw, $matches ) ) {
			$parsed = (int) $matches[1];
			if ( $parsed > 0 ) {
				$count = $parsed;
			}
		}

		$cleaned = preg_replace( '/<span[^>]*>.*?<\/span>/is', '', $raw );
		$cleaned = wp_strip_all_tags( $cleaned );
		$cleaned = trim( preg_replace( '/\s+/', ' ', $cleaned ) );

		return array(
			'label' => $cleaned,
			'count' => $count,
		);
	}
}
