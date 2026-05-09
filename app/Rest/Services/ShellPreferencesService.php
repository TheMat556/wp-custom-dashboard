<?php
/**
 * Shell preferences service for REST transport extraction.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Services;

defined( 'ABSPATH' ) || exit;

use WpReactUi\Rest\Services\ShellPreferencesDto;

/**
 * Reads and writes the current user's shell preferences.
 */
final class ShellPreferencesService {

	private const KPI_CONTAINER_INSTANCE_PREFIX = 'kpi-container::';

	private const META_KEY = 'wp_react_ui_preferences';

	private const VALID_WIDGET_SIZES = array( '1x', '2x', 'half', 'full' );

	private const DEFAULT_COLUMNS = 3;

	/**
	 * @todo Remove after 2026-06-01
	 */
	private const LEGACY_WIDGET_REPLACEMENTS = array(
		'summary-tiles' => array( 'kpi-website', 'kpi-visitors', 'kpi-updates', 'kpi-speed', 'kpi-conversions' ),
	);

	/**
	 * Maps template keys to their canonical instance keys during order normalization.
	 */
	private const TEMPLATE_REWRITES = array(
		'kpi-container' => self::KPI_CONTAINER_INSTANCE_PREFIX . '__default__',
	);

	/**
	 * Returns the current preferences payload.
	 *
	 * @return ShellPreferencesDto
	 */
	public function get_preferences_payload(): ShellPreferencesDto {
		$raw   = get_user_meta( get_current_user_id(), self::META_KEY, true );
		$prefs = is_array( $raw ) ? self::migrate_legacy_keys( $raw ) : array();
		return new ShellPreferencesDto( $prefs );
	}

	/**
	 * Merges and saves shell preferences.
	 *
	 * @param array $input JSON-decoded preferences object.
	 * @return ShellPreferencesDto
	 */
	public function save_preferences( array $input ): ShellPreferencesDto {
		$user_id  = get_current_user_id();
		$existing = get_user_meta( $user_id, self::META_KEY, true );
		$prefs    = is_array( $existing ) ? self::migrate_legacy_keys( $existing ) : array();

		$string_keys = array( 'density', 'themePreset', 'customPresetColor' );
		$bool_keys   = array( 'sidebarCollapsed', 'highContrast' );
		$array_keys  = array( 'favorites', 'dashboardWidgetOrder', 'hiddenWidgets' );
		$record_keys = array( 'dashboardWidgetSizes' );

		foreach ( $string_keys as $key ) {
			if ( isset( $input[ $key ] ) ) {
				$prefs[ $key ] = sanitize_text_field( $input[ $key ] );
			}
		}

		foreach ( $bool_keys as $key ) {
			if ( isset( $input[ $key ] ) ) {
				$prefs[ $key ] = (bool) $input[ $key ];
			}
		}

		foreach ( $array_keys as $key ) {
			if ( isset( $input[ $key ] ) && is_array( $input[ $key ] ) ) {
				$prefs[ $key ] = self::sanitize_string_array( $input[ $key ] );
			}
		}

		// Cap list-like fields to prevent ballooning user_meta.
		if ( isset( $prefs['favorites'] ) && is_array( $prefs['favorites'] ) ) {
			$prefs['favorites'] = array_slice( $prefs['favorites'], 0, 50 );
		}
		if ( isset( $prefs['dashboardWidgetOrder'] ) && is_array( $prefs['dashboardWidgetOrder'] ) ) {
			$prefs['dashboardWidgetOrder'] = array_slice( $prefs['dashboardWidgetOrder'], 0, 200 );
		}
		if ( isset( $prefs['hiddenWidgets'] ) && is_array( $prefs['hiddenWidgets'] ) ) {
			$prefs['hiddenWidgets'] = array_slice( $prefs['hiddenWidgets'], 0, 200 );
		}

		// recentPages is an array of objects with pageUrl, title, visitedAt — need special handling.
		if ( isset( $input['recentPages'] ) && is_array( $input['recentPages'] ) ) {
			$prefs['recentPages'] = self::sanitize_recent_pages( $input['recentPages'] );
		}
		if ( isset( $prefs['recentPages'] ) && is_array( $prefs['recentPages'] ) ) {
			$prefs['recentPages'] = array_slice( $prefs['recentPages'], 0, 200 );
		}

		foreach ( $record_keys as $key ) {
			if ( isset( $input[ $key ] ) && is_array( $input[ $key ] ) ) {
				$clean = array();
				foreach ( $input[ $key ] as $k => $v ) {
					if ( ! is_string( $v ) || ! in_array( $v, self::VALID_WIDGET_SIZES, true ) ) {
						continue;
					}
					$key_clean = sanitize_text_field( $k );
					if ( isset( self::LEGACY_WIDGET_REPLACEMENTS[ $key_clean ] ) ) {
						foreach ( self::LEGACY_WIDGET_REPLACEMENTS[ $key_clean ] as $r ) {
							$clean[ $r ] = $v;
						}
					} else {
						$clean[ $key_clean ] = $v;
					}
				}
				$prefs[ $key ] = $clean;
			}
		}
		if ( isset( $prefs['dashboardWidgetSizes'] ) && is_array( $prefs['dashboardWidgetSizes'] ) ) {
			$prefs['dashboardWidgetSizes'] = array_slice( $prefs['dashboardWidgetSizes'], 0, 200, true );
		}

		// kpiContainerInstances is a nested record — store as-is (sanitize keys/values).
		if ( isset( $input['kpiContainerInstances'] ) && is_array( $input['kpiContainerInstances'] ) ) {
			$clean = array();
			$count = 0;
			foreach ( $input['kpiContainerInstances'] as $instance_id => $cfg ) {
				if ( $count >= 50 ) {
					break;
				}
				$id = sanitize_text_field( (string) $instance_id );
				if ( ! is_array( $cfg ) ) {
					continue;
				}
				$clean[ $id ] = self::validate_kpi_container_config( $cfg, $instance_id );
				++$count;
			}
			$prefs['kpiContainerInstances'] = $clean;
		}

		update_user_meta( $user_id, self::META_KEY, $prefs );

		return new ShellPreferencesDto( $prefs );
	}

	/**
	 * Expands legacy widget keys (e.g. summary-tiles → 5 KPI keys) in a list,
	 * preserving order and de-duplicating.
	 *
	 * @param array $list List of widget keys.
	 * @return array
	 */
	private static function expand_legacy_keys_in_list( array $list ): array {
		$out = array();
		foreach ( $list as $key ) {
			if ( ! is_string( $key ) ) {
				continue;
			}
			if ( isset( self::TEMPLATE_REWRITES[ $key ] ) ) {
				$rewritten = self::TEMPLATE_REWRITES[ $key ];
				if ( ! in_array( $rewritten, $out, true ) ) {
					$out[] = $rewritten;
				}
			} elseif ( isset( self::LEGACY_WIDGET_REPLACEMENTS[ $key ] ) ) {
				foreach ( self::LEGACY_WIDGET_REPLACEMENTS[ $key ] as $replacement ) {
					if ( ! in_array( $replacement, $out, true ) ) {
						$out[] = $replacement;
					}
				}
			} elseif ( ! in_array( $key, $out, true ) ) {
				$out[] = $key;
			}
		}
		return $out;
	}

	/**
	 * Migrates legacy keys in a stored preferences array.
	 *
	 * @param array $prefs Raw stored preferences.
	 * @return array
	 */
	private static function migrate_legacy_keys( array $prefs ): array {
		if ( isset( $prefs['dashboardWidgetOrder'] ) && is_array( $prefs['dashboardWidgetOrder'] ) ) {
			$prefs['dashboardWidgetOrder'] = self::expand_legacy_keys_in_list( $prefs['dashboardWidgetOrder'] );
		}
		if ( isset( $prefs['hiddenWidgets'] ) && is_array( $prefs['hiddenWidgets'] ) ) {
			$prefs['hiddenWidgets'] = self::expand_legacy_keys_in_list( $prefs['hiddenWidgets'] );
		}
		if ( isset( $prefs['dashboardWidgetSizes'] ) && is_array( $prefs['dashboardWidgetSizes'] ) ) {
			$migrated_sizes = array();
			foreach ( $prefs['dashboardWidgetSizes'] as $k => $v ) {
				if ( ! is_string( $v ) || ! in_array( $v, self::VALID_WIDGET_SIZES, true ) ) {
					continue;
				}
				$safe_key = preg_replace( '/[^A-Za-z0-9_-]+/', '_', (string) $k );
				if ( isset( self::LEGACY_WIDGET_REPLACEMENTS[ $safe_key ] ) ) {
					foreach ( self::LEGACY_WIDGET_REPLACEMENTS[ $safe_key ] as $r ) {
						$migrated_sizes[ $r ] = $v;
					}
				} else {
					$migrated_sizes[ $safe_key ] = $v;
				}
			}
			$prefs['dashboardWidgetSizes'] = $migrated_sizes;
		}
		if ( isset( $prefs['kpiContainerInstances'] ) && is_array( $prefs['kpiContainerInstances'] ) ) {
			$normalized = array();
			foreach ( $prefs['kpiContainerInstances'] as $instance_id => $cfg ) {
				if ( ! is_array( $cfg ) ) {
					continue;
				}
				if ( isset( $cfg['order'] ) && is_array( $cfg['order'] ) ) {
					$cfg['order'] = self::expand_legacy_keys_in_list( $cfg['order'] );
				}
				$normalized[ $instance_id ] = self::validate_kpi_container_config( $cfg, $instance_id );
			}
			$prefs['kpiContainerInstances'] = $normalized;
		} elseif ( isset( $prefs['kpiContainerInstances'] ) ) {
			unset( $prefs['kpiContainerInstances'] );
		}
		return $prefs;
	}

	/**
	 * Recursively sanitizes all string values in a nested array.
	 *
	 * @param array $values The input array.
	 * @return array Sanitized copy.
	 */
	private static function sanitize_string_array( array $values ): array {
		$clean = array();
		foreach ( $values as $k => $v ) {
			if ( is_array( $v ) ) {
				$clean[ $k ] = self::sanitize_string_array( $v );
			} elseif ( is_string( $v ) ) {
				$clean[ $k ] = sanitize_text_field( $v );
			}
		}
		return $clean;
	}

	/**
	 * Sanitizes recent pages entries, preserving visitedAt numeric values.
	 *
	 * @param array $pages Array of recent page objects.
	 * @return array
	 */
	private static function sanitize_recent_pages( array $pages ): array {
		$clean = array();
		foreach ( $pages as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}
			$page_url   = isset( $item['pageUrl'] ) && is_string( $item['pageUrl'] )
				? sanitize_text_field( $item['pageUrl'] )
				: '';
			$title      = isset( $item['title'] ) && is_string( $item['title'] )
				? sanitize_text_field( $item['title'] )
				: '';
			$visited_at = isset( $item['visitedAt'] ) && is_numeric( $item['visitedAt'] )
				? (int) $item['visitedAt']
				: 0;
			if ( '' === $page_url && '' === $title ) {
				continue;
			}
			$clean[] = array(
				'pageUrl'   => $page_url,
				'title'     => $title,
				'visitedAt' => $visited_at,
			);
		}
		return $clean;
	}

	/**
	 * Normalizes a columns value, clamping to the valid range [2,5].
	 *
	 * @param mixed $columns Raw columns value.
	 * @return int Valid columns count.
	 */
	private static function normalize_columns( mixed $columns ): int {
		if ( is_numeric( $columns ) ) {
			$val = (int) $columns;
			if ( $val >= 2 && $val <= 5 ) {
				return $val;
			}
		}
		return self::DEFAULT_COLUMNS;
	}

	/**
	 * Validates and normalizes a single KPI container config.
	 *
	 * Sanitizes the order array, clamps columns to [2,5], and logs invalid
	 * column values. Used by both save_preferences and migrate_legacy_keys.
	 *
	 * @param array  $cfg         Raw container config with optional 'order' and 'columns' keys.
	 * @param string $instance_id Instance identifier for error logging.
	 * @return array{order: array, columns: int} Normalized config.
	 */
	private static function validate_kpi_container_config( array $cfg, string $instance_id ): array {
		$raw_order = isset( $cfg['order'] ) && is_array( $cfg['order'] ) ? $cfg['order'] : array();
		$order     = array_values(
			array_filter(
				array_map(
					function ( $v ) {
						return is_scalar( $v ) ? sanitize_text_field( (string) $v ) : null;
					},
					$raw_order
				),
				function ( $v ) {
					return null !== $v;
				}
			)
		);
		$columns = self::normalize_columns( $cfg['columns'] ?? null );

		if ( isset( $cfg['columns'] ) && self::normalize_columns( $cfg['columns'] ) !== $cfg['columns'] ) {
			$logged_value = is_scalar( $cfg['columns'] )
				? sanitize_text_field( (string) $cfg['columns'] )
				: 'non-scalar';
			error_log(
				sprintf(
					'[wp-react-ui] Invalid kpiContainerInstances columns value (%s) for instance %s, falling back to %d',
					$logged_value,
					$instance_id,
					self::DEFAULT_COLUMNS
				)
			);
		}

		return array(
			'order'   => $order,
			'columns' => $columns,
		);
	}
}
