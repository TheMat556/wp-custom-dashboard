<?php
/**
 * AUTO-GENERATED from contracts/source. Do not edit.
 */

declare(strict_types=1);

namespace WpReactUi\Contracts\Generated;

final class Dtos {
	public const SCHEMAS = array(
		'dto/activity.query' => array(
			'title' => 'ActivityQuery',
			'property_keys' => array(
				'page',
				'perPage',
				'userId',
				'action'
			)
		),
		'dto/activity.response' => array(
			'title' => 'ActivityResponse',
			'property_keys' => array(
				'entries',
				'total',
				'page',
				'perPage'
			)
		),
		'dto/branding.request' => array(
			'title' => 'BrandingRequest',
			'property_keys' => array(
				'lightLogoId',
				'darkLogoId',
				'longLogoId',
				'useLongLogo',
				'primaryColor',
				'fontPreset',
				'openInNewTabPatterns'
			)
		),
		'dto/branding.response' => array(
			'title' => 'BrandingResponse',
			'property_keys' => array(
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
		'dto/dashboard.response' => array(
			'title' => 'DashboardResponse',
			'property_keys' => array(
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
		'dto/menu-counts.response' => array(
			'title' => 'MenuCountsResponse',
			'property_keys' => array(
				'counts'
			)
		),
		'dto/menu-item' => array(
			'title' => 'MenuItem',
			'property_keys' => array(
				'label',
				'slug',
				'icon',
				'count',
				'cap',
				'children'
			)
		),
		'dto/menu.response' => array(
			'title' => 'MenuResponse',
			'property_keys' => array(
				'menu'
			)
		),
		'dto/preferences.request' => array(
			'title' => 'PreferencesRequest',
			'property_keys' => array(
				'favorites',
				'recentPages',
				'density',
				'themePreset',
				'customPresetColor',
				'dashboardWidgetOrder',
				'hiddenWidgets',
				'highContrast',
				'sidebarCollapsed'
			)
		),
		'dto/preferences.response' => array(
			'title' => 'PreferencesResponse',
			'property_keys' => array(
				'preferences'
			)
		),
		'dto/submenu-item' => array(
			'title' => 'SubMenuItem',
			'property_keys' => array(
				'label',
				'slug',
				'count',
				'cap'
			)
		),
		'dto/theme.request' => array(
			'title' => 'ThemeRequest',
			'property_keys' => array(
				'theme'
			)
		),
		'dto/theme.response' => array(
			'title' => 'ThemeResponse',
			'property_keys' => array(
				'theme'
			)
		)
	);
}
