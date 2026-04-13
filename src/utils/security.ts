/**
 * Shared security utilities for the React shell.
 */

/**
 * Returns true when `url` resolves to the same origin as the current page.
 *
 * Relative URLs (e.g. "/wp-admin/edit.php") are always considered same-origin
 * because the URL constructor resolves them against window.location.href before
 * comparing origins. An empty string or a purely path-based URL is therefore safe.
 *
 * Use this guard before assigning any externally-supplied value to
 * window.location.href to prevent open-redirect attacks.
 */
export function isSameOrigin(url: string): boolean {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}
