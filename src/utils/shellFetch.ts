/**
 * Shell-managed fetch wrapper.
 *
 * Every request made through this function is tagged with the custom request
 * header `X-WP-Shell-Managed: 1`. This header serves as a lightweight
 * convention that distinguishes shell-owned REST calls from the fetch calls
 * made by third-party plugins or WordPress core running in the same page.
 *
 * Convention — X-WP-Shell-Managed: 1
 *   Any fetch() call initiated by the shell (coreWpRestClient, pluginRestClient,
 *   or future shell utilities) MUST go through shellFetch() so that:
 *     1. Responses can be audited without touching unrelated requests.
 *     2. 401 / 403 responses automatically trigger the re-authentication flow.
 *
 * When a 401 or 403 is received the function posts a `shell:auth-required`
 * message to `window.parent`.  This works from both the parent shell frame
 * (where window.parent === window, so the message loops back) and from any
 * embedded iframe that contains shell-managed code.  The listener in
 * useContentFrameController picks it up and calls sessionStore.markExpired().
 *
 * Third-party plugins that call window.fetch() directly are completely
 * unaffected — their 401/403 responses are never intercepted.
 */

export const SHELL_MANAGED_HEADER = "X-WP-Shell-Managed";

export function shellFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set(SHELL_MANAGED_HEADER, "1");

  return fetch(input, { ...init, headers }).then((response) => {
    if (response.status === 401 || response.status === 403) {
      window.dispatchEvent(
        new CustomEvent("shell:auth-required", { detail: { status: response.status } })
      );
    }
    return response;
  });
}
