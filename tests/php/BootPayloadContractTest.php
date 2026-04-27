<?php
/**
 * Compatibility tests for the localized boot payload contract.
 */

use WpReactUi\License\LicenseCache;
use WpReactUi\License\LicenseSettingsRepository;
use WpReactUi\Contracts\BootPayloadContract;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class BootPayloadContractTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
		global $menu, $submenu;
		$menu    = array();
		$submenu = array();
	}

	public function test_localized_boot_payload_top_level_keys_are_unchanged(): void {
		$payload = WP_React_UI_Shell_Localization::get_payload();

		$this->assertSame(
			BootPayloadContract::TOP_LEVEL_KEYS,
			array_values( array_keys( $payload ) )
		);
	}

	public function test_localized_boot_payload_nested_keys_are_unchanged(): void {
		$payload = WP_React_UI_Shell_Localization::get_payload();

		$this->assertSame( BootPayloadContract::BRANDING_KEYS, array_values( array_keys( $payload['branding'] ) ) );
		$this->assertSame(
			BootPayloadContract::BRANDING_LOGO_KEYS,
			array_values( array_keys( $payload['branding']['logos'] ) )
		);
		$this->assertSame(
			BootPayloadContract::NAVIGATION_KEYS,
			array_values( array_keys( $payload['navigation'] ) )
		);
		$this->assertSame( BootPayloadContract::USER_KEYS, array_values( array_keys( $payload['user'] ) ) );
	}

	public function test_non_admin_payload_keeps_feature_flags_but_hides_license_metadata(): void {
		global $wp_test_state;

		$wp_test_state['capabilities']['manage_options'] = false;

		$settings = new LicenseSettingsRepository();
		$cache    = new LicenseCache();

		$settings->save_license_key( '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' );
		$cache->set(
			array(
				'status'             => LicenseCache::STATUS_ACTIVE,
				'tier'               => 'agency',
				'expiresAt'          => gmdate( 'Y-m-d H:i:s', time() + DAY_IN_SECONDS ),
				'features'           => array( 'dashboard' ),
				'graceDaysRemaining' => 0,
				'keyPrefix'          => $settings->get_key_prefix(),
				'lastValidatedAt'    => gmdate( 'Y-m-d H:i:s' ),
			)
		);

		$payload = WP_React_UI_Shell_Localization::get_payload();

		$this->assertSame( LicenseCache::STATUS_ACTIVE, $payload['license']['status'] );
		$this->assertSame( array( 'dashboard' ), $payload['license']['features'] );
		$this->assertNull( $payload['license']['tier'] );
		$this->assertNull( $payload['license']['expiresAt'] );
		$this->assertFalse( $payload['license']['hasKey'] );
		$this->assertNull( $payload['license']['keyPrefix'] );
	}

	public function test_non_admin_payload_filters_shell_routes_by_declared_capability(): void {
		global $wp_test_state;

		$wp_test_state['capabilities']['manage_options'] = false;
		$wp_test_state['capabilities']['edit_posts']     = true;

		add_filter(
			'wp_react_ui_shell_routes',
			static function ( array $routes ): array {
				$routes[] = array(
					'slug'           => 'read-route',
					'label'          => 'Read Route',
					'capability'     => 'read',
					'entrypoint_url' => 'https://example.test/read.js',
				);
				$routes[] = array(
					'slug'           => 'admin-route',
					'label'          => 'Admin Route',
					'entrypoint_url' => 'https://example.test/admin.js',
				);
				$routes[] = array(
					'slug'           => 'custom-cap-route',
					'label'          => 'Custom Capability Route',
					'capability'     => 'edit_posts',
					'entrypoint_url' => 'https://example.test/custom.js',
				);

				return $routes;
			}
		);

		$payload = WP_React_UI_Shell_Localization::get_payload();

		$this->assertSame( 2, count( $payload['shellRoutes'] ) );
		$this->assertSame( 'read-route', $payload['shellRoutes'][0]['slug'] );
		$this->assertSame( 'custom-cap-route', $payload['shellRoutes'][1]['slug'] );
	}

	public function test_shell_routes_follow_filter_priority_order(): void {
		add_filter(
			'wp_react_ui_shell_routes',
			static function ( array $routes ): array {
				$routes[] = array(
					'slug'           => 'late-first',
					'label'          => 'Late First',
					'capability'     => 'read',
					'entrypoint_url' => 'https://example.test/late-first.js',
				);

				return $routes;
			},
			20
		);

		add_filter(
			'wp_react_ui_shell_routes',
			static function ( array $routes ): array {
				$routes[] = array(
					'slug'           => 'early',
					'label'          => 'Early',
					'capability'     => 'read',
					'entrypoint_url' => 'https://example.test/early.js',
				);

				return $routes;
			},
			5
		);

		add_filter(
			'wp_react_ui_shell_routes',
			static function ( array $routes ): array {
				$routes[] = array(
					'slug'           => 'late-second',
					'label'          => 'Late Second',
					'capability'     => 'read',
					'entrypoint_url' => 'https://example.test/late-second.js',
				);

				return $routes;
			},
			20
		);

		$payload = WP_React_UI_Shell_Localization::get_payload();

		$this->assertSame(
			array( 'early', 'late-first', 'late-second' ),
			array_column( $payload['shellRoutes'], 'slug' )
		);
	}
}
