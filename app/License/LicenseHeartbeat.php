<?php
/**
 * Daily heartbeat scheduler and executor.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License;

use WP_Error;

defined( 'ABSPATH' ) || exit;

final class LicenseHeartbeat {
	public const CRON_HOOK = 'wp_react_ui_license_heartbeat';

	private LicenseManager $manager;
	private LicenseSettingsRepository $settings_repository;

	public function __construct(
		?LicenseManager $manager = null,
		?LicenseSettingsRepository $settings_repository = null
	) {
		$this->settings_repository = $settings_repository ?? new LicenseSettingsRepository();
		$this->manager             = $manager ?? new LicenseManager( null, null, $this->settings_repository );
	}

	/**
	 * Ensures the daily heartbeat event is scheduled.
	 */
	public function ensure_scheduled(): void {
		if ( wp_next_scheduled( self::CRON_HOOK ) ) {
			return;
		}

		wp_schedule_event( time() + DAY_IN_SECONDS, 'daily', self::CRON_HOOK );
	}

	/**
	 * Unschedules the heartbeat event.
	 */
	public function unschedule(): void {
		wp_clear_scheduled_hook( self::CRON_HOOK );
	}

	/**
	 * Executes the daily heartbeat.
	 */
	public function run(): void {
		$license_key = $this->settings_repository->get_license_key();

		if ( '' === $license_key ) {
			return;
		}

		$result = $this->manager->validate( $license_key );

		if ( ! is_wp_error( $result ) ) {
			do_action( 'wp_react_ui_license_heartbeat_result', 'validated', $result );
			return;
		}

		if ( $this->is_recoverable_error( $result ) ) {
			$grace_state = $this->manager->enter_grace_state();
			do_action( 'wp_react_ui_license_heartbeat_result', 'grace', $grace_state );
			return;
		}

		$disabled_state = $this->manager->enter_disabled_state();
		do_action( 'wp_react_ui_license_heartbeat_result', 'disabled', $disabled_state );
	}

	/**
	 * Returns whether a validation failure should enter grace instead of disabling.
	 *
	 * @param WP_Error $error Validation error returned by the license manager.
	 */
	private function is_recoverable_error( WP_Error $error ): bool {
		if ( in_array( $error->get_error_code(), array( 'license_request_failed', 'license_invalid_response' ), true ) ) {
			return true;
		}

		$data = $error->get_error_data();

		return is_array( $data ) && isset( $data['status'] ) && (int) $data['status'] >= 500;
	}
}
