<?php
/**
 * Compatibility tests for the localized boot payload contract.
 */

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
}
