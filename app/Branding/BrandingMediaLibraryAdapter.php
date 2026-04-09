<?php
/**
 * Branding media adapter for WP React UI.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Branding;

defined( 'ABSPATH' ) || exit;

/**
 * Encapsulates WordPress attachment access for branding assets.
 */
final class BrandingMediaLibraryAdapter {

	/**
	 * Returns whether the given attachment ID points to an image attachment.
	 *
	 * @param int $attachment_id Attachment post ID.
	 * @return bool
	 */
	public function is_image_attachment( int $attachment_id ): bool {
		if ( 0 === $attachment_id ) {
			return false;
		}

		$attachment = get_post( $attachment_id );

		if ( ! $attachment || 'attachment' !== $attachment->post_type ) {
			return false;
		}

		return wp_attachment_is_image( $attachment_id );
	}

	/**
	 * Returns the full URL for an attachment.
	 *
	 * @param int $attachment_id Attachment post ID.
	 * @return string|null
	 */
	public function get_attachment_url( int $attachment_id ): ?string {
		if ( 0 === $attachment_id ) {
			return null;
		}

		$image_url = wp_get_attachment_image_url( $attachment_id, 'full' );

		if ( ! $image_url ) {
			return null;
		}

		return $image_url;
	}

	/**
	 * Returns the bundled fallback logo URL.
	 *
	 * @return string
	 */
	public function get_default_logo_url(): string {
		return plugins_url( 'dist/logo.svg', dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php' );
	}
}
