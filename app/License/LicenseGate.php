<?php
/**
 * Central feature gate for licensed capabilities.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License;

use WP_Error;
use WpReactUi\License\Contracts\FeatureFilterInterface;

defined( 'ABSPATH' ) || exit;

final class LicenseGate {
	private const MAX_VALIDATION_AGE = DAY_IN_SECONDS;

	private static ?FeatureFilterInterface $feature_filter = null;

	/**
	 * Sets the feature filter implementation (for testing and DI).
	 *
	 * @param FeatureFilterInterface $filter Feature filter instance.
	 */
	public static function setFeatureFilter( FeatureFilterInterface $filter ): void {
		self::$feature_filter = $filter;
	}

	/**
	 * Gets the feature filter implementation, using default from container.
	 */
	private static function getFeatureFilter(): FeatureFilterInterface {
		if ( null === self::$feature_filter ) {
			self::$feature_filter = LicenseServiceContainer::getInstance()->getFeatureFilter();
		}
		return self::$feature_filter;
	}

	/**
	 * Returns whether the current site has a valid license for licensed settings.
	 */
	public static function has_valid_license(): bool {
		$container           = LicenseServiceContainer::getInstance();
		$settings_repository = $container->getSettingsRepository();
		$cache               = $container->getCache();
		$manager             = $container->getManager();
		$grace_period        = $container->getGracePeriod();
		$cached              = self::resolve_payload( $cache, $settings_repository, $manager, $grace_period );

		return is_array( $cached ) && self::allows_payload( $cached );
	}

	/**
	 * Returns whether a licensed feature is currently available.
	 *
	 * @param string $feature Feature identifier to check.
	 */
	public static function can( string $feature ): bool {
		$normalized_feature = sanitize_key( $feature );

		if ( '' === $normalized_feature ) {
			return false;
		}

		$container           = LicenseServiceContainer::getInstance();
		$settings_repository = $container->getSettingsRepository();
		$cache               = $container->getCache();
		$manager             = $container->getManager();
		$grace_period        = $container->getGracePeriod();
		$cached              = self::resolve_payload( $cache, $settings_repository, $manager, $grace_period );

		if ( ! is_array( $cached ) || ! self::allows_payload( $cached ) ) {
			return false;
		}

		$filter_service = self::getFeatureFilter();
		$features       = $filter_service->filter( 'wp_react_ui_license_allowed_features', $cached['features'] );

		return is_array( $features ) && in_array( $normalized_feature, $features, true );
	}

	/**
	 * Returns whether the cached payload currently grants licensed access.
	 *
	 * @param array{status: string, graceDaysRemaining: int} $cached Cached license payload.
	 */
	private static function allows_payload( array $cached ): bool {
		if ( LicenseCache::STATUS_DISABLED === $cached['status'] ) {
			return false;
		}

		return LicenseCache::STATUS_EXPIRED !== $cached['status'] || (int) $cached['graceDaysRemaining'] > 0;
	}

	/**
	 * Resolves the current payload, revalidating or transitioning state when needed.
	 *
	 * @param LicenseCache              $cache               License cache instance.
	 * @param LicenseSettingsRepository $settings_repository License settings repository.
	 * @param LicenseManager            $manager             License manager used for refreshes.
	 * @return array<string, mixed>|null
	 */
	private static function resolve_payload(
		LicenseCache $cache,
		LicenseSettingsRepository $settings_repository,
		LicenseManager $manager,
		LicenseGracePeriod $grace_period
	): ?array {
		if ( ! $settings_repository->has_license_key() ) {
			return null;
		}

		$cached     = $cache->get();
		$key_prefix = $settings_repository->get_key_prefix();

		if ( is_array( $cached ) ) {
			if ( null === $cached['keyPrefix'] || null === $key_prefix || ! hash_equals( $cached['keyPrefix'], $key_prefix ) ) {
				$cache->clear();
				return null;
			}

			if ( self::is_grace_state( $cached ) ) {
				$grace_status = $grace_period->get_status();

				if ( 'normal' === $grace_status['mode'] && (int) $cached['graceDaysRemaining'] > 0 ) {
					$grace_status = $grace_period->sync_grace_days_remaining( (int) $cached['graceDaysRemaining'] );
				}

				if ( 'disabled' === $grace_status['mode'] ) {
					return $manager->enter_disabled_state();
				}

				if ( ! $cache->has_fresh_transient() ) {
					return self::refresh_payload( $manager );
				}

				$cached['graceDaysRemaining'] = $grace_status['graceDaysRemaining'];
				return $cached;
			}

			if ( LicenseCache::STATUS_ACTIVE !== $cached['status'] || ! self::is_validation_stale( $cached['lastValidatedAt'] ?? null ) ) {
				return $cached;
			}
		}

		return self::refresh_payload( $manager );
	}

	/**
	 * Refreshes the payload from the remote server and handles recoverable failures.
	 *
	 * @param LicenseManager $manager License manager used for refreshes.
	 * @return array<string, mixed>
	 */
	private static function refresh_payload( LicenseManager $manager ): array {
		$result = $manager->validate();

		if ( is_wp_error( $result ) ) {
			if ( self::is_recoverable_error( $result ) ) {
				return $manager->enter_grace_state();
			}

			return $manager->enter_disabled_state();
		}

		return $result;
	}

	/**
	 * Returns whether the current payload needs a fresh validation pass.
	 *
	 * @param string|null $last_validated_at UTC timestamp from the last successful validation.
	 */
	private static function is_validation_stale( ?string $last_validated_at ): bool {
		if ( null === $last_validated_at || '' === $last_validated_at ) {
			return true;
		}

		$timestamp = strtotime( $last_validated_at . ' UTC' );

		if ( false === $timestamp ) {
			return true;
		}

		return ( time() - $timestamp ) >= self::MAX_VALIDATION_AGE;
	}

	/**
	 * Returns whether a validation failure should preserve grace access.
	 *
	 * @param WP_Error $error Validation error returned by the license manager.
	 */
	private static function is_recoverable_error( WP_Error $error ): bool {
		if ( in_array( $error->get_error_code(), array( 'license_request_failed', 'license_invalid_response' ), true ) ) {
			return true;
		}

		$data = $error->get_error_data();

		return is_array( $data ) && isset( $data['status'] ) && (int) $data['status'] >= 500;
	}

	/**
	 * @param array{status: string, graceDaysRemaining: int} $payload Cached license payload.
	 */
	private static function is_grace_state( array $payload ): bool {
		return LicenseCache::STATUS_GRACE === $payload['status']
			|| ( LicenseCache::STATUS_EXPIRED === $payload['status'] && $payload['graceDaysRemaining'] > 0 );
	}
}
