<?php
/**
 * Transient-backed cache for the current license snapshot.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License;

use WpReactUi\License\Contracts\CacheRepositoryInterface;
use WpReactUi\License\Contracts\OptionsRepositoryInterface;

defined( 'ABSPATH' ) || exit;

final class LicenseCache {
	public const TRANSIENT_KEY   = 'wp_react_ui_license_state';
	private const OPTION_KEY     = 'wp_react_ui_license_state_backup';
	public const STATUS_ACTIVE   = 'active';
	public const STATUS_EXPIRED  = 'expired';
	public const STATUS_GRACE    = 'grace';
	public const STATUS_DISABLED = 'disabled';

	private const NORMAL_TTL = DAY_IN_SECONDS;
	private const GRACE_TTL  = HOUR_IN_SECONDS;

	private CacheRepositoryInterface $cache;
	private OptionsRepositoryInterface $options;

	public function __construct(
		?CacheRepositoryInterface $cache = null,
		?OptionsRepositoryInterface $options = null
	) {
		$container     = LicenseServiceContainer::get_instance();
		$this->cache   = $cache ?? $container->get_cache_repository();
		$this->options = $options ?? $container->get_options_repository();
	}

	/**
	 * Factory method for backward-compatible instantiation with WordPress adapters.
	 *
	 * @deprecated Use LicenseServiceContainer::get_instance()->get_cache() instead.
	 */
	public static function createWithWordPressAdapters(): self {
		$container = LicenseServiceContainer::get_instance();
		return $container->get_cache();
	}

	/**
	 * Returns the cached license snapshot.
	 *
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, keyPrefix: ?string, lastValidatedAt: ?string}|null
	 */
	public function get(): ?array {
		$cached = $this->cache->get( self::TRANSIENT_KEY );

		if ( is_array( $cached ) ) {
			return $this->normalize( $cached );
		}

		$backup = $this->options->get( self::OPTION_KEY, null );

		if ( ! is_array( $backup ) ) {
			return null;
		}

		return $this->normalize( $backup );
	}

	/**
	 * Returns whether the transient-backed cache is currently populated.
	 */
	public function has_fresh_transient(): bool {
		return is_array( $this->cache->get( self::TRANSIENT_KEY ) );
	}

	/**
	 * Stores a normalized license snapshot in a transient.
	 *
	 * @param array<string, mixed> $data Raw cache payload.
	 */
	public function set( array $data ): bool {
		$payload = $this->normalize( $data );
		$ttl     = $this->uses_grace_ttl( $payload ) ? self::GRACE_TTL : self::NORMAL_TTL;

		/**
		 * Filters the TTL used for cached license payloads.
		 *
		 * @param int   $ttl     Chosen TTL in seconds.
		 * @param array $payload Normalized license payload.
		 */
		$ttl = (int) apply_filters( 'wp_react_ui_license_cache_ttl', $ttl, $payload );

		$this->options->update( self::OPTION_KEY, $payload );

		return $this->cache->set( self::TRANSIENT_KEY, $payload, $ttl );
	}

	/**
	 * Clears the cached license snapshot.
	 */
	public function clear(): bool {
		$this->options->delete( self::OPTION_KEY );
		return $this->cache->delete( self::TRANSIENT_KEY );
	}

	/**
	 * Returns a disabled-state payload.
	 *
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, keyPrefix: ?string, lastValidatedAt: ?string}
	 */
	public function default_payload(): array {
		return array(
			'status'             => self::STATUS_DISABLED,
			'role'               => null,
			'tier'               => null,
			'expiresAt'          => null,
			'features'           => array(),
			'graceDaysRemaining' => 0,
			'keyPrefix'          => null,
			'lastValidatedAt'    => null,
		);
	}

	/**
	 * Normalizes a raw cache payload.
	 *
	 * @param array<string, mixed> $data Raw cache payload.
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, keyPrefix: ?string, lastValidatedAt: ?string}
	 */
	private function normalize( array $data ): array {
		$status = sanitize_key( (string) ( $data['status'] ?? self::STATUS_DISABLED ) );

		if ( ! in_array( $status, array( self::STATUS_ACTIVE, self::STATUS_EXPIRED, self::STATUS_GRACE, self::STATUS_DISABLED ), true ) ) {
			$status = self::STATUS_DISABLED;
		}

		$role = sanitize_key( (string) ( $data['role'] ?? '' ) );
		if ( '' === $role ) {
			$role = null;
		}

		$tier = sanitize_key( (string) ( $data['tier'] ?? '' ) );
		if ( '' === $tier ) {
			$tier = null;
		}

		$expires_at = sanitize_text_field( (string) ( $data['expiresAt'] ?? '' ) );
		if ( '' === $expires_at ) {
			$expires_at = null;
		}

		$key_prefix = sanitize_text_field( (string) ( $data['keyPrefix'] ?? '' ) );
		if ( '' === $key_prefix ) {
			$key_prefix = null;
		}

		$last_validated_at = sanitize_text_field( (string) ( $data['lastValidatedAt'] ?? '' ) );
		if ( '' === $last_validated_at ) {
			$last_validated_at = null;
		}

		$features = array();
		if ( isset( $data['features'] ) && is_array( $data['features'] ) ) {
			foreach ( $data['features'] as $feature ) {
				$normalized_feature = sanitize_key( (string) $feature );
				if ( '' !== $normalized_feature ) {
					$features[] = $normalized_feature;
				}
			}
		}

		return array(
			'status'             => $status,
			'role'               => $role,
			'tier'               => $tier,
			'expiresAt'          => $expires_at,
			'features'           => array_values( array_unique( $features ) ),
			'graceDaysRemaining' => absint( $data['graceDaysRemaining'] ?? 0 ),
			'keyPrefix'          => $key_prefix,
			'lastValidatedAt'    => $last_validated_at,
		);
	}

	/**
	 * Returns whether the cache payload should use the short grace TTL.
	 *
	 * @param array{status: string, graceDaysRemaining: int} $payload Normalized payload.
	 */
	private function uses_grace_ttl( array $payload ): bool {
		return self::STATUS_GRACE === $payload['status']
			|| ( self::STATUS_EXPIRED === $payload['status'] && $payload['graceDaysRemaining'] > 0 );
	}
}
