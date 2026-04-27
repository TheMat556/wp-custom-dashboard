<?php
/**
 * Manages state transitions for license lifecycle.
 *
 * Coordinates transitions between ACTIVE, GRACE, EXPIRED, and DISABLED states.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License;

defined( 'ABSPATH' ) || exit;

class LicenseStateTransitioner {
	public function __construct(
		private readonly LicenseCache $cache,
		private readonly LicenseSettingsRepository $settings_repository,
		private readonly LicenseGracePeriod $grace_period
	) {}

	/**
	 * Transitions to grace state and returns the updated payload.
	 *
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, keyPrefix: ?string, lastValidatedAt: ?string}
	 */
	public function transition_to_grace(): array {
		$grace_status                  = $this->grace_period->start_grace();
		$current                       = $this->cache->get() ?? $this->cache->default_payload();
		$current['status']             = LicenseCache::STATUS_GRACE;
		$current['graceDaysRemaining'] = $grace_status['graceDaysRemaining'];
		$current['keyPrefix']          = $current['keyPrefix'] ?? $this->settings_repository->get_key_prefix();

		$this->cache->set( $current );

		return $current;
	}

	/**
	 * Transitions to disabled state and returns the updated payload.
	 *
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, keyPrefix: ?string, lastValidatedAt: ?string}
	 */
	public function transition_to_disabled(): array {
		$this->grace_period->clear_grace();

		$current              = $this->cache->default_payload();
		$current['status']    = LicenseCache::STATUS_DISABLED;
		$current['keyPrefix'] = $this->settings_repository->get_key_prefix();
		$this->cache->set( $current );

		return $current;
	}

	/**
	 * Transitions to expired state with optional grace period.
	 *
	 * @param array<string, mixed> $webhook_data Optional webhook event data.
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, keyPrefix: ?string, lastValidatedAt: ?string}
	 */
	public function transition_to_expired( array $webhook_data = array() ): array {
		$current = $this->cache->get() ?? $this->cache->default_payload();

		if ( isset( $webhook_data['grace_days_remaining'] ) ) {
			$grace_status = $this->grace_period->sync_grace_days_remaining( absint( $webhook_data['grace_days_remaining'] ) );
		} else {
			$grace_status = $this->grace_period->start_grace();
		}

		$current['status']             = LicenseCache::STATUS_EXPIRED;
		$current['graceDaysRemaining'] = $grace_status['graceDaysRemaining'];
		$current['keyPrefix']          = $this->settings_repository->get_key_prefix();

		if ( isset( $webhook_data['tier'] ) ) {
			$tier = sanitize_key( (string) $webhook_data['tier'] );
			if ( '' !== $tier ) {
				$current['tier'] = $tier;
			}
		}

		if ( isset( $webhook_data['role'] ) ) {
			$role = sanitize_key( (string) $webhook_data['role'] );
			if ( '' !== $role ) {
				$current['role'] = $role;
			}
		}

		if ( isset( $webhook_data['valid_until'] ) ) {
			$expires_at = sanitize_text_field( (string) $webhook_data['valid_until'] );
			if ( '' !== $expires_at ) {
				$current['expiresAt'] = $expires_at;
			}
		}

		if ( isset( $webhook_data['features'] ) && is_array( $webhook_data['features'] ) ) {
			$current['features'] = $this->normalize_features( $webhook_data['features'] );
		}

		$this->cache->set( $current );

		return $current;
	}

	/**
	 * Transitions to active state given a remote payload.
	 *
	 * @param array<string, mixed> $remote_payload Remote license server response.
	 * @param string               $license_key    Normalized 64-character license key.
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, keyPrefix: ?string, lastValidatedAt: ?string}
	 */
	public function transition_to_active( array $remote_payload, string $license_key ): array {
		$this->settings_repository->save_license_key( $license_key );
		if ( isset( $remote_payload['webhook_secret'] ) && is_string( $remote_payload['webhook_secret'] ) ) {
			$this->settings_repository->save_webhook_secret( $remote_payload['webhook_secret'] );
		} else {
			$this->settings_repository->save_webhook_secret( '' );
		}
		$this->grace_period->clear_grace();

		$payload           = $this->build_payload_from_remote( $remote_payload, $license_key );
		$payload['status'] = LicenseCache::STATUS_ACTIVE;
		$this->cache->set( $payload );

		return $payload;
	}

	/**
	 * Checks if cached payload is in a grace state.
	 *
	 * @param array{status: string, graceDaysRemaining: int} $payload Cached payload.
	 */
	public function is_grace_state( array $payload ): bool {
		return LicenseCache::STATUS_GRACE === $payload['status']
			|| ( LicenseCache::STATUS_EXPIRED === $payload['status'] && $payload['graceDaysRemaining'] > 0 );
	}

	/**
	 * Builds a normalized cache payload from a remote response.
	 *
	 * @param array<string, mixed> $remote_response Remote license server payload.
	 * @param string               $license_key     License key used for the remote request.
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, keyPrefix: ?string, lastValidatedAt: ?string}
	 */
	public function build_payload_from_remote( array $remote_response, string $license_key ): array {
		$license = isset( $remote_response['license'] ) && is_array( $remote_response['license'] )
			? $remote_response['license']
			: array();
		$status  = sanitize_key( (string) ( $remote_response['status'] ?? LicenseCache::STATUS_DISABLED ) );

		if ( in_array( $status, array( 'valid', 'activated' ), true ) ) {
			$status = LicenseCache::STATUS_ACTIVE;
		}

		$role = sanitize_key( (string) ( $license['role'] ?? '' ) );
		if ( '' === $role ) {
			$role = null;
		}

		$tier = sanitize_key( (string) ( $license['tier'] ?? '' ) );
		if ( '' === $tier ) {
			$tier = null;
		}

		$expires_at = sanitize_text_field( (string) ( $license['valid_until'] ?? '' ) );
		if ( '' === $expires_at ) {
			$expires_at = null;
		}

		if ( ! in_array( $status, array( LicenseCache::STATUS_ACTIVE, LicenseCache::STATUS_GRACE, LicenseCache::STATUS_EXPIRED, LicenseCache::STATUS_DISABLED ), true ) ) {
			$status = LicenseCache::STATUS_DISABLED;
		}

		$payload = array(
			'status'             => $status,
			'role'               => $role,
			'tier'               => $tier,
			'expiresAt'          => $expires_at,
			'features'           => array(),
			'graceDaysRemaining' => absint( $license['grace_days_remaining'] ?? 0 ),
			'keyPrefix'          => substr( $license_key, 0, 8 ),
			'lastValidatedAt'    => current_time( 'mysql', true ),
		);

		if ( isset( $license['features'] ) && is_array( $license['features'] ) ) {
			$payload['features'] = $this->normalize_features( $license['features'] );
		}

		return $payload;
	}

	/**
	 * Normalizes features list.
	 *
	 * @param array<int, mixed> $features Raw feature list.
	 * @return array<int, string>
	 */
	private function normalize_features( array $features ): array {
		$normalized = array();

		foreach ( $features as $feature ) {
			$normalized_feature = sanitize_key( (string) $feature );
			if ( '' !== $normalized_feature ) {
				$normalized[] = $normalized_feature;
			}
		}

		return array_values( array_unique( $normalized ) );
	}
}
