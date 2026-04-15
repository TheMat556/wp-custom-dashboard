<?php
/**
 * WordPress admin integration for license settings and heartbeat scheduling.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\WordPress\License;

use WpReactUi\License\LicenseHeartbeat;
use WpReactUi\License\LicenseManager;

defined( 'ABSPATH' ) || exit;

final class LicenseSettings {
	private const PAGE_SLUG = 'wp-react-ui-license';

	/**
	 * Registers hooks for the license settings page and heartbeat scheduler.
	 */
	public static function init(): void {
		add_action( 'admin_menu', array( self::class, 'register_page' ) );
		add_action( 'init', array( self::class, 'ensure_heartbeat' ) );
		add_action( LicenseHeartbeat::CRON_HOOK, array( self::class, 'run_heartbeat' ) );
	}

	/**
	 * Returns the admin page slug used for the shell-managed license page.
	 */
	public static function get_page_slug(): string {
		return self::PAGE_SLUG;
	}

	/**
	 * Registers the license settings page under Settings.
	 */
	public static function register_page(): void {
		add_options_page(
			'WP React UI License',
			'WP React UI License',
			'manage_options',
			self::PAGE_SLUG,
			array( self::class, 'render_page' )
		);
	}

	/**
	 * Renders a lightweight fallback page for environments without the shell.
	 */
	public static function render_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die(
				esc_html__( 'You do not have sufficient permissions to access this page.' ),
				403
			);
		}

		$status = ( new LicenseManager() )->get_status_payload();
		?>
		<div class="wrap">
			<h1><?php echo esc_html__( 'WP React UI License' ); ?></h1>
			<p><?php echo esc_html__( 'This page is managed by the React shell when shell assets are available.' ); ?></p>
			<p>
				<strong><?php echo esc_html__( 'Current status:' ); ?></strong>
				<?php echo esc_html( ucfirst( $status['status'] ) ); ?>
			</p>
			<?php if ( ! empty( $status['keyPrefix'] ) ) : ?>
				<p>
					<strong><?php echo esc_html__( 'Stored key:' ); ?></strong>
					<code><?php echo esc_html( $status['keyPrefix'] ); ?>…</code>
				</p>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Ensures the daily heartbeat is scheduled.
	 */
	public static function ensure_heartbeat(): void {
		( new LicenseHeartbeat() )->ensure_scheduled();
	}

	/**
	 * Runs the daily heartbeat callback.
	 */
	public static function run_heartbeat(): void {
		( new LicenseHeartbeat() )->run();
	}
}
