/**
 * SPA-style client-side navigation for WordPress admin.
 *
 * Intercepts admin link clicks, fetches the target page, and swaps only the
 * content area (#wpcontent / #wpfooter). Sidebar and navbar React trees stay
 * alive — no unmount/remount, no flicker.
 *
 * Falls back to full page reload for:
 *  - cross-origin URLs
 *  - editor pages (post.php, post-new.php, site-editor.php)
 *  - non-GET navigations (forms, logout)
 *  - fetch failures
 */

import { useSyncExternalStore } from "react";

// ── Navigation store (reactive activeKey for React) ──────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();

function computeActiveKey(url?: string): string | undefined {
  const loc = url ? new URL(url, window.location.origin) : window.location;
  const page = new URLSearchParams(loc.search).get("page");
  if (page) return page;
  return loc.pathname.split("/").filter(Boolean).pop();
}

let currentActiveKey = computeActiveKey();

const navigationStore = {
  getSnapshot(): string | undefined {
    return currentActiveKey;
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  notify(url: string) {
    currentActiveKey = computeActiveKey(url);
    listeners.forEach((fn) => fn());
  },
};

/** React hook — returns the current active menu key, reactive to SPA navigations. */
export function useActiveKey(): string | undefined {
  return useSyncExternalStore(
    navigationStore.subscribe,
    navigationStore.getSnapshot,
    navigationStore.getSnapshot
  );
}

// ── SPA navigation core ──────────────────────────────────────────────────────

// These admin pages rely on complex WordPress bootstrapping (editors, media grid).
// They must do a full navigation so core JS can initialize normally.
const FULL_RELOAD_PAGES = [
  "post.php",
  "post-new.php",
  "site-editor.php",
  "upload.php",
  "media-upload.php",
  "media-new.php",
];

function isAdminUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return (
      parsed.origin === window.location.origin &&
      parsed.pathname.startsWith("/wp-admin")
    );
  } catch {
    return false;
  }
}

function isEditorUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    const raw = `${parsed.pathname}${parsed.search}`;
    return FULL_RELOAD_PAGES.some(
      (p) => raw.endsWith("/" + p) || raw.includes("/" + p) || raw.includes(`page=${p}`)
    );
  } catch {
    return false;
  }
}

function executeScripts(container: HTMLElement) {
  const scripts = container.querySelectorAll("script");
  scripts.forEach((oldScript) => {
    const newScript = document.createElement("script");
    // Copy attributes
    Array.from(oldScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value);
    });
    newScript.textContent = oldScript.textContent;
    oldScript.parentNode?.replaceChild(newScript, oldScript);
  });
}

function updateTitle(doc: Document) {
  const newTitle = doc.querySelector("title")?.textContent;
  if (newTitle) document.title = newTitle;
}

/**
 * Navigate to an admin URL via fetch + DOM swap.
 * Returns true if SPA navigation succeeded, false if it fell back to full reload.
 */
export async function spaNavigate(url: string): Promise<boolean> {
  // Bail out for non-admin, editor, or cross-origin URLs
  if (!isAdminUrl(url) || isEditorUrl(url)) {
    window.location.assign(url);
    return false;
  }

  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
      window.location.assign(url);
      return false;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Extract the content area from the fetched page
    const newContent = doc.getElementById("wpcontent");
    const newFooter = doc.getElementById("wpfooter");
    const oldContent = document.getElementById("wpcontent");
    const oldFooter = document.getElementById("wpfooter");

    if (!newContent || !oldContent) {
      // Couldn't find content — fall back
      window.location.assign(url);
      return false;
    }

    // Perform the swap (optionally with View Transition)
    const doSwap = () => {
      oldContent.innerHTML = newContent.innerHTML;
      if (newFooter && oldFooter) {
        oldFooter.innerHTML = newFooter.innerHTML;
      }

      // Re-execute inline scripts in the new content
      executeScripts(oldContent);
      if (oldFooter) executeScripts(oldFooter);

      // Scroll content area to top
      oldContent.scrollTop = 0;

      // Update page title
      updateTitle(doc);

      // Update URL
      window.history.pushState({ spa: true }, "", url);

      // Notify React components
      navigationStore.notify(url);

      // Dispatch event for other plugins
      window.dispatchEvent(
        new CustomEvent("wp-spa-navigate", { detail: { url } })
      );
    };

    if (document.startViewTransition) {
      document.startViewTransition(doSwap);
    } else {
      doSwap();
    }

    return true;
  } catch (err) {
    console.warn("[WP React UI] SPA navigation failed, falling back:", err);
    window.location.assign(url);
    return false;
  }
}

// ── Popstate (back/forward) ──────────────────────────────────────────────────

function handlePopState() {
  spaNavigate(window.location.href);
}

// ── Click delegation on content area ─────────────────────────────────────────

function handleContentClick(e: MouseEvent) {
  // Ignore modified clicks (new tab, etc.)
  if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;

  const anchor = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
  if (!anchor) return;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

  // Ignore target="_blank" or download links
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

  const fullUrl = new URL(href, window.location.origin).href;

  // Only intercept admin URLs that aren't editor pages
  if (!isAdminUrl(fullUrl) || isEditorUrl(fullUrl)) return;

  e.preventDefault();
  spaNavigate(fullUrl);
}

// ── Init ─────────────────────────────────────────────────────────────────────

let initialized = false;

export function initSpaNavigation() {
  if (initialized) return;
  initialized = true;

  window.addEventListener("popstate", handlePopState);

  // Delegate clicks inside #wpcontent to catch standard WordPress admin links
  const content = document.getElementById("wpcontent");
  content?.addEventListener("click", handleContentClick);
}
