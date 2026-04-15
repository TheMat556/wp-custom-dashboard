<?php

declare(strict_types=1);

/**
 * AUTO-GENERATED from contracts/source. Do not edit.
 */

namespace WpReactUi\Contracts\Generated;

defined( 'ABSPATH' ) || exit;

final class FeatureFlags {
	public const FLAGS = array(
		'dashboard' => array(
			'default' => true,
			'description' => 'Dashboard data and widgets.'
		),
		'brandingSettings' => array(
			'default' => true,
			'description' => 'Branding settings UI and transport.'
		),
		'activityLog' => array(
			'default' => true,
			'description' => 'Activity log transport and admin UI.'
		),
		'menuCounts' => array(
			'default' => true,
			'description' => 'Menu badge count refresh endpoint.'
		),
		'preferencesSync' => array(
			'default' => true,
			'description' => 'Shell preference sync transport.'
		),
		'shellRoutes' => array(
			'default' => true,
			'description' => 'Plugin-provided shell route registration.'
		)
	);

	public const DEFAULTS = array(
		'dashboard' => true,
		'brandingSettings' => true,
		'activityLog' => true,
		'menuCounts' => true,
		'preferencesSync' => true,
		'shellRoutes' => true
	);
}
