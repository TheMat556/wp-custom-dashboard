/**
 * Navigation store for the iframe shell architecture.
 *
 * Owns all state related to which URL is loaded in the content iframe,
 * the browser address bar URL, the loading flag, and history coordination.
 *
 * Module-level side effects (popstate listener, initial history.replaceState)
 * survive SPA navigations because they live outside React.
 */

import { createStore } from "zustand/vanilla";
import { fromEmbedUrl, isBreakoutUrl, normalizeToMenuKey, toEmbedUrl } from "../utils/embedUrl";

// ── Active-key store (useSyncExternalStore adapter) ─────────────────────────

type Listener = () => void;

/**
 * Thin adapter so `useActiveKey()` can subscribe via `useSyncExternalStore`.
 * Backed by Zustand's own subscription so any state change in navigationStore
 * automatically notifies all useActiveKey subscribers.
 */
export const activeKeyStore = {
  getSnapshot(): string | undefined {
    return normalizeToMenuKey(navigationStore.getState().pageUrl);
  },
  subscribe(fn: Listener): () => void {
    return navigationStore.subscribe(fn);
  },
};

// ── postMessage types ────────────────────────────────────────────────────────

interface EmbedMessage {
  source: "wp-shell-embed";
  type: "page-ready" | "title-change" | "breakout";
  url?: string;
  title?: string;
}

// ── Store ────────────────────────────────────────────────────────────────────

export interface NavigationState {
  /** URL currently loaded (or being loaded) in the iframe, including embed param. */
  iframeUrl: string;
  /** Clean URL shown in the browser address bar (no embed param). */
  pageUrl: string;
  /** Page title from the iframe document. */
  pageTitle: string;
  /** True while the iframe is transitioning to a new URL. */
  isLoading: boolean;
  /**
   * True when the current iframe load was initiated by the shell (via navigate()).
   * Used to skip a redundant history.pushState when onLoad fires for that URL.
   */
  _shellInitiated: boolean;
}

export interface NavigationActions {
  /**
   * Navigate the iframe to the given fully-qualified admin URL.
   * Checks the breakout list first — breakout URLs do a full window navigation.
   */
  navigate(url: string): void;
  /** Called from ContentFrame's onLoad event. Updates URL, title, history. */
  handleIframeLoad(iframeWindow: Window): void;
  /** Called for every window message event. Validates origin and type. */
  handleIframeMessage(event: MessageEvent): void;
}

function getInitialUrl(): string {
  if (typeof window === "undefined") return "";
  return fromEmbedUrl(window.location.href);
}

export const navigationStore = createStore<NavigationState & NavigationActions>()(
  (set, get) => ({
    iframeUrl: toEmbedUrl(getInitialUrl()),
    pageUrl: getInitialUrl(),
    pageTitle: typeof document !== "undefined" ? document.title : "",
    isLoading: true,
    _shellInitiated: true, // The very first iframe load is shell-initiated.

    navigate(url: string) {
      if (isBreakoutUrl(url)) {
        window.location.href = url;
        return;
      }
      const cleanUrl = fromEmbedUrl(url);
      const embedUrl = toEmbedUrl(cleanUrl);
      set({ iframeUrl: embedUrl, pageUrl: cleanUrl, isLoading: true, _shellInitiated: true });
      history.pushState({ iframeUrl: embedUrl, pageUrl: cleanUrl }, "", cleanUrl);
      },

    handleIframeLoad(iframeWindow: Window) {
      try {
        const href = iframeWindow.location.href;
        const cleanUrl = fromEmbedUrl(href);
        const title = iframeWindow.document.title;
        const wasShellInitiated = get()._shellInitiated;

        set({
          iframeUrl: href,
          pageUrl: cleanUrl,
          pageTitle: title,
          isLoading: false,
          _shellInitiated: false,
        });

        if (!wasShellInitiated) {
          // User followed a link inside the iframe — push to parent history.
          history.pushState({ iframeUrl: href, pageUrl: cleanUrl }, title, cleanUrl);
        }

        if (typeof document !== "undefined") {
          document.title = title;
        }

          } catch {
        // Cross-origin iframe — just clear the loading state.
        set({ isLoading: false, _shellInitiated: false });
      }
    },

    handleIframeMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const msg = event.data as EmbedMessage | undefined;
      if (msg?.source !== "wp-shell-embed") return;

      if (msg.type === "title-change" && msg.title) {
        set({ pageTitle: msg.title });
        document.title = msg.title;
        return;
      }

      if (msg.type === "breakout" && msg.url) {
        window.location.href = msg.url;
      }
    },
  })
);

// ── Module-level side effects ────────────────────────────────────────────────

if (typeof window !== "undefined") {
  // Stamp the initial history entry with our navigation state so the back
  // button works even before the first shell-initiated navigation.
  const initial = navigationStore.getState();
  history.replaceState(
    { iframeUrl: initial.iframeUrl, pageUrl: initial.pageUrl },
    document.title,
    initial.pageUrl
  );

  // Handle browser back/forward.
  window.addEventListener("popstate", (e) => {
    const state = e.state as { iframeUrl?: string; pageUrl?: string } | null;
    if (state?.iframeUrl && state?.pageUrl) {
      navigationStore.setState({
        iframeUrl: state.iframeUrl,
        pageUrl: state.pageUrl,
        isLoading: true,
        _shellInitiated: true,
      });
      }
  });
}

/** Reset to the current page URL — used in tests between cases. */
export function resetNavigationStore() {
  const url = getInitialUrl();
  navigationStore.setState({
    iframeUrl: toEmbedUrl(url),
    pageUrl: url,
    pageTitle: "",
    isLoading: true,
    _shellInitiated: true,
  });
}
