/**
 * Shared chat feature constants.
 *
 * Keep MAX_MESSAGE_LENGTH in sync with app/Chat/ChatConfig.php.
 * If you change MAX_MESSAGE_LENGTH here you must update the PHP counterpart.
 */

/** Maximum allowed character length for a single chat message. */
export const CHAT_MAX_MESSAGE_LENGTH = 2000;

/**
 * Timeout in seconds sent with each long-poll request.
 * Capped at 25s server-side to stay within default PHP execution time limits.
 */
export const CHAT_LONG_POLL_TIMEOUT_SECONDS = 25;

/**
 * When true (default), the chat client uses an async long-poll loop instead of
 * a fixed setInterval. Set to false to fall back to the legacy short-poll path.
 */
export const CHAT_LONG_POLL_ENABLED = true;
