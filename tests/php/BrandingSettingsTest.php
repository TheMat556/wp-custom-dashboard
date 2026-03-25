<?php
/**
 * Tests for WP_React_UI_Branding_Settings sanitization and data methods.
 */

use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/includes/class-wp-react-ui-branding-settings.php';

class BrandingSettingsTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
	}

	// ── sanitize_settings ─────────────────────────────────────────────────

	public function test_sanitize_empty_input_returns_defaults(): void {
		$result = WP_React_UI_Branding_Settings::sanitize_settings( array() );

		$this->assertSame( 0, $result['light_logo_id'] );
		$this->assertSame( 0, $result['dark_logo_id'] );
		$this->assertSame( array(), $result['open_in_new_tab_patterns'] );
	}

	public function test_sanitize_non_array_input_returns_defaults(): void {
		$result = WP_React_UI_Branding_Settings::sanitize_settings( 'invalid' );

		$this->assertSame( 0, $result['light_logo_id'] );
		$this->assertSame( 0, $result['dark_logo_id'] );
	}

	public function test_sanitize_null_input_returns_defaults(): void {
		$result = WP_React_UI_Branding_Settings::sanitize_settings( null );

		$this->assertSame( 0, $result['light_logo_id'] );
		$this->assertSame( 0, $result['dark_logo_id'] );
	}

	public function test_sanitize_valid_image_attachment_id(): void {
		global $wp_test_state;

		$post            = new stdClass();
		$post->post_type = 'attachment';
		$post->is_image  = true;
		$post->url       = 'http://example.com/logo.png';

		$wp_test_state['posts'][42] = $post;

		$result = WP_React_UI_Branding_Settings::sanitize_settings(
			array( 'light_logo_id' => 42 )
		);

		$this->assertSame( 42, $result['light_logo_id'] );
	}

	public function test_sanitize_rejects_non_image_attachment(): void {
		global $wp_test_state;

		$post            = new stdClass();
		$post->post_type = 'attachment';
		$post->is_image  = false;

		$wp_test_state['posts'][99] = $post;

		$result = WP_React_UI_Branding_Settings::sanitize_settings(
			array( 'light_logo_id' => 99 )
		);

		$this->assertSame( 0, $result['light_logo_id'] );
		$this->assertNotEmpty( $wp_test_state['settings_errors'] );
		$this->assertSame( 'invalid_light_logo', $wp_test_state['settings_errors'][0]['code'] );
	}

	public function test_sanitize_rejects_non_attachment_post(): void {
		global $wp_test_state;

		$post            = new stdClass();
		$post->post_type = 'post';
		$post->is_image  = false;

		$wp_test_state['posts'][50] = $post;

		$result = WP_React_UI_Branding_Settings::sanitize_settings(
			array( 'dark_logo_id' => 50 )
		);

		$this->assertSame( 0, $result['dark_logo_id'] );
		$this->assertNotEmpty( $wp_test_state['settings_errors'] );
		$this->assertSame( 'invalid_dark_logo', $wp_test_state['settings_errors'][0]['code'] );
	}

	public function test_sanitize_rejects_nonexistent_attachment(): void {
		$result = WP_React_UI_Branding_Settings::sanitize_settings(
			array( 'light_logo_id' => 9999 )
		);

		$this->assertSame( 0, $result['light_logo_id'] );
	}

	public function test_sanitize_zero_logo_id_returns_zero(): void {
		$result = WP_React_UI_Branding_Settings::sanitize_settings(
			array( 'light_logo_id' => 0 )
		);

		$this->assertSame( 0, $result['light_logo_id'] );
	}

	public function test_sanitize_negative_logo_id_treated_as_positive(): void {
		// absint(-5) => 5, which won't exist as a post
		$result = WP_React_UI_Branding_Settings::sanitize_settings(
			array( 'light_logo_id' => -5 )
		);

		$this->assertSame( 0, $result['light_logo_id'] );
	}

	public function test_sanitize_string_logo_id_coerced(): void {
		global $wp_test_state;

		$post            = new stdClass();
		$post->post_type = 'attachment';
		$post->is_image  = true;
		$post->url       = 'http://example.com/logo.png';

		$wp_test_state['posts'][10] = $post;

		$result = WP_React_UI_Branding_Settings::sanitize_settings(
			array( 'light_logo_id' => '10' )
		);

		$this->assertSame( 10, $result['light_logo_id'] );
	}

	// ── open_in_new_tab_patterns ──────────────────────────────────────────

	public function test_sanitize_patterns_from_textarea(): void {
		$result = WP_React_UI_Branding_Settings::sanitize_settings(
			array( 'open_in_new_tab_patterns' => "builder=bricks\nedit_with_bricks\n" )
		);

		$this->assertSame(
			array( 'builder=bricks', 'edit_with_bricks' ),
			$result['open_in_new_tab_patterns']
		);
	}

	public function test_sanitize_patterns_trims_and_lowercases(): void {
		$result = WP_React_UI_Branding_Settings::sanitize_settings(
			array( 'open_in_new_tab_patterns' => "  Builder=Bricks  " )
		);

		$this->assertSame( array( 'builder=bricks' ), $result['open_in_new_tab_patterns'] );
	}

	public function test_sanitize_patterns_removes_empty_lines(): void {
		$result = WP_React_UI_Branding_Settings::sanitize_settings(
			array( 'open_in_new_tab_patterns' => "foo\n\n\nbar\n" )
		);

		$this->assertSame( array( 'foo', 'bar' ), $result['open_in_new_tab_patterns'] );
	}

	public function test_sanitize_patterns_deduplicates(): void {
		$result = WP_React_UI_Branding_Settings::sanitize_settings(
			array( 'open_in_new_tab_patterns' => "foo\nfoo\nbar" )
		);

		$this->assertSame( array( 'foo', 'bar' ), $result['open_in_new_tab_patterns'] );
	}

	public function test_sanitize_patterns_handles_crlf(): void {
		$result = WP_React_UI_Branding_Settings::sanitize_settings(
			array( 'open_in_new_tab_patterns' => "alpha\r\nbeta\rgamma" )
		);

		$this->assertSame( array( 'alpha', 'beta', 'gamma' ), $result['open_in_new_tab_patterns'] );
	}

	public function test_sanitize_patterns_handles_array_input(): void {
		$result = WP_React_UI_Branding_Settings::sanitize_settings(
			array( 'open_in_new_tab_patterns' => array( ' FOO ', 'bar' ) )
		);

		$this->assertSame( array( 'foo', 'bar' ), $result['open_in_new_tab_patterns'] );
	}

	// ── get_frontend_branding ─────────────────────────────────────────────

	public function test_get_frontend_branding_no_custom_logos(): void {
		$branding = WP_React_UI_Branding_Settings::get_frontend_branding();

		$this->assertSame( 'Test Site', $branding['siteName'] );
		$this->assertNull( $branding['logos']['lightUrl'] );
		$this->assertNull( $branding['logos']['darkUrl'] );
		$this->assertStringContainsString( 'dist/logo.svg', $branding['logos']['defaultUrl'] );
	}

	public function test_get_frontend_branding_with_custom_light_logo(): void {
		global $wp_test_state;

		$post            = new stdClass();
		$post->post_type = 'attachment';
		$post->is_image  = true;
		$post->url       = 'http://example.com/custom-light.png';
		$wp_test_state['posts'][20] = $post;

		$wp_test_state['options']['wp_react_ui_branding'] = array(
			'light_logo_id' => 20,
			'dark_logo_id'  => 0,
		);

		$branding = WP_React_UI_Branding_Settings::get_frontend_branding();

		$this->assertSame( 'http://example.com/custom-light.png', $branding['logos']['lightUrl'] );
		$this->assertNull( $branding['logos']['darkUrl'] );
	}

	// ── get_navigation_preferences ────────────────────────────────────────

	public function test_get_navigation_preferences_default(): void {
		$prefs = WP_React_UI_Branding_Settings::get_navigation_preferences();

		$this->assertSame( array(), $prefs['openInNewTabPatterns'] );
	}

	public function test_get_navigation_preferences_with_patterns(): void {
		global $wp_test_state;

		$wp_test_state['options']['wp_react_ui_branding'] = array(
			'open_in_new_tab_patterns' => array( 'builder=bricks', 'elementor' ),
		);

		$prefs = WP_React_UI_Branding_Settings::get_navigation_preferences();

		$this->assertSame( array( 'builder=bricks', 'elementor' ), $prefs['openInNewTabPatterns'] );
	}
}
