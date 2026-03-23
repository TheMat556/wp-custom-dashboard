<?php
/**
 * Menu repository for WP React UI.
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Builds the admin menu payload shipped to the React shell.
 */
class WP_React_UI_Menu_Repository {

	/**
	 * Returns the current user's menu payload, using cache when available.
	 *
	 * @return array
	 */
	public static function get_menu_data(): array {
		$user_id = get_current_user_id();
		$cached  = WP_React_UI_Menu_Cache::get( $user_id );

		if ( null !== $cached ) {
			return $cached;
		}

		global $menu, $submenu;

		$items = self::build_menu_items(
			(array) $menu,
			(array) $submenu,
			self::are_comments_enabled()
		);

		WP_React_UI_Menu_Cache::put( $user_id, $items );
		return $items;
	}

	/**
	 * Converts the native WordPress admin menu arrays into shell menu items.
	 *
	 * @param array $menu Native top-level menu.
	 * @param array $submenu Native submenu map.
	 * @param bool  $comments_enabled Whether comments UI should be included.
	 * @return array
	 */
	private static function build_menu_items( array $menu, array $submenu, bool $comments_enabled ): array {
		$items = array();

		foreach ( $menu as $item ) {
			if ( empty( $item[0] ) ) {
				continue;
			}

			if ( ! $comments_enabled && isset( $item[2] ) && 'edit-comments.php' === $item[2] ) {
				continue;
			}

			['label' => $label, 'count' => $count] = self::parse_menu_label( $item[0] );
			if ( empty( $label ) ) {
				continue;
			}

			$slug     = $item[2];
			$children = array();

			if ( ! empty( $submenu[ $slug ] ) ) {
				foreach ( $submenu[ $slug ] as $sub ) {
					if ( empty( $sub[0] ) ) {
						continue;
					}

					['label' => $sub_label, 'count' => $sub_count] = self::parse_menu_label( $sub[0] );
					if ( empty( $sub_label ) ) {
						continue;
					}

					$children[] = array(
						'label' => $sub_label,
						'count' => $sub_count,
						'slug'  => $sub[2],
						'cap'   => $sub[1],
					);
				}
			}

			$items[] = array(
				'label'    => $label,
				'count'    => $count,
				'slug'     => $slug,
				'icon'     => $item[6] ?? '',
				'cap'      => $item[1],
				'children' => $children,
			);
		}

		return $items;
	}

	/**
	 * Returns true if any public post type supports comments.
	 *
	 * @return bool
	 */
	private static function are_comments_enabled(): bool {
		$post_types = get_post_types( array( 'public' => true ) );

		foreach ( $post_types as $post_type ) {
			if ( post_type_supports( $post_type, 'comments' ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Parses a raw WordPress menu label into a clean label and optional count.
	 *
	 * @param string $raw Raw menu label string possibly containing HTML span counts.
	 * @return array{ label: string, count: int|null }
	 */
	private static function parse_menu_label( string $raw ): array {
		$count = null;

		if ( preg_match( '/<span[^>]*>\s*(\d+)\s*<\/span>/i', $raw, $matches ) ) {
			$parsed = (int) $matches[1];
			if ( $parsed > 0 ) {
				$count = $parsed;
			}
		}

		$cleaned = preg_replace( '/<span[^>]*>.*?<\/span>/is', '', $raw );
		$cleaned = wp_strip_all_tags( $cleaned );
		$cleaned = trim( preg_replace( '/\s+/', ' ', $cleaned ) );

		return array(
			'label' => $cleaned,
			'count' => $count,
		);
	}
}
