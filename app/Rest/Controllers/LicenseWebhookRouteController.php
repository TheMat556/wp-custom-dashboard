<?php
/**
 * Public webhook endpoint for incoming license events.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\Rest\Controllers;

use WP_REST_Request;
use WpReactUi\License\WebhookListener;

defined( 'ABSPATH' ) || exit;

final class LicenseWebhookRouteController {
	private WebhookListener $listener;

	public function __construct( ?WebhookListener $listener = null ) {
		$this->listener = $listener ?? new WebhookListener();
	}

	public function handle( WP_REST_Request $request ) {
		$result = $this->listener->handle( $request );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( $result );
	}
}
