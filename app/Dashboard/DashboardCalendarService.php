<?php
/**
 * Dashboard calendar preview service.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Dashboard;

defined( 'ABSPATH' ) || exit;

/**
 * Builds the upcoming bookings preview payload.
 */
final class DashboardCalendarService {

	/**
	 * Returns upcoming bookings from the booking plugin, if available.
	 *
	 * @return array|null
	 */
	public function get_calendar_preview(): ?array {
		global $wpdb;

		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		if ( ! is_plugin_active( 'h-bricks-elements/plugin.php' ) ) {
			return null;
		}

		$table = $wpdb->prefix . 'hbe_bookings';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.NoCaching
		if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) !== $table ) {
			return null;
		}

		$today          = current_time( 'Y-m-d' );
		$start_of_today = $today . ' 00:00:00';
		$in_7days       = gmdate( 'Y-m-d H:i:s', strtotime( '+7 days', strtotime( $today . ' 00:00:00' ) ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$bookings = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, calendar_id, customer_name, start_datetime, end_datetime, status
				 FROM %i
				 WHERE start_datetime >= %s AND start_datetime <= %s AND status != 'cancelled'
				 ORDER BY start_datetime ASC LIMIT 50",
				$table,
				$start_of_today,
				$in_7days
			),
			ARRAY_A
		);

		if ( empty( $bookings ) ) {
			return array(
				'available'  => true,
				'upcoming'   => array(),
				'totalToday' => 0,
				'weekDays'   => $this->build_empty_week( $today ),
			);
		}

		$now         = current_time( 'mysql' );
		$today_count = 0;
		$upcoming    = array();
		$by_date     = array();

		foreach ( $bookings as $booking ) {
			$start_date = substr( $booking['start_datetime'], 0, 10 );
			$item       = array(
				'id'           => (int) $booking['id'],
				'customerName' => $booking['customer_name'],
				'startDate'    => $booking['start_datetime'],
				'endDate'      => $booking['end_datetime'],
				'status'       => $booking['status'],
				'calendarId'   => (int) $booking['calendar_id'],
				'isToday'      => $start_date === $today,
			);

			if ( $start_date === $today ) {
				$today_count++;
			}

			if ( $booking['start_datetime'] >= $now ) {
				$upcoming[] = $item;
			}

			if ( ! isset( $by_date[ $start_date ] ) ) {
				$by_date[ $start_date ] = array();
			}

			$by_date[ $start_date ][] = $item;
		}

		$week_days = array();
		for ( $i = 0; $i < 7; $i++ ) {
			$timestamp = strtotime( "+{$i} days", strtotime( $today . ' 00:00:00' ) );
			$date      = gmdate( 'Y-m-d', $timestamp );
			$week_days[] = array(
				'date'     => $date,
				'dayLabel' => gmdate( 'D', $timestamp ),
				'dayNum'   => (int) gmdate( 'j', $timestamp ),
				'month'    => gmdate( 'M', $timestamp ),
				'isToday'  => $date === $today,
				'bookings' => $by_date[ $date ] ?? array(),
				'count'    => isset( $by_date[ $date ] ) ? count( $by_date[ $date ] ) : 0,
			);
		}

		return array(
			'available'  => true,
			'upcoming'   => $upcoming,
			'totalToday' => $today_count,
			'weekDays'   => $week_days,
		);
	}

	/**
	 * Returns the number of bookings in the last 30 days (status != cancelled).
	 *
	 * @return int|null Null when the booking plugin or its table is unavailable.
	 */
	public function get_bookings_30d_count(): ?int {
		global $wpdb;

		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		if ( ! is_plugin_active( 'h-bricks-elements/plugin.php' ) ) {
			return null;
		}

		$table = $wpdb->prefix . 'hbe_bookings';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.NoCaching
		if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) !== $table ) {
			return null;
		}

		$since = gmdate( 'Y-m-d H:i:s', strtotime( '-30 days', current_time( 'timestamp' ) ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM %i WHERE start_datetime >= %s AND status != 'cancelled'",
				$table,
				$since
			)
		);
	}

	/**
	 * Returns an empty seven-day calendar payload.
	 *
	 * @param string $today Current site-local day.
	 * @return array
	 */
	private function build_empty_week( string $today ): array {
		$week_days = array();

		for ( $i = 0; $i < 7; $i++ ) {
			$timestamp = strtotime( "+{$i} days", strtotime( $today . ' 00:00:00' ) );
			$date      = gmdate( 'Y-m-d', $timestamp );
			$week_days[] = array(
				'date'     => $date,
				'dayLabel' => gmdate( 'D', $timestamp ),
				'dayNum'   => (int) gmdate( 'j', $timestamp ),
				'month'    => gmdate( 'M', $timestamp ),
				'isToday'  => $date === $today,
				'bookings' => array(),
				'count'    => 0,
			);
		}

		return $week_days;
	}
}
