<?php

declare(strict_types=1);

/**
 * AUTO-GENERATED from contracts/source. Do not edit.
 */

namespace WpReactUi\Contracts\Generated;

defined( 'ABSPATH' ) || exit;

final class Permissions {
	public const MAP = array(
		'public' => array(
			'kind' => 'public',
			'description' => 'Accessible without authentication.'
		),
		'authenticated' => array(
			'kind' => 'authenticated',
			'description' => 'Any logged-in WordPress user.'
		),
		'read' => array(
			'kind' => 'capability',
			'capability' => 'read',
			'description' => 'Any user with the WordPress read capability.'
		),
		'manage_options' => array(
			'kind' => 'capability',
			'capability' => 'manage_options',
			'description' => 'Administrators or roles with manage_options.'
		)
	);
}
