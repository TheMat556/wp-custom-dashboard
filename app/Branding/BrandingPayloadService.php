<?php
/**
 * Branding payload service for WP React UI.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Branding;

defined( 'ABSPATH' ) || exit;

/**
 * Builds branding payloads for frontend bootstrap and REST transport.
 */
final class BrandingPayloadService {
	public function __construct(
		private BrandingSettingsRepository $repository,
		private BrandingMediaLibraryAdapter $media_library,
		private BrandingSanitizer $sanitizer
	) {}

	/**
	 * Returns frontend branding bootstrap data.
	 *
	 * @return array
	 */
	public function get_frontend_branding(): array {
		$site_name = (string) get_bloginfo( 'name' );
		$light_url = $this->media_library->get_attachment_url( $this->repository->get_logo_id( 'light_logo_id' ) );
		$dark_url  = $this->media_library->get_attachment_url( $this->repository->get_logo_id( 'dark_logo_id' ) );
		$long_url  = $this->media_library->get_attachment_url( $this->repository->get_logo_id( 'long_logo_id' ) );

		return array(
			'siteName' => $site_name,
			'logos'    => array(
				'lightUrl'   => null === $light_url ? null : $light_url,
				'darkUrl'    => null === $dark_url ? null : $dark_url,
				'longUrl'    => $long_url,
				'defaultUrl' => $this->media_library->get_default_logo_url(),
			),
			'useLongLogo'  => $this->repository->get_use_long_logo(),
			'primaryColor' => $this->get_primary_color(),
			'fontPreset'   => $this->get_font_preset(),
		);
	}

	/**
	 * Returns navigation-related branding preferences.
	 *
	 * @return array{openInNewTabPatterns: string[]}
	 */
	public function get_navigation_preferences(): array {
		return array(
			'openInNewTabPatterns' => $this->repository->get_open_in_new_tab_patterns(),
		);
	}

	/**
	 * Returns the REST-ready branding payload.
	 *
	 * @return array
	 */
	public function get_rest_data(): array {
		$light_id = $this->repository->get_logo_id( 'light_logo_id' );
		$dark_id  = $this->repository->get_logo_id( 'dark_logo_id' );
		$long_id  = $this->repository->get_logo_id( 'long_logo_id' );

		return array(
			'lightLogoId'          => $light_id,
			'lightLogoUrl'         => $this->media_library->get_attachment_url( $light_id ),
			'darkLogoId'           => $dark_id,
			'darkLogoUrl'          => $this->media_library->get_attachment_url( $dark_id ),
			'longLogoId'           => $long_id,
			'longLogoUrl'          => $this->media_library->get_attachment_url( $long_id ),
			'useLongLogo'          => $this->repository->get_use_long_logo(),
			'primaryColor'         => $this->get_primary_color(),
			'fontPreset'           => $this->get_font_preset(),
			'openInNewTabPatterns' => $this->repository->get_open_in_new_tab_patterns(),
		);
	}

	/**
	 * Returns the sanitized stored primary color.
	 *
	 * @return string
	 */
	private function get_primary_color(): string {
		$settings = $this->repository->get_settings();

		return $this->sanitizer->sanitize_primary_color(
			$settings['primary_color'] ?? BrandingSettingsRepository::DEFAULT_PRIMARY_COLOR
		);
	}

	/**
	 * Returns the sanitized stored font preset.
	 *
	 * @return string
	 */
	private function get_font_preset(): string {
		$settings = $this->repository->get_settings();

		return $this->sanitizer->sanitize_font_preset(
			$settings['font_preset'] ?? BrandingSettingsRepository::DEFAULT_FONT_PRESET
		);
	}
}
