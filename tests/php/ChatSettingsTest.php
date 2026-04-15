<?php
/**
 * Tests for chat settings persistence and fallback selection.
 */

use WpReactUi\Chat\ChatSettings;
use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class ChatSettingsTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
	}

	public function test_save_from_rest_rejects_invalid_chatwoot_base_url(): void {
		$settings = new ChatSettings();

		$result = $settings->save_from_rest(
			array(
				'provider'          => 'chatwoot',
				'chatwoot_base_url' => 'javascript:alert(1)',
			)
		);

		$this->assertTrue( is_wp_error( $result ) );
		$this->assertSame( 'invalid_chatwoot_base_url', $result->get_error_code() );
	}

	public function test_public_payload_falls_back_to_tawk_when_chatwoot_is_incomplete(): void {
		$settings = new ChatSettings();

		$result = $settings->save_from_rest(
			array(
				'provider'               => 'chatwoot',
				'chatwoot_base_url'      => 'https://chat.example.test',
				'chatwoot_website_token' => '',
				'tawk_property_id'       => 'property-123',
				'tawk_widget_id'         => 'widget-456',
			)
		);

		$this->assertTrue( true === $result );

		$payload = $settings->get_public_payload();

		$this->assertSame( 'chatwoot', $payload['provider'] );
		$this->assertSame( 'tawk', $payload['effectiveProvider'] );
		$this->assertSame( 'property-123', $payload['tawkPropertyId'] );
		$this->assertSame( 'widget-456', $payload['tawkWidgetId'] );
	}

	public function test_rest_payload_normalizes_saved_values(): void {
		$settings = new ChatSettings();

		$result = $settings->save_from_rest(
			array(
				'provider'               => 'tawk',
				'chatwoot_base_url'      => 'https://chat.example.test/',
				'chatwoot_website_token' => '  cw-token  ',
				'tawk_property_id'       => '  property-id  ',
				'tawk_widget_id'         => ' widget-id ',
			)
		);

		$this->assertTrue( true === $result );

		$payload = $settings->get_rest_payload();

		$this->assertSame(
			array(
				'provider',
				'effectiveProvider',
				'chatwootBaseUrl',
				'chatwootWebsiteToken',
				'tawkPropertyId',
				'tawkWidgetId',
			),
			array_values( array_keys( $payload ) )
		);
		$this->assertSame( 'https://chat.example.test', $payload['chatwootBaseUrl'] );
		$this->assertSame( 'cw-token', $payload['chatwootWebsiteToken'] );
		$this->assertSame( 'property-id', $payload['tawkPropertyId'] );
		$this->assertSame( 'widget-id', $payload['tawkWidgetId'] );
		$this->assertSame( 'tawk', $payload['effectiveProvider'] );
	}
}
