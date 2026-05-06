<?php
/**
 * Admin notice when the permalink / REST API setup prevents plugin features.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\WordPress\Admin;

use WpReactUi\Bootstrap\ActivationHandler;

defined( 'ABSPATH' ) || exit;

/**
 * Renders an admin notice if the WordPress REST API is not accessible
 * because the permalink structure is still set to "Plain".
 *
 * The plugin's React frontend depends on REST API calls. When the permalink
 * structure is empty, Apache does not rewrite /wp-json/ URLs to index.php,
 * which causes all REST API requests to return 404.
 */
final class RestApiNotice {

	/**
	 * Hooks the admin notice renderer.
	 *
	 * @return void
	 */
	public static function init(): void {
		add_action( 'admin_notices', array( self::class, 'render' ) );
	}

	/**
	 * Renders an admin notice when the permalink structure does not support
	 * pretty REST API URLs.
	 *
	 * @return void
	 */
	public static function render(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		// Only show on wp-admin pages (not in the iframe shell).
		if ( wp_react_ui_is_embed_mode() ) {
			return;
		}

		// Only show on plugin-relevant admin pages.
		if ( ! self::is_plugin_admin_page() ) {
			return;
		}

		if ( ActivationHandler::is_rest_api_accessible() ) {
			return;
		}

		$permalinks_url = admin_url( 'options-permalink.php' );
		?>
		<div class="notice notice-warning is-dismissible">
			<p>
				<strong>WP React UI:</strong>
				<?php
				echo esc_html__(
					'The permalink structure is set to "Plain". The plugin REST API is not accessible with this setting.',
					'wp-custom-dashboard'
				);
				?>
				<a href="<?php echo esc_url( $permalinks_url ); ?>">
					<?php echo esc_html__( 'Go to Permalink Settings', 'wp-custom-dashboard' ); ?>
				</a>
				<?php echo esc_html__( 'and choose any option other than "Plain", then save.', 'wp-custom-dashboard' ); ?>
			</p>
		</div>
		<?php
	}

	/**
	 * Returns whether the current admin page is relevant to the plugin.
	 *
	 * @return bool
	 */
	private static function is_plugin_admin_page(): bool {
		global $pagenow;

		$plugin_pages = array(
			'admin.php',
			'options-permalink.php',
		);

		if ( in_array( $pagenow, $plugin_pages, true ) ) {
			// phpcs:disable WordPress.Security.NonceVerification.Recommended
			$page = isset( $_GET['page'] ) ? sanitize_text_field( wp_unslash( $_GET['page'] ) ) : '';
			// phpcs:enable

			// Show notice on the Permalinks settings page itself, and on
			// any plugin-top-level admin page (but not on unrelated pages).
			if ( 'options-permalink.php' === $pagenow || '' === $page || 0 === strpos( $page, 'wp-react-ui' ) ) {
				return true;
			}
		}

		return false;
	}
}
