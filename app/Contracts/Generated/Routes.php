<?php

declare(strict_types=1);

/**
 * AUTO-GENERATED from contracts/source. Do not edit.
 */

namespace WpReactUi\Contracts\Generated;

defined( 'ABSPATH' ) || exit;

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
		'/chat-settings' => array(
			'name' => 'chatSettings',
			'methods' => array(
				'GET',
				'POST'
			),
			'permission' => 'manage_options',
			'featureFlag' => null,
			'requestSchema' => 'dto/chat-settings.request',
			'requestKeys' => array(),
			'responseSchema' => 'dto/chat-settings.response',
			'responseKeys' => array()
		),
		'/chat/bootstrap' => array(
			'name' => 'chatBootstrap',
			'methods' => array(
				'POST'
			),
			'permission' => 'read',
			'featureFlag' => null,
			'requestSchema' => 'dto/chat.bootstrap.request',
			'requestKeys' => array(
				'selectedThreadId'
			),
			'responseSchema' => 'dto/chat.bootstrap.response',
			'responseKeys' => array(
				'role',
				'threads',
				'selectedThreadId',
				'messages',
				'pollIntervalSeconds'
			)
		),
		'/chat/poll' => array(
			'name' => 'chatPoll',
			'methods' => array(
				'POST'
			),
			'permission' => 'read',
			'featureFlag' => null,
			'requestSchema' => 'dto/chat.poll.request',
			'requestKeys' => array(
				'selectedThreadId',
				'afterMessageId'
			),
			'responseSchema' => 'dto/chat.poll.response',
			'responseKeys' => array(
				'role',
				'threads',
				'selectedThreadId',
				'messages',
				'pollIntervalSeconds'
			)
		),
		'/chat/send' => array(
			'name' => 'chatSend',
			'methods' => array(
				'POST'
			),
			'permission' => 'read',
			'featureFlag' => null,
			'requestSchema' => 'dto/chat.send.request',
			'requestKeys' => array(
				'selectedThreadId',
				'message'
			),
			'responseSchema' => 'dto/chat.send.response',
			'responseKeys' => array(
				'role',
				'thread',
				'message'
			)
		),
		'/chat/archive' => array(
			'name' => 'chatArchive',
			'methods' => array(
				'POST'
			),
			'permission' => 'manage_options',
			'featureFlag' => null,
			'requestSchema' => 'dto/chat.thread-action.request',
			'requestKeys' => array(
				'selectedThreadId'
			),
			'responseSchema' => 'dto/chat.bootstrap.response',
			'responseKeys' => array(
				'role',
				'threads',
				'selectedThreadId',
				'messages',
				'pollIntervalSeconds'
			)
		),
		'/chat/unarchive' => array(
			'name' => 'chatUnarchive',
			'methods' => array(
				'POST'
			),
			'permission' => 'manage_options',
			'featureFlag' => null,
			'requestSchema' => 'dto/chat.thread-action.request',
			'requestKeys' => array(
				'selectedThreadId'
			),
			'responseSchema' => 'dto/chat.bootstrap.response',
			'responseKeys' => array(
				'role',
				'threads',
				'selectedThreadId',
				'messages',
				'pollIntervalSeconds'
			)
		),
		'/chat/delete' => array(
			'name' => 'chatDelete',
			'methods' => array(
				'POST'
			),
			'permission' => 'manage_options',
			'featureFlag' => null,
			'requestSchema' => 'dto/chat.thread-action.request',
			'requestKeys' => array(
				'selectedThreadId'
			),
			'responseSchema' => 'dto/chat.bootstrap.response',
			'responseKeys' => array(
				'role',
				'threads',
				'selectedThreadId',
				'messages',
				'pollIntervalSeconds'
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
		),
		'/license' => array(
			'name' => 'license',
			'methods' => array(
				'GET'
			),
			'permission' => 'manage_options',
			'featureFlag' => null,
			'requestSchema' => null,
			'requestKeys' => array(),
			'responseSchema' => 'dto/license.response',
			'responseKeys' => array(
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
		'/license/settings' => array(
			'name' => 'licenseSettings',
			'methods' => array(
				'GET',
				'POST'
			),
			'permission' => 'manage_options',
			'featureFlag' => null,
			'requestSchema' => 'dto/license.settings.request',
			'requestKeys' => array(
				'serverUrl'
			),
			'responseSchema' => 'dto/license.settings.response',
			'responseKeys' => array(
				'serverUrl',
				'serverConfigured',
				'storedLicenseKey'
			)
		),
		'/license/activate' => array(
			'name' => 'licenseActivate',
			'methods' => array(
				'POST'
			),
			'permission' => 'manage_options',
			'featureFlag' => null,
			'requestSchema' => 'dto/license.activate.request',
			'requestKeys' => array(
				'licenseKey'
			),
			'responseSchema' => 'dto/license.response',
			'responseKeys' => array(
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
		'/license/deactivate' => array(
			'name' => 'licenseDeactivate',
			'methods' => array(
				'POST'
			),
			'permission' => 'manage_options',
			'featureFlag' => null,
			'requestSchema' => null,
			'requestKeys' => array(),
			'responseSchema' => 'dto/license.response',
			'responseKeys' => array(
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
		'/license-webhook' => array(
			'name' => 'licenseWebhook',
			'methods' => array(
				'POST'
			),
			'permission' => 'public',
			'featureFlag' => null,
			'requestSchema' => null,
			'requestKeys' => array(),
			'responseSchema' => 'dto/license-webhook.response',
			'responseKeys' => array(
				'status',
				'event'
			)
		)
	);

	public static function route_paths(): array {
		return array_keys( self::DEFINITIONS );
	}
}
