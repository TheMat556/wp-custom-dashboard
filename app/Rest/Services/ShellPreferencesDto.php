<?php
/**
 * Shell Preferences DTO for type-safe preference transport.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Services;

defined( 'ABSPATH' ) || exit;

/**
 * Data transfer object for shell preferences.
 */
final class ShellPreferencesDto implements \JsonSerializable {

	/**
	 * @param array $preferences Raw preferences array.
	 */
	public function __construct(
		public readonly array $preferences,
	) {}

	/**
	 * Creates a DTO from an associative array.
	 *
	 * @param array $data Raw data array with a 'preferences' key.
	 * @return self
	 */
	public static function from_array( array $data ): self {
		return new self(
			preferences: $data['preferences'] ?? array(),
		);
	}

	/**
	 * Converts back to an associative array.
	 *
	 * @return array{preferences: array}
	 */
	public function to_array(): array {
		return array( 'preferences' => $this->preferences );
	}

	/**
	 * JSON-serializable so rest_ensure_response serialises correctly.
	 *
	 * @return array{preferences: array}
	 */
	public function jsonSerialize(): array {
		return $this->to_array();
	}
}
