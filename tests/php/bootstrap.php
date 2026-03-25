<?php
/**
 * PHPUnit bootstrap for WP Custom Dashboard unit tests.
 *
 * Provides lightweight stubs for WordPress functions so that
 * classes under includes/ can be loaded without a full WP install.
 */

defined( 'ABSPATH' ) || define( 'ABSPATH', '/tmp/fake-wp/' );
defined( 'MINUTE_IN_SECONDS' ) || define( 'MINUTE_IN_SECONDS', 60 );

require_once __DIR__ . '/wp-stubs.php';
require_once dirname( __DIR__, 2 ) . '/vendor/autoload.php';
