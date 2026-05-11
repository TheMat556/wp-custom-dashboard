<?php
/**
 * Full-site lockdown screen for locked licenses.
 *
 * Renders a clean, self-contained HTML lock screen (no WordPress chrome)
 * when the cached license state indicates the license is locked.
 *
 * Runs at init:0 — before WordPress query, before any output.
 * Excludes REST, AJAX, cron, CLI, and installer requests.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License;

defined( 'ABSPATH' ) || exit;

final class LockScreenHandler {

	/**
	 * Check cached license state and render lock screen if locked.
	 *
	 * INTENTIONAL FAIL-OPEN: If the cache backend returns empty/garbage,
	 * status is not 'locked' and the site loads normally. This prevents
	 * a cache failure from falsely locking a paying customer's site.
	 * For intended locks, the webhook ensures near-instant delivery,
	 * and the heartbeat catches it within 24h at worst.
	 *
	 * DONOTCACHEPAGE is defined unconditionally (including non-locked
	 * requests) so that caching plugins never serve a cached "not locked"
	 * page after a lock event occurs between cache generation and delivery.
	 */
	public static function check_and_lock(): void {
		// Respect caching plugins — never cache while checking lock state.
		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true );
		}

		if ( self::is_system_request() ) {
			return;
		}

		$payload = self::get_cached_payload();
		if ( ( $payload['status'] ?? '' ) !== LicenseCache::STATUS_LOCKED ) {
			return;
		}

		self::render_lock_screen();
		exit;
	}

	/**
	 * Returns true for requests that should bypass the lock screen.
	 */
	private static function is_system_request(): bool {
		return defined( 'REST_REQUEST' ) || defined( 'DOING_AJAX' ) ||
			defined( 'DOING_CRON' ) || defined( 'WP_CLI' ) ||
			( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST ) ||
			( defined( 'WP_INSTALLING' ) && WP_INSTALLING );
	}

	/**
	 * Read the cached license payload (transient + option fallback).
	 *
	 * @return array<string, mixed>
	 */
	private static function get_cached_payload(): array {
		$cache = get_transient( LicenseCache::TRANSIENT_KEY );
		if ( is_array( $cache ) ) {
			return $cache;
		}
		$fallback = get_option( LicenseCache::BACKUP_OPTION_KEY, array() );
		return is_array( $fallback ) ? $fallback : array();
	}

	/**
	 * Render a full-screen HTML lock page with 503 status.
	 *
	 * Only reads 'status' from the payload — no dependency on tier/role/
	 * features, so this is safe even with a sparse payload from a
	 * cache-miss transition_to_locked() call.
	 *
	 * get_bloginfo() is safe at init:0 — WordPress has loaded the
	 * options table and locale by this point (wp_load_alloptions()
	 * runs during wp_start()).
	 */
	private static function render_lock_screen(): void {
		// Clear all WordPress output buffers before sending headers.
		while ( ob_get_level() ) {
			ob_end_clean();
		}

		status_header( 503 );
		header( 'Retry-After: 3600' );
		nocache_headers();

		// Prevent crawlers from indexing the lock screen.
		header( 'X-Robots-Tag: noindex, nofollow', true );

		$site_name = get_bloginfo( 'name' );
		?>
<!DOCTYPE html>
<html lang="<?php echo esc_attr( get_bloginfo( 'language' ) ); ?>">
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title><?php echo esc_html__( 'Temporarily Unavailable', 'wp-react-ui' ); ?></title>
<style>
	* { margin: 0; padding: 0; box-sizing: border-box; }
	body {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
					 Oxygen, Ubuntu, Cantarell, sans-serif;
		background: #f3f4f6;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		color: #374151;
		padding: 20px;
	}
	.lock-container {
		text-align: center;
		padding: 48px 40px;
		max-width: 480px;
		width: 100%;
		background: #ffffff;
		border-radius: 12px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
	}
	.lock-icon {
		width: 72px;
		height: 72px;
		margin: 0 auto 24px;
		border-radius: 50%;
		background: #fee2e2;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.lock-icon svg {
		width: 36px;
		height: 36px;
		stroke: #dc2626;
		fill: none;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	h1 {
		font-size: 22px;
		font-weight: 600;
		margin-bottom: 12px;
		color: #111827;
	}
	p {
		font-size: 15px;
		line-height: 1.6;
		color: #6b7280;
		margin-bottom: 4px;
	}
	.site-name {
		margin-top: 24px;
		padding-top: 20px;
		border-top: 1px solid #e5e7eb;
		font-size: 13px;
		color: #9ca3af;
	}
</style>
</head>
<body>
<div class="lock-container">
	<div class="lock-icon">
		<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
			<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
		</svg>
	</div>
	<h1><?php esc_html_e( 'Temporarily Unavailable', 'wp-react-ui' ); ?></h1>
	<p><?php esc_html_e( 'This website is temporarily unavailable.', 'wp-react-ui' ); ?></p>
	<p><?php esc_html_e( 'Please contact the site owner to restore access.', 'wp-react-ui' ); ?></p>
	<?php if ( ! empty( $site_name ) ) : ?>
		<div class="site-name"><?php echo esc_html( $site_name ); ?></div>
	<?php endif; ?>
</div>
</body>
</html>
		<?php
	}
}
