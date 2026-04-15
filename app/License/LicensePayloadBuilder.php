<?php
/**
 * Builds and serializes license payloads for the frontend.
 *
 * Pure serialization — no side effects, no WordPress options/transients.
 *
 * @package WP_React_UI
 */

declare(strict_types=1);

namespace WpReactUi\License;

defined( 'ABSPATH' ) || exit;

class LicensePayloadBuilder {
	/**
	 * Cached license state from the transient (or default).
	 *
	 * @var array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, keyPrefix: ?string, lastValidatedAt: ?string}
	 */
	private readonly array $cached_state;

	/**
	 * Has a stored license key.
	 *
	 * @var bool
	 */
	private readonly bool $has_key;

	/**
	 * Is the license server configured.
	 *
	 * @var bool
	 */
	private readonly bool $server_configured;

	/**
	 * Constructor.
	 *
	 * @param array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, keyPrefix: ?string, lastValidatedAt: ?string} $cached_state     Cached state.
	 * @param bool                                                                                                                                                                            $has_key          Whether a key is stored.
	 * @param bool                                                                                                                                                                            $server_configured Whether the server is configured.
	 */
	public function __construct(
		array $cached_state,
		bool $has_key,
		bool $server_configured
	) {
		$this->cached_state       = $cached_state;
		$this->has_key            = $has_key;
		$this->server_configured  = $server_configured;
	}

	/**
	 * Builds the full payload with public metadata.
	 *
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, hasKey: bool, keyPrefix: ?string, serverConfigured: bool}
	 */
	public function build(): array {
		return array(
			'status'             => $this->cached_state['status'],
			'role'               => $this->cached_state['role'],
			'tier'               => $this->cached_state['tier'],
			'expiresAt'          => $this->cached_state['expiresAt'],
			'features'           => $this->cached_state['features'],
			'graceDaysRemaining' => $this->cached_state['graceDaysRemaining'],
			'hasKey'             => $this->has_key,
			'keyPrefix'          => $this->cached_state['keyPrefix'],
			'serverConfigured'   => $this->server_configured,
		);
	}

	/**
	 * Builds a redacted public payload (non-admin users do not see features/role/tier).
	 *
	 * @return array{status: string, role: ?string, tier: ?string, expiresAt: ?string, features: array<int, string>, graceDaysRemaining: int, hasKey: bool, keyPrefix: ?string, serverConfigured: bool}
	 */
	public function buildPublic(): array {
		// For now, public and full are the same.
		// In the future, non-admin users might see a redacted version.
		return $this->build();
	}
}
