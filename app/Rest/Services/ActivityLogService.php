<?php
/**
 * Activity log service for REST transport extraction.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Services;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and filters the activity log option for REST responses.
 */
final class ActivityLogService {

	/**
	 * Returns a paginated activity payload.
	 *
	 * @param int         $page Current page number.
	 * @param int         $per_page Page size.
	 * @param int|null    $user_id Optional user filter.
	 * @param string|null $action Optional action filter.
	 * @return array{entries: array, total: int, page: int, perPage: int}
	 */
	public function get_activity_payload( int $page, int $per_page, ?int $user_id, ?string $action ): array {
		$all = get_option( \WP_React_UI_Activity_Log::OPTION_KEY, array() );

		if ( ! is_array( $all ) ) {
			$all = array();
		}

		if ( null !== $user_id ) {
			$all = array_filter(
				$all,
				static fn( array $entry ): bool => isset( $entry['user_id'] ) && (int) $entry['user_id'] === $user_id
			);
		}

		if ( null !== $action ) {
			$all = array_filter(
				$all,
				static fn( array $entry ): bool => isset( $entry['action'] ) && $entry['action'] === $action
			);
		}

		$all     = array_values( $all );
		$total   = count( $all );
		$offset  = ( $page - 1 ) * $per_page;
		$entries = array_slice( $all, $offset, $per_page );

		return array(
			'entries' => $entries,
			'total'   => $total,
			'page'    => $page,
			'perPage' => $per_page,
		);
	}
}
