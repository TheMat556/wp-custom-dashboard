<?php
/**
 * Tests for LicenseClient::should_allow_host — the request-time external-host filter.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Tests;

use WpReactUi\License\LicenseClient;
use PHPUnit\Framework\TestCase;

/**
 * Pure unit tests (no WordPress dependencies) for the should_allow_host method.
 */
class LicenseClientShouldAllowHostTest extends TestCase {

	public function test_matching_domain_returns_true(): void {
		// skip_pinning=true bypasses the DNS-pin gate so this unit test
		// can exercise the host-match logic without resolving DNS.
		$this->assertTrue(
			LicenseClient::should_allow_host( false, 'api.example.com', 'api.example.com', array(), true )
		);
	}

	public function test_matching_domain_full_quad_ip_form_returns_false(): void {
		$this->assertFalse(
			LicenseClient::should_allow_host( false, '127.0.0.1', '127.0.0.1' )
		);
	}

	public function test_matching_domain_short_ipv4_2_octet_returns_false(): void {
		$this->assertFalse(
			LicenseClient::should_allow_host( false, '127.1', '127.1' )
		);
	}

	public function test_matching_domain_short_ipv4_3_octet_returns_false(): void {
		$this->assertFalse(
			LicenseClient::should_allow_host( false, '127.0.1', '127.0.1' )
		);
	}

	public function test_matching_domain_integer_form_returns_false(): void {
		$this->assertFalse(
			LicenseClient::should_allow_host( false, '2130706433', '2130706433' )
		);
	}

	public function test_matching_domain_hex_form_returns_false(): void {
		$this->assertFalse(
			LicenseClient::should_allow_host( false, '0x7f000001', '0x7f000001' )
		);
	}

	public function test_matching_bracketed_ipv6_returns_false(): void {
		$this->assertFalse(
			LicenseClient::should_allow_host( false, '[::1]', '[::1]' )
		);
	}

	public function test_matching_zone_id_ipv6_returns_false(): void {
		$this->assertFalse(
			LicenseClient::should_allow_host( false, '[::1%eth0]', '[::1%eth0]' )
		);
	}

	public function test_non_matching_host_with_external_true_returns_true(): void {
		$this->assertTrue(
			LicenseClient::should_allow_host( true, 'other.com', 'api.example.com' )
		);
	}

	public function test_non_matching_host_with_external_false_returns_false(): void {
		$this->assertFalse(
			LicenseClient::should_allow_host( false, 'other.com', 'api.example.com' )
		);
	}

	public function test_trailing_dot_normalized_correctly(): void {
		// skip_pinning=true bypasses the DNS-pin gate so this unit test
		// can exercise host normalization without resolving DNS.
		$this->assertTrue(
			LicenseClient::should_allow_host( false, 'api.example.com.', 'api.example.com', array(), true )
		);
	}

	public function test_null_server_host_passes_through_external(): void {
		$this->assertTrue(
			LicenseClient::should_allow_host( true, 'any.host', null )
		);
		$this->assertFalse(
			LicenseClient::should_allow_host( false, 'any.host', null )
		);
	}

	public function test_cloud_metadata_hosts_blocked(): void {
		$this->assertFalse(
			LicenseClient::should_allow_host( true, 'metadata.google.internal', 'api.example.com' )
		);
		$this->assertFalse(
			LicenseClient::should_allow_host( true, 'metadata.aws.internal', 'api.example.com' )
		);
	}

	public function test_cloud_metadata_ip_blocked(): void {
		$this->assertFalse(
			LicenseClient::should_allow_host( true, '169.254.169.254', 'api.example.com' )
		);
		$this->assertFalse(
			LicenseClient::should_allow_host( true, '100.100.100.200', 'api.example.com' )
		);
	}

	public function test_cloud_metadata_trailing_dot_still_blocked(): void {
		$this->assertFalse(
			LicenseClient::should_allow_host( true, 'metadata.google.internal.', 'api.example.com' )
		);
	}

	public function test_legitimate_external_host_not_blocked(): void {
		$this->assertTrue(
			LicenseClient::should_allow_host( true, 'valid-license-server.example.com', 'api.example.com' )
		);
	}
}
