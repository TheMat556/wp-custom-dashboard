<?php
/**
 * Menu read service for REST transport extraction.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Services;

defined( 'ABSPATH' ) || exit;

/**
 * Returns the current menu payload through the legacy repository.
 */
final class MenuReadService {

	/**
	 * Returns the REST-ready menu payload.
	 *
	 * @return array{menu: array}
	 */
	public function get_menu_payload(): array {
		return array(
			'menu' => \WP_React_UI_Menu_Repository::get_menu_data(),
		);
	}
}
