<?php
/**
 * REST-facing native chat conversation service.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Services;

use WpReactUi\Chat\NativeChatClient;

defined( 'ABSPATH' ) || exit;

class ChatConversationService {
	private NativeChatClient $client;

	public function __construct( ?NativeChatClient $client = null ) {
		$this->client = $client ?? new NativeChatClient();
	}

	/**
	 * @param int|null $selected_thread_id Optional thread selection override.
	 * @return array<string, mixed>|\WP_Error
	 */
	public function get_bootstrap_payload( ?int $selected_thread_id = null ) {
		$payload = array();

		if ( null !== $selected_thread_id && $selected_thread_id > 0 ) {
			$payload['selectedThreadId'] = $selected_thread_id;
		}

		return $this->client->bootstrap( $payload );
	}

	/**
	 * @param int $selected_thread_id Thread identifier to refresh.
	 * @param int $after_message_id   Last message identifier already loaded by the client.
	 * @return array<string, mixed>|\WP_Error
	 */
	public function get_poll_payload( int $selected_thread_id, int $after_message_id = 0 ) {
		return $this->client->poll( $selected_thread_id, $after_message_id );
	}

	/**
	 * @param int    $selected_thread_id Thread identifier receiving the message.
	 * @param string $message            Message body to send.
	 * @return array<string, mixed>|\WP_Error
	 */
	public function send_message( int $selected_thread_id, string $message ) {
		return $this->client->send( $selected_thread_id, $message );
	}

	/**
	 * @param int $selected_thread_id Thread identifier to archive.
	 * @return array<string, mixed>|\WP_Error
	 */
	public function archive_thread( int $selected_thread_id ) {
		return $this->client->archive( $selected_thread_id );
	}

	/**
	 * @param int $selected_thread_id Thread identifier to unarchive.
	 * @return array<string, mixed>|\WP_Error
	 */
	public function unarchive_thread( int $selected_thread_id ) {
		return $this->client->unarchive( $selected_thread_id );
	}

	/**
	 * @param int $selected_thread_id Thread identifier to delete permanently.
	 * @return array<string, mixed>|\WP_Error
	 */
	public function delete_thread( int $selected_thread_id ) {
		return $this->client->delete_thread( $selected_thread_id );
	}
}
