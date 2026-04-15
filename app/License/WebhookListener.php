<?php
/**
 * Receives and verifies signed license webhooks from the license server.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License;

use WP_Error;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

final class WebhookListener {
	private const MAX_CLOCK_SKEW = 300;

	private LicenseSettingsRepository $settings_repository;
	private LicenseManager $manager;

	public function __construct(
		?LicenseSettingsRepository $settings_repository = null,
		?LicenseManager $manager = null
	) {
		$this->settings_repository = $settings_repository ?? new LicenseSettingsRepository();
		$this->manager             = $manager ?? new LicenseManager( null, null, $this->settings_repository );
	}

	/**
	 * Processes a webhook request after verification succeeds.
	 *
	 * @param WP_REST_Request $request Incoming webhook request.
	 * @return array{status: string, event: string}|WP_Error
	 */
	public function handle( WP_REST_Request $request ) {
		$stored_secret = $this->settings_repository->get_webhook_secret();
		$header_secret = strtolower( sanitize_text_field( (string) $request->get_header( 'X-Webhook-Secret' ) ) );

		if ( '' === $stored_secret || '' === $header_secret || ! hash_equals( $stored_secret, $header_secret ) ) {
			return new WP_Error(
				'invalid_webhook_secret',
				'Webhook secret is invalid.',
				array( 'status' => 403 )
			);
		}

		$payload = $request->get_json_params();

		if ( ! is_array( $payload ) ) {
			return new WP_Error(
				'invalid_webhook_payload',
				'Webhook payload must be a JSON object.',
				array( 'status' => 400 )
			);
		}

		$verification = $this->verify_signature( $payload );

		if ( is_wp_error( $verification ) ) {
			return $verification;
		}

		$timestamp = (int) $payload['timestamp'];

		if ( abs( time() - $timestamp ) > self::MAX_CLOCK_SKEW ) {
			return new WP_Error(
				'webhook_timestamp_expired',
				'Webhook timestamp is outside the accepted window.',
				array( 'status' => 401 )
			);
		}

		$result = $this->manager->apply_webhook_event(
			sanitize_text_field( (string) $payload['event'] ),
			isset( $payload['data'] ) && is_array( $payload['data'] ) ? $payload['data'] : array()
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return array(
			'status' => 'accepted',
			'event'  => sanitize_text_field( (string) $payload['event'] ),
		);
	}

	/**
	 * @param array<string, mixed> $payload Parsed JSON payload.
	 * @return true|WP_Error
	 */
	private function verify_signature( array $payload ) {
		$event      = isset( $payload['event'] ) ? sanitize_text_field( (string) $payload['event'] ) : '';
		$event_id   = isset( $payload['event_id'] ) ? sanitize_text_field( (string) $payload['event_id'] ) : '';
		$key_prefix = isset( $payload['license_key_prefix'] ) ? sanitize_text_field( (string) $payload['license_key_prefix'] ) : '';
		$signature  = isset( $payload['signature'] ) ? strtolower( sanitize_text_field( (string) $payload['signature'] ) ) : '';
		$timestamp  = isset( $payload['timestamp'] ) ? (string) $payload['timestamp'] : '';
		$data       = isset( $payload['data'] ) && is_array( $payload['data'] ) ? $payload['data'] : null;

		if ( '' === $event || '' === $key_prefix || '' === $signature || '' === $timestamp || ! is_array( $data ) ) {
			return new WP_Error(
				'invalid_webhook_payload',
				'Webhook payload is incomplete.',
				array( 'status' => 400 )
			);
		}

		$stored_prefix = $this->settings_repository->get_key_prefix();
		$license_key   = $this->settings_repository->get_license_key();

		if ( null === $stored_prefix || '' === $license_key || ! hash_equals( $stored_prefix, $key_prefix ) ) {
			return new WP_Error(
				'invalid_webhook_license',
				'Webhook license context does not match this site.',
				array( 'status' => 403 )
			);
		}

		$data_json = wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );

		if ( ! is_string( $data_json ) ) {
			return new WP_Error(
				'invalid_webhook_payload',
				'Webhook payload could not be verified.',
				array( 'status' => 400 )
			);
		}

		// Canonical string includes event_id for deduplication (M1).
		// Backward-compat: if event_id absent (pre-M1 server), use old 4-field canonical.
		$canonical_fields = '' !== $event_id
			? array( $event, $event_id, $key_prefix, $timestamp, $data_json )
			: array( $event, $key_prefix, $timestamp, $data_json );

		$expected = hash_hmac(
			'sha256',
			implode( "\n", $canonical_fields ),
			// Derive purpose-scoped webhook key — matches WebhookDispatcher on the server.
			hash_hkdf( 'sha256', $license_key, 32, 'wplicense-webhook-dispatch-v1' )
		);

		if ( ! hash_equals( $expected, $signature ) ) {
			return new WP_Error(
				'invalid_webhook_signature',
				'Webhook signature mismatch.',
				array( 'status' => 401 )
			);
		}

		return true;
	}
}
