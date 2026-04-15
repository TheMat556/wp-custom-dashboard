<?php
/**
 * Local grace-period state machine.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License;

use WpReactUi\License\Contracts\OptionsRepositoryInterface;

defined( 'ABSPATH' ) || exit;

final class LicenseGracePeriod {
	private const OPTION_NAME = 'wp_react_ui_license_grace_started_at';
	private const GRACE_DAYS  = 7;

	private OptionsRepositoryInterface $options;

	public function __construct(
		?OptionsRepositoryInterface $options = null
	) {
		if ( null === $options ) {
			$options = LicenseServiceContainer::getInstance()->getOptionsRepository();
		}
		$this->options = $options;
	}

	/**
	 * Starts the grace period and returns the current grace snapshot.
	 *
	 * @return array{mode: string, startedAt: ?int, graceUntil: ?int, graceDaysRemaining: int}
	 */
	public function start_grace(): array {
		$started_at = absint( $this->options->get( self::OPTION_NAME, 0 ) );

		if ( $started_at <= 0 ) {
			$started_at = time();
			$this->options->update( self::OPTION_NAME, $started_at );
		}

		return $this->get_status();
	}

	/**
	 * Synchronizes the local grace window to a remotely reported remaining-day count.
	 *
	 * @param int $grace_days_remaining Remaining grace days reported by the license server.
	 * @return array{mode: string, startedAt: ?int, graceUntil: ?int, graceDaysRemaining: int}
	 */
	public function sync_grace_days_remaining( int $grace_days_remaining ): array {
		$remaining = max( 0, min( self::GRACE_DAYS, $grace_days_remaining ) );

		if ( 0 === $remaining ) {
			$this->clear_grace();
			return $this->get_status();
		}

		$started_at = time() - ( ( self::GRACE_DAYS - $remaining ) * DAY_IN_SECONDS );
		$this->options->update( self::OPTION_NAME, $started_at );

		return $this->get_status();
	}

	/**
	 * Clears the grace state.
	 */
	public function clear_grace(): bool {
		return $this->options->delete( self::OPTION_NAME );
	}

	/**
	 * Returns the current grace-state snapshot.
	 *
	 * @return array{mode: string, startedAt: ?int, graceUntil: ?int, graceDaysRemaining: int}
	 */
	public function get_status(): array {
		$started_at = absint( $this->options->get( self::OPTION_NAME, 0 ) );

		if ( $started_at <= 0 ) {
			return array(
				'mode'               => 'normal',
				'startedAt'          => null,
				'graceUntil'         => null,
				'graceDaysRemaining' => 0,
			);
		}

		$grace_until = $started_at + ( self::GRACE_DAYS * DAY_IN_SECONDS );
		$now         = time();

		if ( $now >= $grace_until ) {
			return array(
				'mode'               => 'disabled',
				'startedAt'          => $started_at,
				'graceUntil'         => $grace_until,
				'graceDaysRemaining' => 0,
			);
		}

		$remaining_seconds = max( 0, $grace_until - $now );
		$remaining_days    = (int) ceil( $remaining_seconds / DAY_IN_SECONDS );

		return array(
			'mode'               => 'grace',
			'startedAt'          => $started_at,
			'graceUntil'         => $grace_until,
			'graceDaysRemaining' => $remaining_days,
		);
	}
}
