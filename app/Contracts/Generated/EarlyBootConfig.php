<?php

declare(strict_types=1);

/**
 * AUTO-GENERATED from contracts/source. Do not edit.
 */

namespace WpReactUi\Contracts\Generated;

defined( 'ABSPATH' ) || exit;

final class EarlyBootConfig {
	public const DEFAULTS = array(
		'layout' => array(
			'mobileBreakpoint' => 768,
			'collapsedStorageKey' => 'wp-react-sidebar-collapsed',
			'sidebarWidths' => array(
				'expanded' => 240,
				'collapsed' => 64,
				'mobile' => 0
			)
		),
		'theme' => array(
			'storageKey' => 'wp-react-ui-theme'
		)
	);
}
