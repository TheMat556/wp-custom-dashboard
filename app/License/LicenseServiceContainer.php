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
 *   $container = LicenseServiceContainer::getInstance();
 *   $manager = $container->getManager();
 *
 * For testing:
 *   $mockCache = $this->createMock(LicenseCache::class);
 *   $container->setCache($mockCache);
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
	public static function getInstance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Gets the cache repository, lazy-initializing if not overridden.
	 */
	public function getCacheRepository(): CacheRepositoryInterface {
		return $this->cache_repository ??= new WordPressCacheRepository();
	}

	/**
	 * Gets the options repository, lazy-initializing if not overridden.
	 */
	public function getOptionsRepository(): OptionsRepositoryInterface {
		return $this->options_repository ??= new WordPressOptionsRepository();
	}

	/**
	 * Gets the feature filter, lazy-initializing if not overridden.
	 */
	public function getFeatureFilter(): FeatureFilterInterface {
		return $this->feature_filter ??= new WordPressFeatureFilter();
	}

	/**
	 * Gets the settings repository, lazy-initializing if not overridden.
	 */
	public function getSettingsRepository(): LicenseSettingsRepository {
		return $this->settings_repository ??= new LicenseSettingsRepository();
	}

	/**
	 * Gets the license cache, lazy-initializing if not overridden.
	 */
	public function getCache(): LicenseCache {
		return $this->cache ??= new LicenseCache(
			$this->getCacheRepository(),
			$this->getOptionsRepository()
		);
	}

	/**
	 * Gets the license grace period, lazy-initializing if not overridden.
	 */
	public function getGracePeriod(): LicenseGracePeriod {
		return $this->grace_period ??= new LicenseGracePeriod(
			$this->getOptionsRepository()
		);
	}

	/**
	 * Gets the license manager, lazy-initializing if not overridden.
	 *
	 * The manager is constructed with null client (uses default), and
	 * the lazily-initialized cache and settings repository from this container.
	 */
	public function getManager(): LicenseManager {
		return $this->manager ??= new LicenseManager(
			null,
			$this->getCache(),
			$this->getSettingsRepository()
		);
	}

	/**
	 * Overrides the cache repository for testing.
	 *
	 * @param CacheRepositoryInterface $repo Repository to inject.
	 */
	public function setCacheRepository( CacheRepositoryInterface $repo ): void {
		$this->cache_repository = $repo;
		$this->cache            = null; // Reset dependent cache.
	}

	/**
	 * Overrides the options repository for testing.
	 *
	 * @param OptionsRepositoryInterface $repo Repository to inject.
	 */
	public function setOptionsRepository( OptionsRepositoryInterface $repo ): void {
		$this->options_repository = $repo;
		$this->cache              = null; // Reset dependent cache.
		$this->grace_period       = null; // Reset dependent grace period.
	}

	/**
	 * Overrides the feature filter for testing.
	 *
	 * @param FeatureFilterInterface $filter Filter to inject.
	 */
	public function setFeatureFilter( FeatureFilterInterface $filter ): void {
		$this->feature_filter = $filter;
	}

	/**
	 * Overrides the settings repository for testing.
	 *
	 * @param LicenseSettingsRepository $repo Repository to inject.
	 */
	public function setSettingsRepository( LicenseSettingsRepository $repo ): void {
		$this->settings_repository = $repo;
	}

	/**
	 * Overrides the license cache for testing.
	 *
	 * @param LicenseCache $cache Cache to inject.
	 */
	public function setCache( LicenseCache $cache ): void {
		$this->cache = $cache;
	}

	/**
	 * Overrides the license grace period for testing.
	 *
	 * @param LicenseGracePeriod $grace_period Grace period to inject.
	 */
	public function setGracePeriod( LicenseGracePeriod $grace_period ): void {
		$this->grace_period = $grace_period;
	}

	/**
	 * Overrides the license manager for testing.
	 *
	 * @param LicenseManager $manager Manager to inject.
	 */
	public function setManager( LicenseManager $manager ): void {
		$this->manager = $manager;
	}

	/**
	 * Resets all overridden dependencies to null.
	 *
	 * Call this in test tearDown() to prevent test pollution.
	 * The next call to get*() will create a fresh instance.
	 */
	public function reset(): void {
		$this->settings_repository   = null;
		$this->cache_repository      = null;
		$this->options_repository    = null;
		$this->feature_filter        = null;
		$this->cache                 = null;
		$this->grace_period          = null;
		$this->manager               = null;
	}
}
