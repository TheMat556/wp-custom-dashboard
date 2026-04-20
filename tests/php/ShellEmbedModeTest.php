<?php
/**
 * Coverage for iframe embed-mode CSS resets.
 */

use Yoast\PHPUnitPolyfills\TestCases\TestCase;

require_once dirname( __DIR__, 2 ) . '/wp-custom-dashboard.php';

class ShellEmbedModeTest extends TestCase {

	protected function set_up(): void {
		parent::set_up();
		wp_test_reset_state();
		$_GET['wp_shell_embed'] = '1';
		unset( $_POST['wp_shell_embed'] );
	}

	protected function tear_down(): void {
		unset( $_GET['wp_shell_embed'], $_POST['wp_shell_embed'] );
		parent::tear_down();
	}

	public function test_render_reset_styles_keeps_embed_documents_scrollable(): void {
		ob_start();
		WP_React_UI_Shell_Embed_Mode::render_reset_styles();
		$output = (string) ob_get_clean();

		$this->assertStringContainsString( 'overflow: auto !important', $output );
		$this->assertStringContainsString( '#wpwrap { min-height: 100% !important; height: auto !important; }', $output );
		$this->assertStringContainsString(
			'#wpbody, #wpcontent, #wpbody-content { min-height: 100% !important; height: auto !important; }',
			$output
		);
		$this->assertStringNotContainsString(
			'html { margin: 0 !important; padding: 0 !important; height: 100% !important; overflow: hidden !important; }',
			$output
		);
	}
}
