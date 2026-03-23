/**
 * URL utilities for the iframe shell architecture.
 *
 * The embed parameter (`wp_shell_embed=1`) is the sole coordination mechanism
 * between the React shell (parent document) and WordPress admin pages (iframe).
 * When PHP sees this param it suppresses native chrome and injects the
 * postMessage communication script.
 */

const EMBED_PARAM = "wp_shell_embed";
const EMBED_VALUE = "1";

function normalizeAdminPathname(pathname: string): string {
  if (/\/wp-admin\/?$/.test(pathname)) {
    return `${pathname.replace(/\/$/, "")}/index.php`;
  }

  return pathname;
}

/** Pages that must be the top-level document — they cannot run inside an iframe. */
export const DEFAULT_BREAKOUT_PAGENOW = [
  "post.php",
  "post-new.php",
  "site-editor.php",
  "customize.php",
  "export.php",
];

/** Returns true if the URL is a same-origin wp-admin URL. */
export function isAdminUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname.startsWith("/wp-admin");
  } catch {
    return false;
  }
}

/** Append `?wp_shell_embed=1` to an admin URL so PHP renders without native chrome. */
export function toEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set(EMBED_PARAM, EMBED_VALUE);
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Remove the embed parameter from a URL, returning the clean public URL. */
export function fromEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.delete(EMBED_PARAM);
    parsed.pathname = normalizeAdminPathname(parsed.pathname);
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Derive a sidebar menu key from an admin URL.
 *
 * Key rules (matching WordPress menu registration):
 *  - `?page=foo`        → "foo"
 *  - `/wp-admin/bar.php` → "bar.php"
 */
export function normalizeToMenuKey(url: string): string | undefined {
  try {
    const parsed = new URL(fromEmbedUrl(url), window.location.origin);
    const page = parsed.searchParams.get("page");
    if (page) return page;
    return parsed.pathname.split("/").filter(Boolean).pop();
  } catch {
    return undefined;
  }
}

/**
 * Returns true for pages that must break out of the iframe and load as the
 * top-level document (e.g. Gutenberg, full-site editor).
 */
export function isBreakoutUrl(
  url: string,
  breakoutPagenow: string[] = DEFAULT_BREAKOUT_PAGENOW
): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    const filename = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
    return breakoutPagenow.includes(filename);
  } catch {
    return false;
  }
}
