<?php
/**
 * AUTO-GENERATED from contracts/source. Do not edit.
 */

declare(strict_types=1);

namespace WpReactUi\Contracts\Generated;

final class Routes {
	public const REST_NAMESPACE = 'wp-react-ui/v1';

	public const DEFINITIONS = array(
		'/menu' => array(
			'name' => 'menu',
			'methods' => array(
				'GET'
			),
			'permission' => 'read',
			'featureFlag' => null,
			'requestSchema' => null,
			'requestKeys' => array(),
			'responseSchema' => 'dto/menu.response',
			'responseKeys' => array(
				'menu'
			)
		),
		'/theme' => array(
			'name' => 'theme',
			'methods' => array(
				'GET',
				'POST'
			),
			'permission' => 'authenticated',
			'featureFlag' => null,
			'requestSchema' => 'dto/theme.request',
			'requestKeys' => array(
				'theme'
			),
			'responseSchema' => 'dto/theme.response',
			'responseKeys' => array(
				'theme'
			)
		),
		'/branding' => array(
			'name' => 'branding',
			'methods' => array(
				'GET',
				'POST'
			),
			'permission' => 'manage_options',
			'featureFlag' => 'brandingSettings',
			'requestSchema' => 'dto/branding.request',
			'requestKeys' => array(
				'lightLogoId',
				'darkLogoId',
				'longLogoId',
				'useLongLogo',
				'primaryColor',
				'fontPreset',
				'openInNewTabPatterns'
			),
			'responseSchema' => 'dto/branding.response',
			'responseKeys' => array(
				'lightLogoId',
				'lightLogoUrl',
				'darkLogoId',
				'darkLogoUrl',
				'longLogoId',
				'longLogoUrl',
				'useLongLogo',
				'primaryColor',
				'fontPreset',
				'openInNewTabPatterns'
			)
		),
		'/preferences' => array(
			'name' => 'preferences',
			'methods' => array(
				'GET',
				'POST'
			),
			'permission' => 'authenticated',
			'featureFlag' => 'preferencesSync',
			'requestSchema' => 'dto/preferences.request',
			'requestKeys' => array(
				'favorites',
				'recentPages',
				'density',
				'themePreset',
				'customPresetColor',
				'dashboardWidgetOrder',
				'hiddenWidgets',
				'highContrast',
				'sidebarCollapsed'
			),
			'responseSchema' => 'dto/preferences.response',
			'responseKeys' => array(
				'preferences'
			)
		),
		'/menu-counts' => array(
			'name' => 'menuCounts',
			'methods' => array(
				'GET'
			),
			'permission' => 'read',
			'featureFlag' => 'menuCounts',
			'requestSchema' => null,
			'requestKeys' => array(),
			'responseSchema' => 'dto/menu-counts.response',
			'responseKeys' => array(
				'counts'
			)
		),
		'/dashboard' => array(
			'name' => 'dashboard',
			'methods' => array(
				'GET'
			),
			'permission' => 'read',
			'featureFlag' => 'dashboard',
			'requestSchema' => null,
			'requestKeys' => array(),
			'responseSchema' => 'dto/dashboard.response',
			'responseKeys' => array(
				'atAGlance',
				'siteHealth',
				'pendingUpdates',
				'visitorTrend',
				'countryStats',
				'siteSpeed',
				'pagesOverview',
				'actionItems',
				'seoOverview',
				'seoBasics',
				'legalCompliance',
				'businessFunctions',
				'onboardingChecklist',
				'siteReadinessScore',
				'calendarPreview'
			)
		),
		'/activity' => array(
			'name' => 'activity',
			'methods' => array(
				'GET'
			),
			'permission' => 'manage_options',
			'featureFlag' => 'activityLog',
			'requestSchema' => 'dto/activity.query',
			'requestKeys' => array(
				'page',
				'perPage',
				'userId',
				'action'
			),
			'responseSchema' => 'dto/activity.response',
			'responseKeys' => array(
				'entries',
				'total',
				'page',
				'perPage'
			)
		)
	);

	public static function route_paths(): array {
		return array_keys( self::DEFINITIONS );
	}
}
