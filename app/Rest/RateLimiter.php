<?php
/**
 * Transient-based rate limiter for REST API endpoints.
 *
 * Keys authenticated requests by user ID; unauthenticated requests by IP.
 * Uses WordPress transients so counters expire automatically after WINDOW seconds.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest;

defined( 'ABSPATH' ) || exit;

final class RateLimiter {

	/** Rolling window duration in seconds. */
	private const WINDOW = 60;

	/** Maximum chat messages per user per minute. */
	public const LIMIT_CHAT_SEND = 20;

	/** Maximum license activation attempts per user per minute. */
	public const LIMIT_LICENSE_ACTIVATE = 5;

	/** Maximum preferences saves per user per minute. */
	public const LIMIT_PREFERENCES_SAVE = 30;

	/**
	 * Checks whether the caller is within the allowed rate for an action.
	 *
	 * Increments the transient counter by 1 on every call that is still under
	 * the limit. Returns false without incrementing when the limit is reached.
	 *
	 * @param string $action  Unique action identifier (e.g. 'chat_send').
	 * @param int    $limit   Maximum allowed calls within WINDOW seconds.
	 * @param int    $user_id Authenticated user ID; 0 falls back to remote IP.
	 * @return bool True if the request is within the limit, false otherwise.
	 */
	public static function check( string $action, int $limit, int $user_id = 0 ): bool {
		$identity = $user_id > 0 ? (string) $user_id : ( $_SERVER['REMOTE_ADDR'] ?? '' );
		$key      = 'wp_react_ui_rl_' . md5( $action . '_' . $identity );
		$current  = (int) get_transient( $key );

		if ( $current >= $limit ) {
			return false;
		}

		set_transient( $key, $current + 1, self::WINDOW );
		return true;
	}

	/**
	 * Enforces the rate limit for the current user, returning a 429 WP_Error on breach.
	 *
	 * @param string $action Unique action identifier (e.g. 'chat_send').
	 * @param int    $limit  Maximum allowed calls within WINDOW seconds.
	 * @return true|\WP_Error True if within limit, WP_Error with status 429 otherwise.
	 */
	public static function enforce( string $action, int $limit ): true|\WP_Error {
		$uid = get_current_user_id();

		if ( ! self::check( $action, $limit, $uid ) ) {
			return new \WP_Error(
				'rate_limited',
				'Too many requests. Please wait before trying again.',
				array( 'status' => 429 )
			);
		}

		return true;
	}
}
