<?php

defined('ABSPATH') || exit;

class WP_React_UI_Branding_Settings {

    private const OPTION_GROUP = 'wp_react_ui_branding_settings';
    private const OPTION_NAME  = 'wp_react_ui_branding';
    private const PAGE_SLUG    = 'wp-react-ui-branding';
    private const SECTION_ID   = 'wp_react_ui_branding_section';

    private static string $page_hook = '';

    public static function init(): void {
        add_action('admin_init', [self::class, 'register_settings']);
        add_action('admin_menu', [self::class, 'register_page']);
        add_action('admin_enqueue_scripts', [self::class, 'enqueue_media']);
    }

    public static function register_settings(): void {
        register_setting(self::OPTION_GROUP, self::OPTION_NAME, [
            'type'              => 'array',
            'sanitize_callback' => [self::class, 'sanitize_settings'],
            'default'           => self::get_default_settings(),
        ]);

        add_settings_section(
            self::SECTION_ID,
            'Logos',
            [self::class, 'render_section_intro'],
            self::PAGE_SLUG
        );

        $fields = [
            'light_logo_id' => [
                'label'       => 'Light logo',
                'description' => 'Shown on light backgrounds. If no custom logo is set, the bundled default logo remains available to the frontend.',
                'title'       => 'Select light logo',
                'button_text' => 'Use light logo',
            ],
            'dark_logo_id' => [
                'label'       => 'Dark logo',
                'description' => 'Optional. If this is not set, the frontend should fall back to the light logo.',
                'title'       => 'Select dark logo',
                'button_text' => 'Use dark logo',
            ],
        ];

        foreach ($fields as $key => $field) {
            add_settings_field(
                $key,
                $field['label'],
                [self::class, 'render_logo_field'],
                self::PAGE_SLUG,
                self::SECTION_ID,
                [
                    'key'         => $key,
                    'description' => $field['description'],
                    'title'       => $field['title'],
                    'button_text' => $field['button_text'],
                ]
            );
        }
    }

    public static function register_page(): void {
        self::$page_hook = add_options_page(
            'WP React UI Branding',
            'WP React UI Branding',
            'manage_options',
            self::PAGE_SLUG,
            [self::class, 'render_page']
        );

        if (self::$page_hook !== '') {
            add_action('admin_footer-' . self::$page_hook, [self::class, 'print_media_script']);
        }
    }

    public static function enqueue_media(string $hook_suffix): void {
        if ($hook_suffix !== self::$page_hook) {
            return;
        }

        wp_enqueue_media();
    }

    public static function sanitize_settings($input): array {
        $input = is_array($input) ? $input : [];

        return [
            'light_logo_id' => self::sanitize_logo_id($input['light_logo_id'] ?? 0, 'light'),
            'dark_logo_id'  => self::sanitize_logo_id($input['dark_logo_id'] ?? 0, 'dark'),
        ];
    }

    public static function render_section_intro(): void {
        echo '<p>Choose logos for the admin UI. The dark logo is optional and falls back to the light logo when unset.</p>';
    }

    public static function render_logo_field(array $args): void {
        $key         = (string) ($args['key'] ?? '');
        $description = (string) ($args['description'] ?? '');
        $title       = (string) ($args['title'] ?? 'Select image');
        $button_text = (string) ($args['button_text'] ?? 'Use image');
        $field_id    = self::get_field_id($key);
        $preview_id  = $field_id . '_preview';
        $logo_id     = self::get_logo_id($key);
        $image_url   = self::get_attachment_url($logo_id);
        ?>
        <div class="wp-react-ui-branding-field">
            <input
                type="hidden"
                id="<?php echo esc_attr($field_id); ?>"
                name="<?php echo esc_attr(self::OPTION_NAME . '[' . $key . ']'); ?>"
                value="<?php echo esc_attr((string) $logo_id); ?>"
            >

            <div id="<?php echo esc_attr($preview_id); ?>" style="margin-bottom:12px;">
                <?php if ($image_url) : ?>
                    <img src="<?php echo esc_url($image_url); ?>" alt="" style="display:block;max-width:240px;height:auto;">
                <?php endif; ?>
            </div>

            <p>
                <button
                    type="button"
                    class="button wp-react-ui-branding-select"
                    data-target="<?php echo esc_attr($field_id); ?>"
                    data-preview="<?php echo esc_attr($preview_id); ?>"
                    data-title="<?php echo esc_attr($title); ?>"
                    data-button-text="<?php echo esc_attr($button_text); ?>"
                >
                    Select image
                </button>

                <button
                    type="button"
                    class="button wp-react-ui-branding-remove"
                    data-target="<?php echo esc_attr($field_id); ?>"
                    data-preview="<?php echo esc_attr($preview_id); ?>"
                    <?php if (!$image_url) : ?>style="display:none;"<?php endif; ?>
                >
                    Remove image
                </button>
            </p>

            <?php if ($description !== '') : ?>
                <p class="description"><?php echo esc_html($description); ?></p>
            <?php endif; ?>
        </div>
        <?php
    }

    public static function render_page(): void {
        if (!current_user_can('manage_options')) {
            wp_die(
                esc_html__('You do not have sufficient permissions to access this page.'),
                403
            );
        }
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <?php settings_errors(self::OPTION_NAME); ?>

            <form action="options.php" method="post">
                <?php
                settings_fields(self::OPTION_GROUP);
                do_settings_sections(self::PAGE_SLUG);
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }

    public static function print_media_script(): void {
        ?>
        <script>
            document.addEventListener('DOMContentLoaded', function () {
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
                            button: {
                                text: button.dataset.buttonText || 'Use image'
                            },
                            library: {
                                type: 'image'
                            },
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
            });
        </script>
        <?php
    }

    public static function get_frontend_branding(): array {
        $site_name = (string) get_bloginfo('name');
        $light_url = self::get_attachment_url(self::get_logo_id('light_logo_id'));
        $dark_url  = self::get_attachment_url(self::get_logo_id('dark_logo_id'));

        return [
            'siteName' => $site_name,
            'logos'    => [
                'lightUrl'   => $light_url ?: null,
                'darkUrl'    => $dark_url ?: null,
                'defaultUrl' => self::get_default_logo_url(),
            ],
        ];
    }

    private static function sanitize_logo_id($value, string $variant): int {
        $attachment_id = absint($value);

        if ($attachment_id === 0) {
            return 0;
        }

        $attachment = get_post($attachment_id);
        if (!$attachment || $attachment->post_type !== 'attachment' || !wp_attachment_is_image($attachment_id)) {
            add_settings_error(
                self::OPTION_NAME,
                'invalid_' . $variant . '_logo',
                sprintf('The selected %s logo must be an image attachment.', $variant)
            );

            return 0;
        }

        return $attachment_id;
    }

    private static function get_logo_id(string $key): int {
        $settings = self::get_settings();

        return absint($settings[$key] ?? 0);
    }

    private static function get_settings(): array {
        $settings = get_option(self::OPTION_NAME, []);

        if (!is_array($settings)) {
            $settings = [];
        }

        return wp_parse_args($settings, self::get_default_settings());
    }

    private static function get_default_settings(): array {
        return [
            'light_logo_id' => 0,
            'dark_logo_id'  => 0,
        ];
    }

    private static function get_field_id(string $key): string {
        return self::OPTION_NAME . '_' . $key;
    }

    private static function get_attachment_url(int $attachment_id): ?string {
        if ($attachment_id === 0) {
            return null;
        }

        $image_url = wp_get_attachment_image_url($attachment_id, 'full');

        return $image_url ?: null;
    }

    private static function get_default_logo_url(): string {
        return plugins_url('dist/logo.svg', dirname(__DIR__) . '/wp-custom-dashboard.php');
    }
}
