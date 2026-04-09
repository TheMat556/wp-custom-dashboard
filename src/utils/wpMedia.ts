/**
 * Thin wrapper around the WordPress media library picker (wp.media).
 *
 * The wp.media global is available when wp_enqueue_media() has been
 * called on the PHP side.
 */

declare global {
  interface Window {
    wp?: {
      media?: (options: {
        title: string;
        button: { text: string };
        library: { type: string };
        multiple: boolean;
      }) => WpMediaFrame;
    };
  }
}

interface WpMediaFrame {
  on(event: string, callback: () => void): void;
  open(): void;
  state(): {
    get(key: string): {
      first(): { toJSON(): { id: number; url: string } } | undefined;
    };
  };
}

export interface MediaSelection {
  id: number;
  url: string;
}

/**
 * Opens the WordPress media library picker and resolves with
 * the selected attachment, or null if the user cancelled.
 */
export function openMediaPicker(options?: {
  title?: string;
  buttonText?: string;
}): Promise<MediaSelection | null> {
  return new Promise((resolve) => {
    if (!window.wp?.media) {
      console.warn("[WP React UI] wp.media is not available");
      resolve(null);
      return;
    }

    const frame = window.wp.media({
      title: options?.title ?? "Select image",
      button: { text: options?.buttonText ?? "Use image" },
      library: { type: "image" },
      multiple: false,
    });

    let resolved = false;

    frame.on("select", () => {
      const selection = frame.state().get("selection").first();
      if (selection) {
        const attachment = selection.toJSON();
        resolved = true;
        resolve({ id: attachment.id, url: attachment.url });
      } else {
        resolved = true;
        resolve(null);
      }
    });

    frame.on("close", () => {
      if (!resolved) {
        resolve(null);
      }
    });

    frame.open();
  });
}
