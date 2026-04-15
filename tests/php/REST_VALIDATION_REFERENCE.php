<?php
/**
 * REST API Argument Validation Reference.
 *
 * This file documents the validation applied to all REST route arguments.
 * For integration tests that require full WordPress setup, see the note below.
 *
 * @package WP_React_UI
 */

/**
 * VALIDATION SUMMARY
 * ==================
 *
 * All REST routes now enforce input validation at the route registration layer
 * using validate_callback. Invalid requests return HTTP 400 with descriptive errors.
 *
 * Routes and validation rules:
 *
 * POST /wp-react-ui/v1/theme
 *   - theme (required, string): enum('light', 'dark', 'system')
 *
 * POST /wp-react-ui/v1/chat/bootstrap
 *   - selectedThreadId (optional, integer): >= 0
 *
 * POST /wp-react-ui/v1/chat/poll
 *   - selectedThreadId (required, integer): >= 0
 *   - afterMessageId (required, integer): >= 0
 *
 * POST /wp-react-ui/v1/chat/send
 *   - selectedThreadId (required, integer): >= 0
 *   - message (required, string): 1-2000 multibyte characters
 *
 * GET /wp-react-ui/v1/activity
 *   - page (optional, integer, default=1): >= 1
 *   - perPage (optional, integer, default=20): 1-50
 *   - userId (optional, integer): >= 0
 *   - action (optional, string): max 255 chars
 *
 * POST /wp-react-ui/v1/license/activate
 *   - licenseKey (required, string): 8-512 chars
 *
 * POST /wp-react-ui/v1/license/settings
 *   - serverUrl (optional, string): valid URL format
 *
 *
 * TESTING
 * =======
 *
 * Unit Tests (pure PHP, no WP bootstrap):
 *   - tests/php/RestValidatorTest.php — tests RestValidator class directly
 *   Run with: ./vendor/bin/phpunit tests/php/RestValidatorTest.php
 *
 * Integration Tests (require full WordPress setup):
 *   Integration tests for the full REST validation pipeline should be added
 *   in a separate file that extends WP_UnitTestCase and uses rest_get_server()->dispatch().
 *   These tests would verify that invalid requests return 400, valid requests pass
 *   through to handlers, etc. They require the full WordPress bootstrap which is
 *   typically available only in the full plugin test environment, not in the lightweight
 *   unit test bootstrap.
 *
 *
 * VALIDATOR CLASSES
 * =================
 *
 * All validation is handled by RestValidator class, which provides:
 *   - validate_string()
 *   - validate_optional_string()
 *   - validate_license_key()
 *   - validate_url()
 *   - validate_optional_url()
 *   - validate_integer()
 *   - validate_optional_integer()
 *   - validate_enum()
 *   - validate_boolean()
 *   - validate_mb_string()
 *   - validate_optional_mb_string()
 */
