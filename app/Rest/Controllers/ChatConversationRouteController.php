<?php
/**
 * Native chat conversation REST controller.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Controllers;

use WP_Error;
use WP_REST_Request;
use WpReactUi\Chat\ChatConfig;
use WpReactUi\License\LicenseGate;
use WpReactUi\Rest\RateLimiter;
use WpReactUi\Rest\Services\ChatConversationService;

defined( 'ABSPATH' ) || exit;

final class ChatConversationRouteController {
	private ChatConversationService $service;

	public function __construct( ?ChatConversationService $service = null ) {
		$this->service = $service ?? new ChatConversationService();
	}

	public function can_read(): bool {
		return current_user_can( 'read' );
	}

	public function bootstrap( WP_REST_Request $request ) {
		if ( ! LicenseGate::can( 'chat' ) ) {
			return new \WP_Error(
				'license_feature_disabled',
				'Chat access requires an active license.',
				array(
					'status'  => 403,
					'feature' => 'chat',
				)
			);
		}

		$result = $this->service->get_bootstrap_payload(
			$request->get_param( 'selectedThreadId' ) ? absint( $request->get_param( 'selectedThreadId' ) ) : null
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( $result );
	}

	public function poll( WP_REST_Request $request ) {
		if ( ! LicenseGate::can( 'chat' ) ) {
			return new \WP_Error(
				'license_feature_disabled',
				'Chat access requires an active license.',
				array(
					'status'  => 403,
					'feature' => 'chat',
				)
			);
		}

		$result = $this->service->get_poll_payload(
			absint( $request->get_param( 'selectedThreadId' ) ),
			absint( $request->get_param( 'afterMessageId' ) )
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( $result );
	}

	public function send( WP_REST_Request $request ) {
		$rate_check = RateLimiter::enforce( 'chat_send', RateLimiter::LIMIT_CHAT_SEND );
		if ( is_wp_error( $rate_check ) ) {
			return $rate_check;
		}

		$raw_message = $request->get_param( 'message' );

		if ( ! is_string( $raw_message ) ) {
			return new WP_Error( 'invalid_message', 'Message must be a string.', array( 'status' => 400 ) );
		}

		$message = sanitize_textarea_field( $raw_message );

		if ( mb_strlen( $message ) > ChatConfig::MAX_MESSAGE_LENGTH ) {
			return new WP_Error(
				'message_too_long',
				sprintf( 'Message exceeds %d character limit.', ChatConfig::MAX_MESSAGE_LENGTH ),
				array( 'status' => 400 )
			);
		}

		if ( '' === $message ) {
			return new WP_Error( 'empty_message', 'Message cannot be empty.', array( 'status' => 400 ) );
		}

		if ( ! LicenseGate::can( 'chat' ) ) {
			return new \WP_Error(
				'license_feature_disabled',
				'Chat access requires an active license.',
				array(
					'status'  => 403,
					'feature' => 'chat',
				)
			);
		}

		$result = $this->service->send_message(
			absint( $request->get_param( 'selectedThreadId' ) ),
			$message
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( $result );
	}
}
