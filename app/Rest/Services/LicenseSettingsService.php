<?php
/**
 * REST-facing license settings service.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Services;

use WpReactUi\License\LicenseManager;
use WpReactUi\License\LicenseSettingsRepository;

defined( 'ABSPATH' ) || exit;

final class LicenseSettingsService {
	private LicenseManager $manager;
	private LicenseSettingsRepository $settings_repository;

	public function __construct( ?LicenseManager $manager = null, ?LicenseSettingsRepository $settings_repository = null ) {
		$this->settings_repository = $settings_repository ?? new LicenseSettingsRepository();
		$this->manager             = $manager ?? new LicenseManager( null, null, $this->settings_repository );
	}

	/**
	 * Returns the current public license payload.
	 *
	 * When $force is true the local cache is bypassed and a live validate call
	 * is made to the license server so changes made in the license manager are
	 * reflected immediately.
	 *
	 * @param bool $force Skip cache and re-validate against the server.
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, hasKey: bool, keyPrefix: ?string, serverConfigured: bool}|\WP_Error
	 */
	public function get_license_payload( bool $force = false ) {
		if ( $force ) {
			$result = $this->manager->validate();
			// validate() returns WP_Error when there is no key or the server rejects it.
			// Fall back to the cached payload so the UI still shows something sensible.
			if ( is_wp_error( $result ) ) {
				return $this->manager->get_status_payload();
			}
			return $result;
		}

		return $this->manager->get_status_payload();
	}

	/**
	 * Activates a license key and returns the refreshed payload.
	 *
	 * @param string $license_key License key to activate.
	 * @return array|\WP_Error
	 */
	public function activate_license( string $license_key ) {
		return $this->manager->activate( $license_key );
	}

	/**
	 * Deactivates the current license and returns the refreshed payload.
	 *
	 * @return array|\WP_Error
	 */
	public function deactivate_license() {
		return $this->manager->deactivate();
	}

	/**
	 * Returns the editable license server settings payload for administrators.
	 *
	 * The license key is masked — only the first and last 4 characters are
	 * visible. The full key is NEVER returned in any REST response because it
	 * doubles as the HMAC signing secret.
	 *
	 * @return array{serverUrl: ?string, serverConfigured: bool, storedLicenseKey: ?string}
	 */
	public function get_license_server_settings_payload(): array {
		$server_url = $this->settings_repository->get_server_url();
		$full_key   = $this->settings_repository->get_license_key();
		$masked_key = self::mask_license_key( $full_key );

		return array(
			'serverUrl'        => '' !== $server_url ? $server_url : null,
			'serverConfigured' => $this->settings_repository->is_server_configured(),
			'storedLicenseKey' => '' !== $masked_key ? $masked_key : null,
		);
	}

	/**
	 * Masks a license key for safe display, showing only the first and last 4 characters.
	 *
	 * @param string $key Full license key.
	 * @return string Masked key (e.g. "abcd****wxyz") or empty string.
	 */
	public static function mask_license_key( string $key ): string {
		if ( '' === $key ) {
			return '';
		}

		$len = strlen( $key );

		if ( $len <= 8 ) {
			return str_repeat( '*', $len );
		}

		return substr( $key, 0, 4 )
			. str_repeat( '*', $len - 8 )
			. substr( $key, -4 );
	}

	/**
	 * Saves the editable license server URL and returns the refreshed payload.
	 *
	 * @param string|null $server_url Raw server URL input.
	 * @return array{serverUrl: ?string, serverConfigured: bool, storedLicenseKey: ?string}|\WP_Error
	 */
	public function save_license_server_settings( ?string $server_url ) {
		$sanitized = $this->sanitize_server_url( $server_url );

		if ( is_wp_error( $sanitized ) ) {
			return $sanitized;
		}

		$saved = $this->settings_repository->save_server_url( $sanitized );

		if ( ! $saved && $this->settings_repository->get_server_url() !== $sanitized ) {
			return new \WP_Error(
				'license_server_settings_save_failed',
				'Failed to save the license server URL.',
				array( 'status' => 500 )
			);
		}

		return $this->get_license_server_settings_payload();
	}

	/**
	 * Validates the editable server URL input.
	 *
	 * @param string|null $server_url Raw URL value.
	 * @return string|\WP_Error
	 */
	private function sanitize_server_url( ?string $server_url ) {
		$raw_value = trim( sanitize_text_field( (string) $server_url ) );

		if ( '' === $raw_value ) {
			return '';
		}

		$normalized = untrailingslashit( esc_url_raw( $raw_value ) );

		if ( '' === $normalized ) {
			return new \WP_Error(
				'invalid_license_server_url',
				'License server URL must be a valid absolute URL.',
				array( 'status' => 400 )
			);
		}

		$parts = wp_parse_url( $normalized );

		if ( ! is_array( $parts ) || empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
			return new \WP_Error(
				'invalid_license_server_url',
				'License server URL must be a valid absolute URL.',
				array( 'status' => 400 )
			);
		}

		$scheme = strtolower( (string) $parts['scheme'] );

		if ( ! in_array( $scheme, array( 'http', 'https' ), true ) ) {
			return new \WP_Error(
				'invalid_license_server_url',
				'License server URL must use http or https.',
				array( 'status' => 400 )
			);
		}

		$host = isset( $parts['host'] ) ? strtolower( (string) $parts['host'] ) : '';

		if ( 'http' === $scheme && ! $this->is_local_development_host( $host ) ) {
			return new \WP_Error(
				'invalid_license_server_url',
				'License server URL must use HTTPS outside local development.',
				array( 'status' => 400 )
			);
		}

		return $normalized;
	}

	/**
	 * Returns whether the given host is allowed to use plain HTTP.
	 *
	 * @param string $host Parsed server host.
	 */
	private function is_local_development_host( string $host ): bool {
		return in_array( $host, array( 'localhost', '127.0.0.1', '::1' ), true )
			|| str_ends_with( $host, '.test' )
			|| str_ends_with( $host, '.local' );
	}
}
