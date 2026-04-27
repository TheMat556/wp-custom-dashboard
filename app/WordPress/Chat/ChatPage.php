<?php
/**
 * WordPress admin integration for the shell-managed chat page.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\WordPress\Chat;

defined( 'ABSPATH' ) || exit;

final class ChatPage {
	private const PAGE_SLUG = 'wp-react-ui-chat';

	/**
	 * Registers hooks for the shell chat page.
	 */
	public static function init(): void {
		add_action( 'admin_menu', array( self::class, 'register_page' ) );
	}

	/**
	 * Returns the admin page slug used for the shell-managed chat page.
	 */
	public static function get_page_slug(): string {
		return self::PAGE_SLUG;
	}

	/**
	 * Registers the chat page inside wp-admin.
	 */
	public static function register_page(): void {
		add_dashboard_page(
			'WP React UI Chat',
			'Support Chat',
			'read',
			self::PAGE_SLUG,
			array( self::class, 'render_page' )
		);
	}

	/**
	 * Renders a lightweight fallback page for environments without the shell.
	 */
	public static function render_page(): void {
		if ( ! current_user_can( 'read' ) ) {
			wp_die(
				esc_html__( 'You do not have sufficient permissions to access this page.' ),
				403
			);
		}

		$license = ( new \WpReactUi\License\LicenseManager() )->get_status_payload();
		?>
		<div class="wrap">
			<h1><?php echo esc_html__( 'Support Chat' ); ?></h1>
			<p><?php echo esc_html__( 'This page is managed by the React shell when shell assets are available.' ); ?></p>
			<p>
				<strong><?php echo esc_html__( 'License status:' ); ?></strong>
				<?php echo esc_html( ucfirst( $license['status'] ) ); ?>
			</p>
			<?php if ( ! empty( $license['role'] ) ) : ?>
				<p>
					<strong><?php echo esc_html__( 'License role:' ); ?></strong>
					<?php echo esc_html( ucfirst( (string) $license['role'] ) ); ?>
				</p>
			<?php endif; ?>
		</div>
		<?php
	}
}
