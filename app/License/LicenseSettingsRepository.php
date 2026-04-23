<?php
/**
 * License settings persistence and configuration lookup.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License;

defined( 'ABSPATH' ) || exit;

final class LicenseSettingsRepository {
	private const OPTION_NAME      = 'wp_react_ui_license_settings';
	private const SECRETBOX_CIPHER = 'secretbox';
	private const OPENSSL_CIPHER   = 'aes-256-gcm';

	/**
	 * Returns the stored settings merged with defaults.
	 *
	 * @return array{license_key: string, encrypted_license_key: string, license_key_nonce: string, license_key_tag: string, license_key_cipher: string, webhook_secret: string, encrypted_webhook_secret: string, webhook_secret_nonce: string, webhook_secret_tag: string, webhook_secret_cipher: string}
	 */
	public function get_settings(): array {
		$settings = get_option( self::OPTION_NAME, array() );

		if ( ! is_array( $settings ) ) {
			$settings = array();
		}

		return wp_parse_args(
			$settings,
			array(
				'license_key'              => '',
				'encrypted_license_key'    => '',
				'license_key_nonce'        => '',
				'license_key_tag'          => '',
				'license_key_cipher'       => '',
				'webhook_secret'           => '',
				'encrypted_webhook_secret' => '',
				'webhook_secret_nonce'     => '',
				'webhook_secret_tag'       => '',
				'webhook_secret_cipher'    => '',
			)
		);
	}

	/**
	 * Returns the stored license key.
	 */
	public function get_license_key(): string {
		$settings  = $this->get_settings();
		$decrypted = $this->decrypt_license_key( $settings );

		if ( '' !== $decrypted ) {
			return $decrypted;
		}

		$key = $settings['license_key'] ?? '';

		if ( ! is_string( $key ) ) {
			return '';
		}

		$key = strtolower( sanitize_text_field( $key ) );

		if ( '' === $key ) {
			return '';
		}

		if ( $this->save_license_key( $key ) ) {
			return $key;
		}

		return '';
	}

	/**
	 * Returns the stored license key prefix.
	 */
	public function get_key_prefix(): ?string {
		$key = $this->get_license_key();

		if ( strlen( $key ) < 8 ) {
			return null;
		}

		return substr( $key, 0, 8 );
	}

	/**
	 * Returns whether a license key is stored.
	 */
	public function has_license_key(): bool {
		return '' !== $this->get_license_key();
	}

	/**
	 * Persists a license key.
	 *
	 * @param string $license_key Raw license key value.
	 */
	public function save_license_key( string $license_key ): bool {
		$sanitized = preg_replace( '/[^a-f0-9]/i', '', strtolower( sanitize_text_field( $license_key ) ) );

		if ( ! is_string( $sanitized ) ) {
			$sanitized = '';
		}

		if ( '' === $sanitized ) {
			return $this->clear_license_key();
		}

		$encrypted = $this->encrypt_license_key( $sanitized );

		if ( ! is_array( $encrypted ) ) {
			return false;
		}

		return update_option(
			self::OPTION_NAME,
			array_merge(
				$this->get_settings(),
				$encrypted
			),
			false
		);
	}

	/**
	 * Clears the stored license key.
	 */
	public function clear_license_key(): bool {
		return update_option(
			self::OPTION_NAME,
			array(
				'license_key'              => '',
				'encrypted_license_key'    => '',
				'license_key_nonce'        => '',
				'license_key_tag'          => '',
				'license_key_cipher'       => '',
				'webhook_secret'           => '',
				'encrypted_webhook_secret' => '',
				'webhook_secret_nonce'     => '',
				'webhook_secret_tag'       => '',
				'webhook_secret_cipher'    => '',
			),
			false
		);
	}

	/**
	 * Returns the stored webhook secret, decrypting it from the encrypted fields.
	 *
	 * If only a legacy plain-text value is found, it is encrypted and re-saved
	 * transparently (encrypt-on-read migration).
	 */
	public function get_webhook_secret(): string {
		$settings = $this->get_settings();

		// Try decrypting the stored encrypted secret first.
		$decrypted = $this->decrypt_data(
			$settings['encrypted_webhook_secret'] ?? '',
			$settings['webhook_secret_nonce'] ?? '',
			$settings['webhook_secret_tag'] ?? '',
			$settings['webhook_secret_cipher'] ?? ''
		);

		if ( '' !== $decrypted ) {
			return strtolower( sanitize_text_field( $decrypted ) );
		}

		// No encrypted secret found — check for a legacy plain-text value and migrate it.
		$legacy = $settings['webhook_secret'] ?? '';

		if ( ! is_string( $legacy ) || '' === $legacy ) {
			return '';
		}

		$legacy = strtolower( sanitize_text_field( $legacy ) );

		// Encrypt and persist the plain-text value so subsequent reads use encryption.
		$this->save_webhook_secret( $legacy );

		return $legacy;
	}

	/**
	 * Persists the webhook secret for this site activation, encrypted at rest.
	 *
	 * @param string $webhook_secret Activation webhook secret.
	 */
	public function save_webhook_secret( string $webhook_secret ): bool {
		$sanitized = preg_replace( '/[^a-f0-9]/i', '', strtolower( sanitize_text_field( $webhook_secret ) ) );

		if ( ! is_string( $sanitized ) ) {
			$sanitized = '';
		}

		if ( '' === $sanitized ) {
			return update_option(
				self::OPTION_NAME,
				array_merge(
					$this->get_settings(),
					array(
						'webhook_secret'           => '',
						'encrypted_webhook_secret' => '',
						'webhook_secret_nonce'     => '',
						'webhook_secret_tag'       => '',
						'webhook_secret_cipher'    => '',
					)
				),
				false
			);
		}

		$encrypted = $this->encrypt_data( $sanitized );

		if ( null === $encrypted ) {
			// Encryption unavailable — store plain text as a last resort.
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_trigger_trigger_error
			trigger_error( 'WP React UI: webhook secret stored unencrypted (sodium and openssl unavailable).', E_USER_WARNING );
			add_action(
				'admin_notices',
				static function () {
					if ( ! current_user_can( 'manage_options' ) ) {
						return;
					}
					echo '<div class="notice notice-warning is-dismissible"><p>'
						. esc_html__( 'WP React UI: Your webhook secret is stored unencrypted because neither the sodium nor openssl PHP extension is available. Enable one of these extensions to secure your data.', 'wp-react-ui' )
						. '</p></div>';
				}
			);
			return update_option(
				self::OPTION_NAME,
				array_merge(
					$this->get_settings(),
					array( 'webhook_secret' => $sanitized )
				),
				false
			);
		}

		return update_option(
			self::OPTION_NAME,
			array_merge(
				$this->get_settings(),
				array(
					'webhook_secret'           => '',
					'encrypted_webhook_secret' => $encrypted['ciphertext'],
					'webhook_secret_nonce'     => $encrypted['nonce'],
					'webhook_secret_tag'       => $encrypted['tag'],
					'webhook_secret_cipher'    => $encrypted['cipher'],
				)
			),
			false
		);
	}

	/**
	 * Encrypts a license key before persisting it in options.
	 *
	 * @param string $license_key Normalized license key.
	 * @return array{license_key: string, encrypted_license_key: string, license_key_nonce: string, license_key_tag: string, license_key_cipher: string}|null
	 */
	private function encrypt_license_key( string $license_key ): ?array {
		$encrypted = $this->encrypt_data( $license_key );

		if ( null === $encrypted ) {
			return null;
		}

		return array(
			'license_key'           => '',
			'encrypted_license_key' => $encrypted['ciphertext'],
			'license_key_nonce'     => $encrypted['nonce'],
			'license_key_tag'       => $encrypted['tag'],
			'license_key_cipher'    => $encrypted['cipher'],
		);
	}

	/**
	 * Decrypts the stored license key when encrypted settings are available.
	 *
	 * @param array{license_key: string, encrypted_license_key: string, license_key_nonce: string, license_key_tag: string, license_key_cipher: string} $settings Stored settings.
	 */
	private function decrypt_license_key( array $settings ): string {
		$result = $this->decrypt_data(
			$settings['encrypted_license_key'] ?? '',
			$settings['license_key_nonce'] ?? '',
			$settings['license_key_tag'] ?? '',
			$settings['license_key_cipher'] ?? ''
		);

		if ( '' === $result ) {
			return '';
		}

		return strtolower( sanitize_text_field( $result ) );
	}

	/**
	 * Encrypts a plaintext value using the application-specific key.
	 *
	 * Tries libsodium secretbox first, falls back to AES-256-GCM via OpenSSL,
	 * and returns null when neither extension is available.
	 *
	 * @param string $plaintext Value to encrypt.
	 * @return array{ciphertext: string, nonce: string, tag: string, cipher: string}|null
	 */
	private function encrypt_data( string $plaintext ): ?array {
		$key = $this->get_encryption_key();

		if ( function_exists( 'sodium_crypto_secretbox' ) ) {
			$nonce      = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
			$ciphertext = sodium_crypto_secretbox( $plaintext, $nonce, $key );

			// phpcs:disable WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
			return array(
				'ciphertext' => base64_encode( $ciphertext ),
				'nonce'      => base64_encode( $nonce ),
				'tag'        => '',
				'cipher'     => self::SECRETBOX_CIPHER,
			);
			// phpcs:enable WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
		}

		if ( function_exists( 'openssl_encrypt' ) ) {
			$nonce      = random_bytes( 12 );
			$tag        = '';
			$ciphertext = openssl_encrypt( $plaintext, self::OPENSSL_CIPHER, $key, OPENSSL_RAW_DATA, $nonce, $tag );

			if ( ! is_string( $ciphertext ) || '' === $tag ) {
				return null;
			}

			// phpcs:disable WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
			return array(
				'ciphertext' => base64_encode( $ciphertext ),
				'nonce'      => base64_encode( $nonce ),
				'tag'        => base64_encode( $tag ),
				'cipher'     => self::OPENSSL_CIPHER,
			);
			// phpcs:enable WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
		}

		return null;
	}

	/**
	 * Decrypts a ciphertext produced by encrypt_data().
	 *
	 * Returns an empty string on any failure — never throws.
	 *
	 * @param string $ciphertext_b64 Base64-encoded ciphertext.
	 * @param string $nonce_b64      Base64-encoded nonce.
	 * @param string $tag_b64        Base64-encoded authentication tag (AES-GCM); empty for secretbox.
	 * @param string $cipher         Cipher identifier stored alongside the ciphertext.
	 */
	private function decrypt_data( string $ciphertext_b64, string $nonce_b64, string $tag_b64, string $cipher ): string {
		if ( '' === $ciphertext_b64 || '' === $nonce_b64 || '' === $cipher ) {
			return '';
		}

		// phpcs:disable WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
		$decoded_ciphertext = base64_decode( $ciphertext_b64, true );
		$decoded_nonce      = base64_decode( $nonce_b64, true );
		$decoded_tag        = '' !== $tag_b64 ? base64_decode( $tag_b64, true ) : '';
		// phpcs:enable WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode

		if ( ! is_string( $decoded_ciphertext ) || ! is_string( $decoded_nonce ) ) {
			return '';
		}

		if ( self::SECRETBOX_CIPHER === $cipher && function_exists( 'sodium_crypto_secretbox_open' ) ) {
			if ( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES !== strlen( $decoded_nonce ) ) {
				return '';
			}

			$decrypted = sodium_crypto_secretbox_open( $decoded_ciphertext, $decoded_nonce, $this->get_encryption_key() );

			return is_string( $decrypted ) ? $decrypted : '';
		}

		if ( self::OPENSSL_CIPHER === $cipher && function_exists( 'openssl_decrypt' ) ) {
			if ( ! is_string( $decoded_tag ) ) {
				return '';
			}

			$decrypted = openssl_decrypt( $decoded_ciphertext, self::OPENSSL_CIPHER, $this->get_encryption_key(), OPENSSL_RAW_DATA, $decoded_nonce, $decoded_tag );

			return is_string( $decrypted ) ? $decrypted : '';
		}

		return '';
	}

	/**
	 * Derives an application-specific encryption key from WordPress salts.
	 */
	private function get_encryption_key(): string {
		$salt = wp_salt( 'auth' );
		$salt = is_string( $salt ) && '' !== $salt ? $salt : 'wp-react-ui-license';

		return hash_hkdf( 'sha256', $salt, 32, 'wp-react-ui-license-key-v1' );
	}

	/**
	 * Returns the configured license server URL.
	 */
	public function get_server_url(): string {
		$configured = '';

		if ( defined( 'WP_REACT_UI_LICENSE_SERVER_URL' ) ) {
			$constant_value = constant( 'WP_REACT_UI_LICENSE_SERVER_URL' );
			if ( is_string( $constant_value ) ) {
				$configured = $constant_value;
			}
		}

		if ( '' === $configured ) {
			$stored     = get_option( 'wp_react_ui_license_server_url', '' );
			$configured = is_string( $stored ) ? $stored : '';
		}

		/**
		 * Filters the license server URL used for outbound validation requests.
		 *
		 * @param string $configured Currently configured URL.
		 */
		$configured = (string) apply_filters( 'wp_react_ui_license_server_url', $configured );

		return untrailingslashit( esc_url_raw( $configured ) );
	}

	/**
	 * Returns whether a license server URL is configured.
	 */
	public function is_server_configured(): bool {
		return '' !== $this->get_server_url();
	}

	/**
	 * Persists the license server URL option.
	 *
	 * @param string $server_url Sanitized absolute URL or empty string.
	 */
	public function save_server_url( string $server_url ): bool {
		// Auto-upgrade http:// → https:// for public domains.
		$normalized = preg_replace( '#^http://#i', 'https://', trim( $server_url ) );
		return update_option(
			'wp_react_ui_license_server_url',
			untrailingslashit( esc_url_raw( is_string( $normalized ) ? $normalized : $server_url ) ),
			false
		);
	}
}
