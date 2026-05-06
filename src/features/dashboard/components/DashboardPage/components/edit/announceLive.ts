/**
 * Tiny helper that pushes a polite live-region message into the
 * `data-edit-live-region` <div> rendered by `EditModeChrome`.
 *
 * Calls are no-ops while the chrome is unmounted (i.e. outside edit mode).
 */
export function announceLive(message: string) {
  if (typeof document === "undefined") return;
  const node = document.querySelector<HTMLElement>("[data-edit-live-region]");
  if (!node) return;
  // Clear first so the same string is re-announced if pushed twice in a row.
  node.textContent = "";
  // Defer so AT picks up the change.
  window.setTimeout(() => {
    node.textContent = message;
  }, 30);
}
