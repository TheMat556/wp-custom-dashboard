<?php
/**
 * Coordinates local license persistence, cache updates, and remote sync.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License;

use WP_Error;

defined( 'ABSPATH' ) || exit;

final class LicenseManager {
	private LicenseClient $client;
	private LicenseCache $cache;
	private LicenseSettingsRepository $settings_repository;
	private LicenseStateTransitioner $transitioner;

	private LicenseGracePeriod $grace_period;

	public function __construct(
		?LicenseClient $client = null,
		?LicenseCache $cache = null,
		?LicenseSettingsRepository $settings_repository = null,
		?LicenseStateTransitioner $transitioner = null,
		?LicenseGracePeriod $grace_period = null
	) {
		$container                 = LicenseServiceContainer::getInstance();
		$this->settings_repository = $settings_repository ?? $container->getSettingsRepository();
		$this->client              = $client ?? new LicenseClient( null, $this->settings_repository );
		$this->cache               = $cache ?? $container->getCache();
		$this->grace_period        = $grace_period ?? $container->getGracePeriod();
		$this->transitioner        = $transitioner ?? new LicenseStateTransitioner(
			$this->cache,
			$this->settings_repository,
			$this->grace_period
		);
	}

	/**
	 * Returns the current public license snapshot.
	 *
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, hasKey: bool, keyPrefix: ?string, serverConfigured: bool}
	 */
	public function get_status_payload(): array {
		$key_prefix = $this->settings_repository->get_key_prefix();
		$cached     = $this->cache->get();

		if ( is_array( $cached ) && ! $this->cache_matches_current_key( $cached, $key_prefix ) ) {
			$this->cache->clear();
			$cached = null;
		}

		if ( $this->settings_repository->has_license_key() && ( ! is_array( $cached ) || $this->should_refresh_public_payload( $cached ) ) ) {
			return $this->refresh_public_payload();
		}

		if ( is_array( $cached ) ) {
			$grace_status = $this->grace_period->get_status();

			if ( 'normal' === $grace_status['mode'] && $this->transitioner->isGraceState( $cached ) ) {
				$grace_status = $this->grace_period->sync_grace_days_remaining( (int) $cached['graceDaysRemaining'] );
			}

			if ( $this->transitioner->isGraceState( $cached ) && 'disabled' === $grace_status['mode'] ) {
				return $this->build_public_payload( $this->transitioner->transitionToDisabled() );
			}

			if ( $this->transitioner->isGraceState( $cached ) && $grace_status['graceDaysRemaining'] > 0 ) {
				$cached['graceDaysRemaining'] = $grace_status['graceDaysRemaining'];
			}

			return $this->build_public_payload( $cached );
		}

		$grace_status = $this->grace_period->get_status();
		$status       = 'normal' === $grace_status['mode'] ? LicenseCache::STATUS_DISABLED : $grace_status['mode'];
		$payload      = $this->cache->default_payload();
		$payload['status']             = $status;
		$payload['graceDaysRemaining'] = $grace_status['graceDaysRemaining'];
		$payload['keyPrefix']          = $key_prefix;

		return $this->build_public_payload( $payload );
	}

	/**
	 * Activates a license and stores the resulting local state.
	 *
	 * @param string $license_key License key to activate.
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, hasKey: bool, keyPrefix: ?string, serverConfigured: bool}|WP_Error
	 */
	public function activate( string $license_key ) {
		$normalized_key = $this->normalize_key( $license_key );
		$current_key    = $this->settings_repository->get_license_key();
		$replaced_key   = null;

		if ( preg_match( '/^[a-f0-9]{64}$/', $normalized_key ) && '' !== $current_key && ! hash_equals( $current_key, $normalized_key ) ) {
			$released = $this->release_previous_activation( $current_key );

			if ( is_wp_error( $released ) ) {
				return $released;
			}

			$replaced_key = $current_key;
		}

		$result = $this->client->activate( $normalized_key );

		if ( is_wp_error( $result ) ) {
			if ( is_string( $replaced_key ) && '' !== $replaced_key ) {
				$this->restore_previous_activation( $replaced_key );
			}

			return $result;
		}

		$payload = $this->transitioner->transitionToActive( $result, $normalized_key );

		$this->emit_debug(
			'activated',
			array(
				'keyPrefix' => $payload['keyPrefix'],
				'status'    => $payload['status'],
			)
		);

		return $this->build_public_payload( $payload );
	}

	/**
	 * Validates a stored or provided license key and updates the local state.
	 *
	 * @param string|null $license_key Optional license key override.
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, hasKey: bool, keyPrefix: ?string, serverConfigured: bool}|WP_Error
	 */
	public function validate( ?string $license_key = null ) {
		$key = null !== $license_key ? $this->normalize_key( $license_key ) : $this->settings_repository->get_license_key();

		if ( '' === $key ) {
			return new WP_Error(
				'license_missing_key',
				'No license key is stored.',
				array(
					'status' => 400,
				)
			);
		}

		$result = $this->client->validate( $key );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		if ( isset( $result['webhook_secret'] ) && is_string( $result['webhook_secret'] ) ) {
			$this->settings_repository->save_webhook_secret( $result['webhook_secret'] );
		}

		$payload = $this->transitioner->buildPayloadFromRemote( $result, $key );

		if ( $this->transitioner->isGraceState( $payload ) ) {
			$grace_status                  = $this->grace_period->sync_grace_days_remaining( (int) $payload['graceDaysRemaining'] );
			$payload['graceDaysRemaining'] = $grace_status['graceDaysRemaining'];
		} else {
			$this->grace_period->clear_grace();
		}

		$this->cache->set( $payload );

		$this->emit_debug(
			'validated',
			array(
				'keyPrefix' => $payload['keyPrefix'],
				'status'    => $payload['status'],
			)
		);

		return $this->build_public_payload( $payload );
	}

	/**
	 * Deactivates the stored license locally and remotely.
	 *
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, hasKey: bool, keyPrefix: ?string, serverConfigured: bool}|WP_Error
	 */
	public function deactivate() {
		$license_key = $this->settings_repository->get_license_key();

		if ( '' === $license_key ) {
			$this->cache->clear();
			$this->grace_period->clear_grace();
			return $this->get_status_payload();
		}

		$result = $this->client->deactivate( $license_key );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$this->settings_repository->clear_license_key();
		$this->cache->clear();
		$this->grace_period->clear_grace();

		$this->emit_debug(
			'deactivated',
			array(
				'keyPrefix' => substr( $license_key, 0, 8 ),
			)
		);

		return $this->get_status_payload();
	}

	/**
	 * Applies a verified webhook event to local license state.
	 *
	 * @param string               $event Event name.
	 * @param array<string, mixed> $data  Event payload.
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, hasKey: bool, keyPrefix: ?string, serverConfigured: bool}|WP_Error
	 */
	public function apply_webhook_event( string $event, array $data ) {
		$normalized_event = sanitize_text_field( $event );

		if ( 'license.expired' === $normalized_event ) {
			$current = $this->transitioner->transitionToExpired( $data );
			$this->emit_debug(
				'webhook_expired',
				array(
					'event'              => $normalized_event,
					'keyPrefix'          => $current['keyPrefix'],
					'graceDaysRemaining' => $current['graceDaysRemaining'],
				)
			);

			return $this->build_public_payload( $current );
		}

		if ( in_array( $normalized_event, array( 'license.suspended', 'license.cancelled' ), true ) ) {
			$disabled_state = $this->transitioner->transitionToDisabled();
			$this->emit_debug(
				'webhook_disabled',
				array(
					'event'     => $normalized_event,
					'keyPrefix' => $disabled_state['keyPrefix'],
				)
			);

			return $this->build_public_payload( $disabled_state );
		}

		return new WP_Error(
			'unsupported_webhook_event',
			'Unsupported webhook event.',
			array(
				'status' => 400,
				'event'  => $normalized_event,
			)
		);
	}

	/**
	 * Moves the current site into grace using the last cached feature set.
	 *
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, hasKey: bool, keyPrefix: ?string, serverConfigured: bool}
	 */
	public function enter_grace_state(): array {
		$payload = $this->transitioner->transitionToGrace();
		$this->emit_debug(
			'grace_started',
			array(
				'keyPrefix'          => $payload['keyPrefix'],
				'graceDaysRemaining' => $payload['graceDaysRemaining'],
			)
		);
		return $this->build_public_payload( $payload );
	}

	/**
	 * Moves the current site into a disabled state.
	 *
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, hasKey: bool, keyPrefix: ?string, serverConfigured: bool}
	 */
	public function enter_disabled_state(): array {
		$payload = $this->transitioner->transitionToDisabled();
		$this->emit_debug(
			'disabled',
			array(
				'keyPrefix' => $payload['keyPrefix'],
			)
		);
		return $this->build_public_payload( $payload );
	}

	/**
	 * Appends public metadata that does not live inside the transient.
	 *
	 * @param array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, keyPrefix: ?string, lastValidatedAt: ?string} $payload Base payload.
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, hasKey: bool, keyPrefix: ?string, serverConfigured: bool}
	 */
	private function build_public_payload( array $payload ): array {
		$builder = new LicensePayloadBuilder(
			$payload,
			$this->settings_repository->has_license_key(),
			$this->settings_repository->is_server_configured()
		);
		return $builder->build();
	}

	/**
	 * Returns whether the cached public payload should be refreshed before use.
	 *
	 * @param array{status: string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, keyPrefix: ?string, lastValidatedAt: ?string} $cached Cached payload.
	 */
	private function should_refresh_public_payload( array $cached ): bool {
		if ( $this->transitioner->isGraceState( $cached ) && ! $this->cache->has_fresh_transient() ) {
			return true;
		}

		return LicenseCache::STATUS_ACTIVE === $cached['status'] && $this->is_validation_stale( $cached['lastValidatedAt'] );
	}

	/**
	 * Returns whether a cached payload belongs to the currently stored key.
	 *
	 * @param array{keyPrefix: ?string} $cached     Cached payload.
	 * @param string|null               $key_prefix Current stored license key prefix.
	 */
	private function cache_matches_current_key( array $cached, ?string $key_prefix ): bool {
		if ( null === $cached['keyPrefix'] || null === $key_prefix ) {
			return false;
		}

		return hash_equals( $cached['keyPrefix'], $key_prefix );
	}

	/**
	 * Returns whether a cached validation timestamp is stale.
	 *
	 * @param string|null $last_validated_at UTC timestamp from the last successful validation.
	 */
	private function is_validation_stale( ?string $last_validated_at ): bool {
		if ( null === $last_validated_at || '' === $last_validated_at ) {
			return true;
		}

		$timestamp = strtotime( $last_validated_at . ' UTC' );

		if ( false === $timestamp ) {
			return true;
		}

		return ( time() - $timestamp ) >= DAY_IN_SECONDS;
	}

	/**
	 * Returns whether a validation failure should preserve grace access.
	 *
	 * @param WP_Error $error Validation error returned by the license client.
	 */
	private function is_recoverable_error( WP_Error $error ): bool {
		if ( in_array( $error->get_error_code(), array( 'license_request_failed', 'license_invalid_response' ), true ) ) {
			return true;
		}

		$data = $error->get_error_data();

		return is_array( $data ) && isset( $data['status'] ) && (int) $data['status'] >= 500;
	}

	/**
	 * Normalizes a license key before storage or signing.
	 *
	 * @param string $license_key Raw license key input.
	 */
	private function normalize_key( string $license_key ): string {
		$normalized = preg_replace( '/[^a-f0-9]/i', '', strtolower( sanitize_text_field( $license_key ) ) );

		return is_string( $normalized ) ? $normalized : '';
	}

	/**
	 * Refreshes the public payload from the remote server when cached data is stale.
	 *
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, hasKey: bool, keyPrefix: ?string, serverConfigured: bool}
	 */
	private function refresh_public_payload(): array {
		$result = $this->validate();

		if ( is_wp_error( $result ) ) {
			if ( $this->is_recoverable_error( $result ) ) {
				return $this->build_public_payload( $this->transitioner->transitionToGrace() );
			}

			return $this->build_public_payload( $this->transitioner->transitionToDisabled() );
		}

		return $result;
	}

	/**
	 * Deactivates the previously stored site activation before swapping keys.
	 *
	 * @param string $license_key Previously stored normalized license key.
	 * @return true|WP_Error
	 */
	private function release_previous_activation( string $license_key ) {
		$result = $this->client->deactivate( $license_key );

		if ( ! is_wp_error( $result ) ) {
			return true;
		}

		if ( in_array( $result->get_error_code(), array( 'not_activated', 'license_not_found' ), true ) ) {
			return true;
		}

		$data = $result->get_error_data();

		return new WP_Error(
			'license_replace_failed',
			'The current site key could not be released before activating a new one.',
			array(
				'status'              => is_array( $data ) && isset( $data['status'] ) ? (int) $data['status'] : 409,
				'previous_key_prefix' => substr( $license_key, 0, 8 ),
			)
		);
	}

	/**
	 * Attempts to restore the previous activation after a failed key swap.
	 *
	 * @param string $license_key Previously active normalized license key.
	 */
	private function restore_previous_activation( string $license_key ): void {
		$result = $this->client->activate( $license_key );

		if ( is_wp_error( $result ) ) {
			$this->cache->clear();
			$this->grace_period->clear_grace();
			return;
		}

		$this->transitioner->transitionToActive( $result, $license_key );
	}

	/**
	 * Emits a debug action without exposing the full license key.
	 *
	 * @param string               $event   Debug event name.
	 * @param array<string, mixed> $context Context payload.
	 */
	private function emit_debug( string $event, array $context ): void {
		do_action( 'wp_react_ui_license_debug', $event, $context );
	}
}
