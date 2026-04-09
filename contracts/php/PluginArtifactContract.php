<?php
/**
 * Plugin artifact packaging contract.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Contracts;

/**
 * Defines the runtime file set and build outputs required for the packaged plugin artifact.
 */
final class PluginArtifactContract {

	/**
	 * Folder name used for the packaged plugin artifact.
	 *
	 * @var string
	 */
	public const ARTIFACT_SLUG = 'wp-custom-dashboard';

	/**
	 * Normalized timestamp applied to staged files before zipping.
	 *
	 * @var int
	 */
	public const NORMALIZED_TIMESTAMP = 1704067200;

	/**
	 * Top-level paths included in the deployable artifact.
	 *
	 * @var array<int, string>
	 */
	public const INCLUDED_TOP_LEVEL_PATHS = array(
		'wp-custom-dashboard.php',
		'app',
		'dist',
		'includes',
	);

	/**
	 * Runtime files that must exist in the packaged artifact.
	 *
	 * @var array<int, string>
	 */
	public const REQUIRED_RUNTIME_FILES = array(
		'wp-custom-dashboard.php',
		'includes/critical.css',
		'includes/class-wp-react-ui-asset-loader.php',
		'includes/class-wp-react-ui-activity-log.php',
		'includes/class-wp-react-ui-branding-settings.php',
		'includes/class-wp-react-ui-dashboard-data.php',
		'includes/class-wp-react-ui-menu-cache.php',
		'includes/class-wp-react-ui-menu-repository.php',
		'includes/class-wp-react-ui-rest-api.php',
		'includes/class-wp-react-ui-shell-admin-assets.php',
		'includes/class-wp-react-ui-shell-bootstrap.php',
		'includes/class-wp-react-ui-shell-early-boot.php',
		'includes/class-wp-react-ui-shell-embed-mode.php',
		'includes/class-wp-react-ui-shell-localization.php',
		'app/Plugin.php',
		'app/Bootstrap/PluginBootstrap.php',
		'app/WordPress/Activity/ActivityLog.php',
		'app/WordPress/Assets/AssetLoader.php',
		'app/WordPress/Branding/BrandingSettings.php',
		'app/WordPress/Dashboard/DashboardData.php',
		'app/WordPress/Menu/MenuCache.php',
		'app/WordPress/Menu/MenuRepository.php',
		'app/WordPress/Rest/RestApi.php',
		'app/WordPress/Shell/ShellAdminAssets.php',
		'app/WordPress/Shell/ShellBootstrap.php',
		'app/WordPress/Shell/ShellEarlyBoot.php',
		'app/WordPress/Shell/ShellEmbedMode.php',
		'app/WordPress/Shell/ShellLocalization.php',
		'dist/.vite/manifest.json',
	);

	/**
	 * Manifest entries required by the runtime shell and lazy-loaded shell pages.
	 *
	 * @var array<int, string>
	 */
	public const REQUIRED_MANIFEST_ENTRIES = array(
		'src/main.tsx',
		'src/embedBridge.ts',
		'src/outside.css',
		'src/features/activity/components/ActivityLogPanel/index.tsx',
		'src/features/branding/components/BrandingSettings/index.tsx',
		'src/features/dashboard/components/DashboardPage/index.tsx',
		'src/features/shell/components/navbar/UserDropdown.tsx',
		'src/store/sessionStore.ts',
	);

	/**
	 * Paths that must not be shipped in the deployable artifact.
	 *
	 * @var array<int, string>
	 */
	public const FORBIDDEN_ARTIFACT_PATHS = array(
		'.git',
		'.github',
		'.phpunit.cache',
		'coverage',
		'dist-antd-compare',
		'node_modules',
		'src',
		'tests',
	);
}
