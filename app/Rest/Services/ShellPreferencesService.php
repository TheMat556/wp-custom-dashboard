<?php
/**
 * Shell preferences service for REST transport extraction.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Services;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes the current user's shell preferences.
 */
final class ShellPreferencesService {

	private const META_KEY = 'wp_react_ui_preferences';

	private const VALID_WIDGET_SIZES = array( '1x', '2x', 'half', 'full' );

	private const DEFAULT_COLUMNS = 3;

	private const LEGACY_WIDGET_REPLACEMENTS = array(
		'summary-tiles' => array( 'kpi-website', 'kpi-visitors', 'kpi-updates', 'kpi-speed', 'kpi-conversions' ),
	);

	/**
	 * Maps template keys to their canonical instance keys during order normalization.
	 */
	private const TEMPLATE_REWRITES = array(
		'kpi-container' => 'kpi-container::__default__',
	);

	/**
	 * Returns the current preferences payload.
	 *
	 * @return array{preferences: array}
	 */
	public function get_preferences_payload(): array {
		$raw   = get_user_meta( get_current_user_id(), self::META_KEY, true );
		$prefs = is_array( $raw ) ? self::migrate_legacy_keys( $raw ) : array();

		// Persist migration result if the normalized shape differs from the stored value.
		if ( is_array( $raw ) && $raw !== $prefs ) {
			update_user_meta( get_current_user_id(), self::META_KEY, $prefs );
		}

		return array( 'preferences' => $prefs );
	}

	/**
	 * Merges and saves shell preferences.
	 *
	 * @param array $input JSON-decoded preferences object.
	 * @return array{preferences: array}
	 */
	public function save_preferences( array $input ): array {
		$user_id  = get_current_user_id();
		$existing = get_user_meta( $user_id, self::META_KEY, true );
		$prefs    = is_array( $existing ) ? self::migrate_legacy_keys( $existing ) : array();

		$string_keys = array( 'density', 'themePreset', 'customPresetColor' );
		$bool_keys   = array( 'sidebarCollapsed', 'highContrast' );
		$array_keys  = array( 'favorites', 'recentPages', 'dashboardWidgetOrder', 'hiddenWidgets' );
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

		// kpiContainerInstances is a nested record — store as-is (sanitize keys/values).
		if ( isset( $input['kpiContainerInstances'] ) && is_array( $input['kpiContainerInstances'] ) ) {
			$clean = array();
			foreach ( $input['kpiContainerInstances'] as $instance_id => $cfg ) {
				$id = sanitize_text_field( (string) $instance_id );
				if ( ! is_array( $cfg ) ) {
					continue;
				}
				$order = isset( $cfg['order'] ) && is_array( $cfg['order'] )
					? self::sanitize_string_array( $cfg['order'] )
					: array();
				$columns = isset( $cfg['columns'] ) && is_int( $cfg['columns'] ) && $cfg['columns'] >= 2 && $cfg['columns'] <= 5
					? $cfg['columns']
					: self::DEFAULT_COLUMNS;
				$clean[ $id ] = array(
					'order'   => $order,
					'columns' => $columns,
				);
			}
			$prefs['kpiContainerInstances'] = $clean;
		}

		update_user_meta( $user_id, self::META_KEY, $prefs );

		return array( 'preferences' => $prefs );
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
				if ( isset( self::LEGACY_WIDGET_REPLACEMENTS[ $k ] ) ) {
					foreach ( self::LEGACY_WIDGET_REPLACEMENTS[ $k ] as $r ) {
						$migrated_sizes[ $r ] = $v;
					}
				} else {
					$migrated_sizes[ $k ] = $v;
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
				$order = isset( $cfg['order'] ) && is_array( $cfg['order'] )
					? self::sanitize_string_array( $cfg['order'] )
					: array();
				$columns = isset( $cfg['columns'] ) && is_int( $cfg['columns'] ) && $cfg['columns'] >= 2 && $cfg['columns'] <= 5
					? $cfg['columns']
					: self::DEFAULT_COLUMNS;
				$normalized[ $instance_id ] = array(
					'order'   => $order,
					'columns' => $columns,
				);
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
}
