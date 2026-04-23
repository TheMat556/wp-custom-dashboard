<?php
/**
 * Service container for license system dependencies.
 *
 * Enables dependency injection for testing and runtime flexibility.
 * Provides lazy initialization and override capabilities for mocking.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License;

use WpReactUi\License\Contracts\CacheRepositoryInterface;
use WpReactUi\License\Contracts\FeatureFilterInterface;
use WpReactUi\License\Contracts\OptionsRepositoryInterface;
use WpReactUi\WordPress\License\WordPressCacheRepository;
use WpReactUi\WordPress\License\WordPressFeatureFilter;
use WpReactUi\WordPress\License\WordPressOptionsRepository;

defined( 'ABSPATH' ) || exit;

/**
 * Service locator for license system components.
 *
 * This enables `LicenseGate` and other classes to resolve dependencies
 * without hardcoding `new` calls, making unit testing possible via
 * mock injection.
 *
 * Usage:
 *   $container = LicenseServiceContainer::get_instance();
 *   $manager = $container->get_manager();
 *
 * For testing:
 *   $mockCache = $this->createMock(LicenseCache::class);
 *   $container->set_cache($mockCache);
 *   // ... run test
 *   $container->reset(); // in tearDown()
 */
final class LicenseServiceContainer {

	/**
	 * Singleton instance.
	 *
	 * @var self|null
	 */
	private static ?self $instance = null;

	/**
	 * Cached settings repository instance.
	 *
	 * @var LicenseSettingsRepository|null
	 */
	private ?LicenseSettingsRepository $settings_repository = null;

	/**
	 * Cached cache repository instance.
	 *
	 * @var CacheRepositoryInterface|null
	 */
	private ?CacheRepositoryInterface $cache_repository = null;

	/**
	 * Cached options repository instance.
	 *
	 * @var OptionsRepositoryInterface|null
	 */
	private ?OptionsRepositoryInterface $options_repository = null;

	/**
	 * Cached feature filter instance.
	 *
	 * @var FeatureFilterInterface|null
	 */
	private ?FeatureFilterInterface $feature_filter = null;

	/**
	 * Cached license cache instance.
	 *
	 * @var LicenseCache|null
	 */
	private ?LicenseCache $cache = null;

	/**
	 * Cached license grace period instance.
	 *
	 * @var LicenseGracePeriod|null
	 */
	private ?LicenseGracePeriod $grace_period = null;

	/**
	 * Cached license manager instance.
	 *
	 * @var LicenseManager|null
	 */
	private ?LicenseManager $manager = null;

	/**
	 * Gets the singleton instance of the container.
	 */
	public static function get_instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Gets the cache repository, lazy-initializing if not overridden.
	 */
	public function get_cache_repository(): CacheRepositoryInterface {
		return $this->cache_repository ??= new WordPressCacheRepository();
	}

	/**
	 * Gets the options repository, lazy-initializing if not overridden.
	 */
	public function get_options_repository(): OptionsRepositoryInterface {
		return $this->options_repository ??= new WordPressOptionsRepository();
	}

	/**
	 * Gets the feature filter, lazy-initializing if not overridden.
	 */
	public function get_feature_filter(): FeatureFilterInterface {
		return $this->feature_filter ??= new WordPressFeatureFilter();
	}

	/**
	 * Gets the settings repository, lazy-initializing if not overridden.
	 */
	public function get_settings_repository(): LicenseSettingsRepository {
		return $this->settings_repository ??= new LicenseSettingsRepository();
	}

	/**
	 * Gets the license cache, lazy-initializing if not overridden.
	 */
	public function get_cache(): LicenseCache {
		return $this->cache ??= new LicenseCache(
			$this->get_cache_repository(),
			$this->get_options_repository()
		);
	}

	/**
	 * Gets the license grace period, lazy-initializing if not overridden.
	 */
	public function get_grace_period(): LicenseGracePeriod {
		return $this->grace_period ??= new LicenseGracePeriod(
			$this->get_options_repository()
		);
	}

	/**
	 * Gets the license manager, lazy-initializing if not overridden.
	 *
	 * The manager is constructed with null client (uses default), and
	 * the lazily-initialized cache and settings repository from this container.
	 */
	public function get_manager(): LicenseManager {
		return $this->manager ??= new LicenseManager(
			null,
			$this->get_cache(),
			$this->get_settings_repository()
		);
	}

	/**
	 * Overrides the cache repository for testing.
	 *
	 * @param CacheRepositoryInterface $repo Repository to inject.
	 */
	public function set_cache_repository( CacheRepositoryInterface $repo ): void {
		$this->cache_repository = $repo;
		$this->cache            = null; // Reset dependent cache.
	}

	/**
	 * Overrides the options repository for testing.
	 *
	 * @param OptionsRepositoryInterface $repo Repository to inject.
	 */
	public function set_options_repository( OptionsRepositoryInterface $repo ): void {
		$this->options_repository = $repo;
		$this->cache              = null; // Reset dependent cache.
		$this->grace_period       = null; // Reset dependent grace period.
	}

	/**
	 * Overrides the feature filter for testing.
	 *
	 * @param FeatureFilterInterface $filter Filter to inject.
	 */
	public function set_feature_filter( FeatureFilterInterface $filter ): void {
		$this->feature_filter = $filter;
	}

	/**
	 * Overrides the settings repository for testing.
	 *
	 * @param LicenseSettingsRepository $repo Repository to inject.
	 */
	public function set_settings_repository( LicenseSettingsRepository $repo ): void {
		$this->settings_repository = $repo;
	}

	/**
	 * Overrides the license cache for testing.
	 *
	 * @param LicenseCache $cache Cache to inject.
	 */
	public function set_cache( LicenseCache $cache ): void {
		$this->cache = $cache;
	}

	/**
	 * Overrides the license grace period for testing.
	 *
	 * @param LicenseGracePeriod $grace_period Grace period to inject.
	 */
	public function set_grace_period( LicenseGracePeriod $grace_period ): void {
		$this->grace_period = $grace_period;
	}

	/**
	 * Overrides the license manager for testing.
	 *
	 * @param LicenseManager $manager Manager to inject.
	 */
	public function set_manager( LicenseManager $manager ): void {
		$this->manager = $manager;
	}

	/**
	 * Resets all overridden dependencies to null.
	 *
	 * Call this in test tearDown() to prevent test pollution.
	 * The next call to get*() will create a fresh instance.
	 */
	public function reset(): void {
		$this->settings_repository = null;
		$this->cache_repository    = null;
		$this->options_repository  = null;
		$this->feature_filter      = null;
		$this->cache               = null;
		$this->grace_period        = null;
		$this->manager             = null;
	}
}
