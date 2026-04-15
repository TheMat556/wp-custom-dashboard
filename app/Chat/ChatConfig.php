<?php
/**
 * Shared configuration constants for the native chat feature.
 *
 * Centralising these values ensures the PHP validation layer and the TypeScript
 * frontend enforce exactly the same limits. If you change a value here you must
 * also update src/features/chat/constants.ts to match.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Chat;

defined( 'ABSPATH' ) || exit;

final class ChatConfig {
	/** Maximum allowed character length for a single chat message. */
	public const MAX_MESSAGE_LENGTH = 2000;
}
