<?php
/**
 * Activity log for WP React UI.
 *
 * Hooks into common WordPress admin actions and records an audit trail
 * stored as an array in the `wp_react_ui_activity_log` option.
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

class WP_React_UI_Activity_Log {

	const OPTION_KEY  = 'wp_react_ui_activity_log';
	const MAX_ENTRIES = 500;

	/**
	 * Registers WordPress hooks that capture admin activity.
	 */
	public static function init(): void {
		// Post lifecycle.
		add_action( 'save_post', array( __CLASS__, 'on_save_post' ), 10, 3 );
		add_action( 'delete_post', array( __CLASS__, 'on_delete_post' ), 10, 2 );

		// Comments.
		add_action( 'wp_insert_comment', array( __CLASS__, 'on_new_comment' ), 10, 2 );
		add_action( 'transition_comment_status', array( __CLASS__, 'on_comment_status' ), 10, 3 );

		// Users.
		add_action( 'user_register', array( __CLASS__, 'on_user_register' ) );
		add_action( 'delete_user', array( __CLASS__, 'on_delete_user' ), 10, 2 );

		// Plugins.
		add_action( 'activated_plugin', array( __CLASS__, 'on_activate_plugin' ) );
		add_action( 'deactivated_plugin', array( __CLASS__, 'on_deactivate_plugin' ) );

		// Theme.
		add_action( 'after_switch_theme', array( __CLASS__, 'on_switch_theme' ), 10, 2 );

		// Settings.
		add_action( 'updated_option', array( __CLASS__, 'on_update_option' ), 10, 3 );

		// Login.
		add_action( 'wp_login', array( __CLASS__, 'on_login' ), 10, 2 );
	}

	/**
	 * Records a single activity entry.
	 *
	 * @param string $action      Action identifier.
	 * @param string $object_type Object type (post, user, plugin, theme, option).
	 * @param string $object_title Human-readable title.
	 * @param int    $object_id   Optional numeric ID.
	 * @param string $details     Optional extra details.
	 */
	public static function record( string $action, string $object_type, string $object_title, int $object_id = 0, string $details = '' ): void {
		$user = wp_get_current_user();

		$entry = array(
			'user_id'      => $user->ID,
			'user_name'    => '' !== $user->display_name ? $user->display_name : $user->user_login,
			'action'       => $action,
			'object_type'  => $object_type,
			'object_id'    => $object_id,
			'object_title' => mb_substr( wp_strip_all_tags( $object_title ), 0, 200 ),
			'details'      => mb_substr( $details, 0, 500 ),
			'created_at'   => gmdate( 'Y-m-d H:i:s' ),
		);

		$log = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $log ) ) {
			$log = array();
		}

		// Prepend newest first and trim.
		array_unshift( $log, $entry );
		$log = array_slice( $log, 0, self::MAX_ENTRIES );

		update_option( self::OPTION_KEY, $log, false );
	}

	// ── Callbacks ────────────────────────────────────────────────────────────

	/**
	 * @param int      $post_id Post ID.
	 * @param \WP_Post $post    Post object.
	 * @param bool     $update  Whether this is an update.
	 */
	public static function on_save_post( int $post_id, \WP_Post $post, bool $update ): void {
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}
		if ( in_array( $post->post_type, array( 'nav_menu_item', 'revision', 'customize_changeset' ), true ) ) {
			return;
		}

		$action = $update ? 'post_updated' : 'post_created';
		$title  = '' !== $post->post_title ? $post->post_title : '(no title)';
		self::record( $action, 'post', $title, $post_id, "Type: {$post->post_type}, Status: {$post->post_status}" );
	}

	/**
	 * @param int      $post_id Post ID.
	 * @param \WP_Post $post    Post object.
	 */
	public static function on_delete_post( int $post_id, \WP_Post $post ): void {
		if ( in_array( $post->post_type, array( 'nav_menu_item', 'revision', 'customize_changeset' ), true ) ) {
			return;
		}
		$title = '' !== $post->post_title ? $post->post_title : '(no title)';
		self::record( 'post_deleted', 'post', $title, $post_id, "Type: {$post->post_type}" );
	}

	/**
	 * @param int         $comment_id Comment ID.
	 * @param \WP_Comment $comment    Comment object.
	 */
	public static function on_new_comment( int $comment_id, \WP_Comment $comment ): void {
		$title = mb_substr( $comment->comment_content, 0, 80 );
		self::record( 'comment_created', 'comment', $title, $comment_id );
	}

	/**
	 * @param string      $new_status New status.
	 * @param string      $old_status Old status.
	 * @param \WP_Comment $comment    Comment object.
	 */
	public static function on_comment_status( string $new_status, string $old_status, \WP_Comment $comment ): void {
		if ( $new_status === $old_status ) {
			return;
		}
		$title = mb_substr( $comment->comment_content, 0, 80 );
		self::record( 'comment_status_changed', 'comment', $title, (int) $comment->comment_ID, "{$old_status} → {$new_status}" );
	}

	/**
	 * @param int $user_id User ID.
	 */
	public static function on_user_register( int $user_id ): void {
		$user = get_userdata( $user_id );
		self::record( 'user_created', 'user', $user ? $user->display_name : "User #{$user_id}", $user_id );
	}

	/**
	 * @param int      $user_id   User ID.
	 * @param int|null $_reassign Reassign ID (unused).
	 */
	public static function on_delete_user( int $user_id, $_reassign ): void {
		$user = get_userdata( $user_id );
		self::record( 'user_deleted', 'user', $user ? $user->display_name : "User #{$user_id}", $user_id );
	}

	/**
	 * @param string $plugin Plugin basename.
	 */
	public static function on_activate_plugin( string $plugin ): void {
		self::record( 'plugin_activated', 'plugin', $plugin );
	}

	/**
	 * @param string $plugin Plugin basename.
	 */
	public static function on_deactivate_plugin( string $plugin ): void {
		self::record( 'plugin_deactivated', 'plugin', $plugin );
	}

	/**
	 * @param string    $name     Theme name.
	 * @param \WP_Theme $old_theme Previous theme.
	 */
	public static function on_switch_theme( string $name, \WP_Theme $old_theme ): void {
		self::record( 'theme_switched', 'theme', $name, 0, "From: {$old_theme->get('Name')}" );
	}

	/**
	 * Only log core settings updates, skip transients and internal options.
	 *
	 * @param string $option      Option name.
	 * @param mixed  $_old_value  Old value (unused).
	 * @param mixed  $_value      New value (unused).
	 */
	public static function on_update_option( string $option, $_old_value, $_value ): void {
		$tracked = array( 'blogname', 'blogdescription', 'siteurl', 'home', 'admin_email', 'permalink_structure' );
		if ( ! in_array( $option, $tracked, true ) ) {
			return;
		}
		self::record( 'option_updated', 'option', $option );
	}

	/**
	 * @param string   $user_login Username.
	 * @param \WP_User $user       User object.
	 */
	public static function on_login( string $user_login, \WP_User $user ): void {
		self::record( 'user_login', 'user', $user->display_name, $user->ID );
	}
}
