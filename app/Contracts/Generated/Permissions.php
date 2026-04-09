<?php
/**
 * AUTO-GENERATED from contracts/source. Do not edit.
 */

declare(strict_types=1);

namespace WpReactUi\Contracts\Generated;

final class Permissions {
	public const MAP = array(
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
