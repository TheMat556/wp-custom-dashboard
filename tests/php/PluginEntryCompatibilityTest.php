<?php
/**
 * Compatibility tests for the additive plugin bootstrap entrypoint.
 */

use WpReactUi\Bootstrap\PluginBootstrap;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class PluginEntryCompatibilityTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
		PluginBootstrap::boot();
	}

	public function test_legacy_boot_sequence_is_unchanged(): void {
		$this->assertSame(
			array(
				'WP_React_UI_Branding_Settings',
				'WP_React_UI_Shell_Bootstrap',
				'WP_React_UI_Activity_Log',
				'WP_React_UI_Dashboard_Data',
			),
			PluginBootstrap::legacy_init_sequence()
		);
	}

	public function test_plugin_boot_registers_expected_hooks(): void {
		$this->assertNotEmpty( wp_test_get_actions( 'admin_init' ) );
		$this->assertNotEmpty( wp_test_get_actions( 'admin_menu' ) );
		$this->assertNotEmpty( wp_test_get_actions( 'rest_api_init' ) );
		$this->assertNotEmpty( wp_test_get_actions( 'template_redirect' ) );
		$this->assertNotEmpty( wp_test_get_actions( 'save_post' ) );
		$this->assertNotEmpty( wp_test_get_actions( 'wp_login' ) );
	}
}
