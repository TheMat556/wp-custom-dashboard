<?php

declare(strict_types=1);

/**
 * AUTO-GENERATED from contracts/source. Do not edit.
 */

namespace WpReactUi\Contracts\Generated;

defined( 'ABSPATH' ) || exit;

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
		'dto/chat.bootstrap.request' => array(
			'title' => 'ChatBootstrapRequest',
			'property_keys' => array(
				'selectedThreadId'
			)
		),
		'dto/chat.bootstrap.response' => array(
			'title' => 'ChatBootstrapResponse',
			'property_keys' => array(
				'role',
				'threads',
				'selectedThreadId',
				'messages',
				'pollIntervalSeconds'
			)
		),
		'dto/chat.poll.request' => array(
			'title' => 'ChatPollRequest',
			'property_keys' => array(
				'selectedThreadId',
				'afterMessageId'
			)
		),
		'dto/chat.poll.response' => array(
			'title' => 'ChatPollResponse',
			'property_keys' => array(
				'role',
				'threads',
				'selectedThreadId',
				'messages',
				'pollIntervalSeconds'
			)
		),
		'dto/chat.send.request' => array(
			'title' => 'ChatSendRequest',
			'property_keys' => array(
				'selectedThreadId',
				'message'
			)
		),
		'dto/chat.send.response' => array(
			'title' => 'ChatSendResponse',
			'property_keys' => array(
				'role',
				'thread',
				'message'
			)
		),
		'dto/chat.thread-action.request' => array(
			'title' => 'ChatThreadActionRequest',
			'property_keys' => array(
				'selectedThreadId'
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
		'dto/license-webhook.response' => array(
			'title' => 'LicenseWebhookResponse',
			'property_keys' => array(
				'status',
				'event'
			)
		),
		'dto/license.activate.request' => array(
			'title' => 'LicenseActivateRequest',
			'property_keys' => array(
				'licenseKey'
			)
		),
		'dto/license.response' => array(
			'title' => 'LicenseResponse',
			'property_keys' => array(
				'status',
				'role',
				'tier',
				'expiresAt',
				'features',
				'graceDaysRemaining',
				'hasKey',
				'keyPrefix',
				'serverConfigured'
			)
		),
		'dto/license.settings.request' => array(
			'title' => 'LicenseSettingsRequest',
			'property_keys' => array(
				'serverUrl'
			)
		),
		'dto/license.settings.response' => array(
			'title' => 'LicenseSettingsResponse',
			'property_keys' => array(
				'serverUrl',
				'serverConfigured',
				'storedLicenseKey'
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
