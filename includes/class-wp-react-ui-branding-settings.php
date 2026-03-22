<?php
/**
 * Branding settings for WP React UI.
 *
 * @package WP_React_UI
 */

defined( 'ABSPATH' ) || exit;

/**
 * Handles logo upload settings and frontend branding data.
 */
class WP_React_UI_Branding_Settings {

	/**
	 * Settings option group identifier.
	 *
	 * @var string
	 */
	private const OPTION_GROUP = 'wp_react_ui_branding_settings';

	/**
	 * Settings option name stored in wp_options.
	 *
	 * @var string
	 */
	private const OPTION_NAME = 'wp_react_ui_branding';

	/**
	 * Admin page slug.
	 *
	 * @var string
	 */
	private const PAGE_SLUG = 'wp-react-ui-branding';

	/**
	 * Settings section identifier.
	 *
	 * @var string
	 */
	private const SECTION_ID = 'wp_react_ui_branding_section';

	/**
	 * Hook suffix returned by add_options_page().
	 *
	 * @var string
	 */
	private static string $page_hook = '';

	/**
	 * Registers all hooks.
	 *
	 * @return void
	 */
	public static function init(): void {
		add_action( 'admin_init', array( self::class, 'register_settings' ) );
		add_action( 'admin_menu', array( self::class, 'register_page' ) );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue_media' ) );
	}

	/**
	 * Registers the settings, sections, and fields with the Settings API.
	 *
	 * @return void
	 */
	public static function register_settings(): void {
		register_setting(
			self::OPTION_GROUP,
			self::OPTION_NAME,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( self::class, 'sanitize_settings' ),
				'default'           => self::get_default_settings(),
			)
		);

		add_settings_section(
			self::SECTION_ID,
			'Logos',
			array( self::class, 'render_section_intro' ),
			self::PAGE_SLUG
		);

		$fields = array(
			'light_logo_id' => array(
				'label'       => 'Light logo',
				'description' => 'Shown on light backgrounds. If no custom logo is set, the bundled default logo remains available to the frontend.',
				'title'       => 'Select light logo',
				'button_text' => 'Use light logo',
			),
			'dark_logo_id'  => array(
				'label'       => 'Dark logo',
				'description' => 'Optional. If this is not set, the frontend should fall back to the light logo.',
				'title'       => 'Select dark logo',
				'button_text' => 'Use dark logo',
			),
		);

		foreach ( $fields as $key => $field ) {
			add_settings_field(
				$key,
				$field['label'],
				array( self::class, 'render_logo_field' ),
				self::PAGE_SLUG,
				self::SECTION_ID,
				array(
					'key'         => $key,
					'description' => $field['description'],
					'title'       => $field['title'],
					'button_text' => $field['button_text'],
				)
			);
		}
	}

	/**
	 * Registers the options sub-page under Settings.
	 *
	 * @return void
	 */
	public static function register_page(): void {
		self::$page_hook = add_options_page(
			'WP React UI Branding',
			'WP React UI Branding',
			'manage_options',
			self::PAGE_SLUG,
			array( self::class, 'render_page' )
		);

		if ( '' !== self::$page_hook ) {
			add_action( 'admin_footer-' . self::$page_hook, array( self::class, 'print_media_script' ) );
		}
	}

	/**
	 * Enqueues the WordPress media uploader on the branding settings page.
	 *
	 * @param string $hook_suffix The current admin page hook suffix.
	 * @return void
	 */
	public static function enqueue_media( string $hook_suffix ): void {
		if ( $hook_suffix !== self::$page_hook ) {
			return;
		}

		wp_enqueue_media();
	}

	/**
	 * Sanitizes and validates the submitted settings array.
	 *
	 * @param mixed $input Raw input from the settings form.
	 * @return array Sanitized settings array.
	 */
	public static function sanitize_settings( $input ): array {
		$input = is_array( $input ) ? $input : array();

		return array(
			'light_logo_id' => self::sanitize_logo_id( $input['light_logo_id'] ?? 0, 'light' ),
			'dark_logo_id'  => self::sanitize_logo_id( $input['dark_logo_id'] ?? 0, 'dark' ),
		);
	}

	/**
	 * Renders the section introduction text.
	 *
	 * @return void
	 */
	public static function render_section_intro(): void {
		echo '<p>Choose logos for the admin UI. The dark logo is optional and falls back to the light logo when unset.</p>';
	}

	/**
	 * Renders a single logo upload field.
	 *
	 * @param array $args Field arguments including key, description, title, and button_text.
	 * @return void
	 */
	public static function render_logo_field( array $args ): void {
		$key         = (string) ( $args['key'] ?? '' );
		$description = (string) ( $args['description'] ?? '' );
		$title       = (string) ( $args['title'] ?? 'Select image' );
		$button_text = (string) ( $args['button_text'] ?? 'Use image' );
		$field_id    = self::get_field_id( $key );
		$preview_id  = $field_id . '_preview';
		$logo_id     = self::get_logo_id( $key );
		$image_url   = self::get_attachment_url( $logo_id );
		?>
		<div class="wp-react-ui-branding-field">
			<input
				type="hidden"
				id="<?php echo esc_attr( $field_id ); ?>"
				name="<?php echo esc_attr( self::OPTION_NAME . '[' . $key . ']' ); ?>"
				value="<?php echo esc_attr( (string) $logo_id ); ?>"
			>

			<div id="<?php echo esc_attr( $preview_id ); ?>" style="margin-bottom:12px;">
				<?php if ( $image_url ) : ?>
					<img src="<?php echo esc_url( $image_url ); ?>" alt="" style="display:block;max-width:240px;height:auto;">
				<?php endif; ?>
			</div>

			<p>
				<button
					type="button"
					class="button wp-react-ui-branding-select"
					data-target="<?php echo esc_attr( $field_id ); ?>"
					data-preview="<?php echo esc_attr( $preview_id ); ?>"
					data-title="<?php echo esc_attr( $title ); ?>"
					data-button-text="<?php echo esc_attr( $button_text ); ?>"
				>
					Select image
				</button>

				<button
					type="button"
					class="button wp-react-ui-branding-remove"
					data-target="<?php echo esc_attr( $field_id ); ?>"
					data-preview="<?php echo esc_attr( $preview_id ); ?>"
					<?php
					if ( ! $image_url ) :
						?>
						style="display:none;"<?php endif; ?>
				>
					Remove image
				</button>
			</p>

			<?php if ( '' !== $description ) : ?>
				<p class="description"><?php echo esc_html( $description ); ?></p>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Renders the full branding settings page.
	 *
	 * @return void
	 */
	public static function render_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die(
				esc_html__( 'You do not have sufficient permissions to access this page.' ),
				403
			);
		}
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
			<?php settings_errors( self::OPTION_NAME ); ?>

			<form action="options.php" method="post">
				<?php
				settings_fields( self::OPTION_GROUP );
				do_settings_sections( self::PAGE_SLUG );
				submit_button();
				?>
			</form>
		</div>
		<?php
	}

	/**
	 * Prints the inline JavaScript for the media uploader buttons.
	 *
	 * @return void
	 */
	public static function print_media_script(): void {
		?>
		<script>
			(function () {
				const updatePreview = function (preview, imageUrl) {
					preview.innerHTML = '';

					if (!imageUrl) {
						return;
					}

					const image = document.createElement('img');
					image.src = imageUrl;
					image.alt = '';
					image.style.display = 'block';
					image.style.maxWidth = '240px';
					image.style.height = 'auto';

					preview.appendChild(image);
				};

				document.querySelectorAll('.wp-react-ui-branding-select').forEach(function (button) {
					button.addEventListener('click', function (event) {
						event.preventDefault();

						const input = document.getElementById(button.dataset.target);
						const preview = document.getElementById(button.dataset.preview);
						const removeButton = button.parentElement.querySelector('.wp-react-ui-branding-remove');

						if (!input || !preview || typeof wp === 'undefined' || !wp.media) {
							return;
						}

						const frame = wp.media({
							title: button.dataset.title || 'Select image',
							button: { text: button.dataset.buttonText || 'Use image' },
							library: { type: 'image' },
							multiple: false
						});

						frame.on('select', function () {
							const selection = frame.state().get('selection').first();

							if (!selection) {
								return;
							}

							const attachment = selection.toJSON();
							input.value = attachment.id || 0;
							updatePreview(preview, attachment.url || '');

							if (removeButton) {
								removeButton.style.display = '';
							}
						});

						frame.open();
					});
				});

				document.querySelectorAll('.wp-react-ui-branding-remove').forEach(function (button) {
					button.addEventListener('click', function (event) {
						event.preventDefault();

						const input = document.getElementById(button.dataset.target);
						const preview = document.getElementById(button.dataset.preview);

						if (!input || !preview) {
							return;
						}

						input.value = '0';
						updatePreview(preview, '');
						button.style.display = 'none';
					});
				});
			})();
		</script>
		<?php
	}

	/**
	 * Returns the branding data array for the frontend.
	 *
	 * @return array Branding data including site name and logo URLs.
	 */
	public static function get_frontend_branding(): array {
		$site_name = (string) get_bloginfo( 'name' );
		$light_url = self::get_attachment_url( self::get_logo_id( 'light_logo_id' ) );
		$dark_url  = self::get_attachment_url( self::get_logo_id( 'dark_logo_id' ) );

		if ( null === $light_url ) {
			$light_url_value = null;
		} else {
			$light_url_value = $light_url;
		}

		if ( null === $dark_url ) {
			$dark_url_value = null;
		} else {
			$dark_url_value = $dark_url;
		}

		return array(
			'siteName' => $site_name,
			'logos'    => array(
				'lightUrl'   => $light_url_value,
				'darkUrl'    => $dark_url_value,
				'defaultUrl' => self::get_default_logo_url(),
			),
		);
	}

	/**
	 * Sanitizes and validates a logo attachment ID.
	 *
	 * @param mixed  $value   The raw value to sanitize.
	 * @param string $variant Logo variant name for error messages (light or dark).
	 * @return int Sanitized attachment ID, or 0 if invalid.
	 */
	private static function sanitize_logo_id( $value, string $variant ): int {
		$attachment_id = absint( $value );

		if ( 0 === $attachment_id ) {
			return 0;
		}

		$attachment = get_post( $attachment_id );
		if ( ! $attachment || 'attachment' !== $attachment->post_type || ! wp_attachment_is_image( $attachment_id ) ) {
			add_settings_error(
				self::OPTION_NAME,
				'invalid_' . $variant . '_logo',
				sprintf( 'The selected %s logo must be an image attachment.', $variant )
			);

			return 0;
		}

		return $attachment_id;
	}

	/**
	 * Returns the stored attachment ID for the given logo key.
	 *
	 * @param string $key Settings key (light_logo_id or dark_logo_id).
	 * @return int Attachment ID or 0 if not set.
	 */
	private static function get_logo_id( string $key ): int {
		$settings = self::get_settings();

		return absint( $settings[ $key ] ?? 0 );
	}

	/**
	 * Returns the current settings merged with defaults.
	 *
	 * @return array Settings array.
	 */
	private static function get_settings(): array {
		$settings = get_option( self::OPTION_NAME, array() );

		if ( ! is_array( $settings ) ) {
			$settings = array();
		}

		return wp_parse_args( $settings, self::get_default_settings() );
	}

	/**
	 * Returns the default settings array.
	 *
	 * @return array Default settings.
	 */
	private static function get_default_settings(): array {
		return array(
			'light_logo_id' => 0,
			'dark_logo_id'  => 0,
		);
	}

	/**
	 * Returns the settings field HTML ID for the given key.
	 *
	 * @param string $key Settings key.
	 * @return string Field ID.
	 */
	private static function get_field_id( string $key ): string {
		return self::OPTION_NAME . '_' . $key;
	}

	/**
	 * Returns the full URL for an attachment, or null if not found.
	 *
	 * @param int $attachment_id Attachment post ID.
	 * @return string|null Full URL or null.
	 */
	private static function get_attachment_url( int $attachment_id ): ?string {
		if ( 0 === $attachment_id ) {
			return null;
		}

		$image_url = wp_get_attachment_image_url( $attachment_id, 'full' );

		if ( ! $image_url ) {
			return null;
		}

		return $image_url;
	}

	/**
	 * Returns the URL of the bundled default logo SVG.
	 *
	 * @return string Default logo URL.
	 */
	private static function get_default_logo_url(): string {
		return plugins_url( 'dist/logo.svg', dirname( __DIR__ ) . '/wp-custom-dashboard.php' );
	}
}