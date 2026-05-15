<?php
/**
 * Full-site lockdown screen for locked licenses.
 *
 * Renders a clean, self-contained HTML lock screen (no WordPress chrome)
 * when the cached license state indicates the license is locked.
 *
 * Runs at init:0 — before WordPress query, before any output.
 *
 * REST, AJAX, and XML-RPC requests are NOT bypassed — instead they receive
 * a JSON error response or die with a 503, ensuring the kill switch actually
 * kills all surface areas.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License;

use WP_Error;

defined( 'ABSPATH' ) || exit;

final class LockScreenHandler {

	private const RECHECK_NONCE_ACTION = 'wp_react_ui_recheck';

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

		$payload = self::get_cached_payload();
		if ( ( $payload['status'] ?? '' ) !== LicenseCache::STATUS_LOCKED ) {
			return;
		}

		// Owner licenses are NEVER lockable — skip the lock screen even if
		// the cache says locked (defense-in-depth, second layer).
		if ( isset( $payload['role'] ) && 'owner' === $payload['role'] ) {
			return;
		}

		// Block REST, AJAX, XML-RPC, cron, CLI, and installer — but return
		// an error instead of silently passing through.
		if ( self::is_system_request() ) {
			self::block_system_request();
			return;
		}

		// Admin recheck: force re-validate against the license server.
		// If the license has been unlocked the cache is updated and the
		// lock screen is skipped via a redirect.
		if ( self::handle_admin_recheck() ) {
			return;
		}

		self::render_lock_screen();
		exit;
	}

	/**
	 * Handles a manual recheck request from the lock screen page.
	 *
	 * When ?wp_react_ui_recheck=1 is present with a valid nonce and the
	 * current user can manage_options, forces a remote validate.
	 * If the license is now active (unlocked), redirects to the same URL
	 * without the recheck param so WordPress loads normally.
	 *
	 * @return bool True if the request was handled (recheck processed).
	 */
	private static function handle_admin_recheck(): bool {
		if ( empty( $_GET['wp_react_ui_recheck'] ) || ! current_user_can( 'manage_options' ) ) {
			return false;
		}

		// CSRF protection: validate nonce before performing remote call.
		if ( empty( $_GET['_wpnonce'] ) || ! wp_verify_nonce(
			sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ) ),
			self::RECHECK_NONCE_ACTION . '_' . get_current_user_id()
		) ) {
			return false;
		}

		$container = LicenseServiceContainer::get_instance();
		$manager   = $container->get_manager();

		$result = $manager->validate();

		if ( $result instanceof WP_Error ) {
			// validate failed — still locked, stay on lock screen.
			return false;
		}

		$status = sanitize_key( (string) ( $result['status'] ?? '' ) );

		if ( LicenseCache::STATUS_ACTIVE === $status || 'valid' === $status ) {
			// License is unlocked — remove the recheck param and reload.
			$redirect_to = remove_query_arg( 'wp_react_ui_recheck' );
			wp_safe_redirect( $redirect_to );
			exit;
		}

		// Still locked or another non-active state — fall through.
		return false;
	}

	/**
	 * Returns true for REST API requests by checking standard WordPress
	 * constants, the request URI, and the rest_route query parameter.
	 */
	private static function is_rest_request(): bool {
		if ( defined( 'REST_REQUEST' ) ) {
			return true;
		}
		if ( isset( $_GET['rest_route'] ) ) {
			return true;
		}
		if ( isset( $_SERVER['REQUEST_URI'] ) ) {
			// Match /wp-json/ only in the URL path, not in query parameters.
			$request_path = wp_parse_url( sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ), PHP_URL_PATH );
			if ( is_string( $request_path ) && strpos( $request_path, '/wp-json/' ) !== false ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Returns true for requests that should not render the HTML lock screen
	 * but should still be blocked.
	 */
	private static function is_system_request(): bool {
		return self::is_rest_request() || defined( 'DOING_AJAX' ) ||
			defined( 'DOING_CRON' ) || defined( 'WP_CLI' ) ||
			( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST ) ||
			( defined( 'WP_INSTALLING' ) && WP_INSTALLING );
	}

	/**
	 * Block a system request (REST, AJAX, XML-RPC) when the site is locked.
	 *
	 * Returns a JSON error for REST/AJAX and dies with a 503 for XML-RPC.
	 */
	private static function block_system_request(): void {
		if ( self::is_rest_request() ) {
			// Hook into REST dispatch to return a locked error.
			add_filter(
				'rest_pre_dispatch',
				static function ( $result, $server, $request ) {
					return new WP_Error(
						'license_locked',
						__( 'This site is temporarily unavailable.', 'wp-react-ui' ),
						array( 'status' => 503 )
					);
				},
				0,
				3
			);
			return;
		}

		if ( defined( 'DOING_AJAX' ) && DOING_AJAX ) {
			status_header( 503 );
			wp_die(
				wp_json_encode( array(
					'code'    => 'license_locked',
					'message' => __( 'This site is temporarily unavailable.', 'wp-react-ui' ),
				) ),
				'',
				array( 'response' => 503 )
			);
			exit;
		}

		if ( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST ) {
			status_header( 503 );
			header( 'Content-Type: text/xml; charset=UTF-8' );
			echo '<?xml version="1.0"?><methodResponse><fault><value><struct>'
				. '<member><name>faultCode</name><value><int>503</int></value></member>'
				. '<member><name>faultString</name><value><string>'
				. esc_html__( 'This site is temporarily unavailable.', 'wp-react-ui' )
				. '</string></value></member>'
				. '</struct></value></fault></methodResponse>';
			exit;
		}
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
	 */
	private static function render_lock_screen(): void {
		// Check if headers were already sent before flushing buffers.
		if ( ! headers_sent() ) {
			while ( ob_get_level() ) {
				ob_end_clean();
			}

			$csp_nonce = bin2hex( random_bytes( 16 ) );

			status_header( 503 );
			header( 'Retry-After: 3600' );
			nocache_headers();
			header( 'X-Robots-Tag: noindex, nofollow', true );
			header( "Content-Security-Policy: default-src 'none'; script-src 'nonce-{$csp_nonce}'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none';" );
		} else {
			$csp_nonce = '';
		}

		$site_name      = get_bloginfo( 'name' );
		$rest_url       = rest_url( 'wp-react-ui/v1/license' );
		$rest_nonce     = wp_create_nonce( 'wp_rest' );
		$is_admin       = is_admin();
		$recheck_url    = '';
		if ( $is_admin ) {
			$recheck_url = add_query_arg(
				array(
					'wp_react_ui_recheck' => '1',
					'_wpnonce'            => wp_create_nonce( self::RECHECK_NONCE_ACTION . '_' . get_current_user_id() ),
				),
				remove_query_arg( 'wp_react_ui_recheck' )
			);
		}
		?>
	<!DOCTYPE html>
	<html lang="<?php echo esc_attr( get_bloginfo( 'language' ) ); ?>">
	<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="robots" content="noindex, nofollow">
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
		.recheck-btn {
			display: inline-block;
			margin-top: 24px;
			padding: 10px 24px;
			font-size: 14px;
			font-weight: 500;
			color: #374151;
			background: #f9fafb;
			border: 1px solid #d1d5db;
			border-radius: 8px;
			cursor: pointer;
			transition: background 0.15s, border-color 0.15s;
		}
		.recheck-btn:hover {
			background: #f3f4f6;
			border-color: #9ca3af;
		}
		.recheck-btn:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
		.recheck-status {
			margin-top: 12px;
			font-size: 13px;
			color: #9ca3af;
			min-height: 20px;
		}
		.recheck-status.error {
			color: #dc2626;
		}
		.recheck-status.success {
			color: #16a34a;
		}
		.recheck-note {
			margin-top: 16px;
			font-size: 12px;
			color: #9ca3af;
			line-height: 1.5;
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

		<?php if ( $is_admin ) : ?>
		<button class="recheck-btn" id="wp-react-ui-recheck" type="button" data-recheck-url="<?php echo esc_url( $recheck_url ); ?>">
			<?php esc_html_e( 'Check Now', 'wp-react-ui' ); ?>
		</button>
		<div class="recheck-status" id="wp-react-ui-recheck-status"></div>
		<div class="recheck-note">
			<?php esc_html_e( 'After unlocking the license on the server, click "Check Now" to restore access immediately.', 'wp-react-ui' ); ?>
		</div>

			<script nonce="<?php echo esc_attr( $csp_nonce ); ?>">
			(function() {
				var btn = document.getElementById('wp-react-ui-recheck');

				btn.addEventListener('click', function() {
					var url = btn.getAttribute('data-recheck-url');
					if (url) {
						location.assign(url);
					}
				});
			})();
			</script>
	<?php endif; ?>

		<?php if ( ! empty( $site_name ) ) : ?>
		<div class="site-name"><?php echo esc_html( $site_name ); ?></div>
	<?php endif; ?>
	</div>
	</body>
	</html>
		<?php
	}
}
