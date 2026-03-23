/**
 * Navigation store for the iframe shell architecture.
 *
 * Owns all state related to which URL is loaded in the content iframe,
 * the browser address bar URL, the loading flag, and history coordination.
 */

import { createStore } from "zustand/vanilla";
import { type EmbedMessage, isEmbedMessage } from "../types/embedMessages";
import type { WpReactUiNavigationConfig } from "../types/wp";
import {
  DEFAULT_BREAKOUT_PAGENOW,
  fromEmbedUrl,
  isBreakoutUrl,
  normalizeToMenuKey,
  toEmbedUrl,
} from "../utils/embedUrl";

type Listener = () => void;

export const activeKeyStore = {
  getSnapshot(): string | undefined {
    return normalizeToMenuKey(navigationStore.getState().pageUrl);
  },
  subscribe(fn: Listener): () => void {
    return navigationStore.subscribe(fn);
  },
};

export interface NavigationState {
  iframeUrl: string;
  pageUrl: string;
  pageTitle: string;
  status: "loading" | "ready";
  breakoutPagenow: string[];
  pendingNavigationSource: "shell" | "history" | null;
}

export interface NavigationActions {
  navigate(url: string): void;
  handleIframeLoad(iframeWindow: Window): void;
  handleIframeMessage(event: MessageEvent): void;
}

export interface NavigationBootstrapOptions {
  pageUrl: string;
  pageTitle: string;
  breakoutPagenow: string[];
}

function getDefaultBootstrapOptions(): NavigationBootstrapOptions {
  return {
    pageUrl: typeof window === "undefined" ? "" : fromEmbedUrl(window.location.href),
    pageTitle: typeof document === "undefined" ? "" : document.title,
    breakoutPagenow: [...DEFAULT_BREAKOUT_PAGENOW],
  };
}

export const navigationStore = createStore<NavigationState & NavigationActions>()((set, get) => ({
  iframeUrl: "",
  pageUrl: "",
  pageTitle: "",
  status: "loading",
  breakoutPagenow: [...DEFAULT_BREAKOUT_PAGENOW],
  pendingNavigationSource: "shell",

  navigate(url: string) {
    if (isBreakoutUrl(url, get().breakoutPagenow)) {
      window.location.href = url;
      return;
    }

    const cleanUrl = fromEmbedUrl(url);
    const currentPageUrl = fromEmbedUrl(get().pageUrl);
    const embedUrl = toEmbedUrl(cleanUrl);

    if (cleanUrl === currentPageUrl) {
      set({ status: "ready", pendingNavigationSource: null });
      return;
    }

    set({
      iframeUrl: embedUrl,
      pageUrl: cleanUrl,
      status: "loading",
      pendingNavigationSource: "shell",
    });
    history.pushState({ iframeUrl: embedUrl, pageUrl: cleanUrl }, "", cleanUrl);
  },

  handleIframeLoad(iframeWindow: Window) {
    try {
      const href = iframeWindow.location.href;
      const cleanUrl = fromEmbedUrl(href);
      const title = iframeWindow.document.title;
      const pendingNavigationSource = get().pendingNavigationSource;

      set({
        iframeUrl: href,
        pageUrl: cleanUrl,
        pageTitle: title,
        status: "ready",
        pendingNavigationSource: null,
      });

      if (null === pendingNavigationSource) {
        history.pushState({ iframeUrl: href, pageUrl: cleanUrl }, title, cleanUrl);
      }

      if (typeof document !== "undefined") {
        document.title = title;
      }
    } catch {
      set({ status: "ready", pendingNavigationSource: null });
    }
  },

  handleIframeMessage(event: MessageEvent) {
    if (event.origin !== window.location.origin || !isEmbedMessage(event.data)) {
      return;
    }

    const msg = event.data as EmbedMessage;

    if (msg.type === "page-ready") {
      set({
        iframeUrl: msg.url,
        pageUrl: fromEmbedUrl(msg.url),
        pageTitle: msg.title,
        status: "ready",
      });
      document.title = msg.title;
      return;
    }

    if (msg.type === "title-change") {
      set({ pageTitle: msg.title });
      document.title = msg.title;
      return;
    }

    window.location.href = msg.url;
  },
}));

let teardownPopstateListener: (() => void) | null = null;

export function bootstrapNavigationStore(
  config: Pick<WpReactUiNavigationConfig, "breakoutPagenow"> & {
    pageUrl?: string;
    pageTitle?: string;
  }
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  teardownPopstateListener?.();

  resetNavigationStore({
    pageUrl: config.pageUrl ?? getDefaultBootstrapOptions().pageUrl,
    pageTitle: config.pageTitle ?? getDefaultBootstrapOptions().pageTitle,
    breakoutPagenow:
      config.breakoutPagenow.length > 0
        ? [...config.breakoutPagenow]
        : [...DEFAULT_BREAKOUT_PAGENOW],
  });

  const initial = navigationStore.getState();
  history.replaceState(
    { iframeUrl: initial.iframeUrl, pageUrl: initial.pageUrl },
    document.title,
    initial.pageUrl
  );

  const handlePopstate = (e: PopStateEvent) => {
    const state = e.state as { iframeUrl?: string; pageUrl?: string } | null;
    if (state?.iframeUrl && state?.pageUrl) {
      navigationStore.setState({
        iframeUrl: state.iframeUrl,
        pageUrl: state.pageUrl,
        status: "loading",
        pendingNavigationSource: "history",
      });
    }
  };

  window.addEventListener("popstate", handlePopstate);
  teardownPopstateListener = () => {
    window.removeEventListener("popstate", handlePopstate);
  };

  return () => {
    teardownPopstateListener?.();
    teardownPopstateListener = null;
  };
}

export function resetNavigationStore(config: Partial<NavigationBootstrapOptions> = {}) {
  const defaults = getDefaultBootstrapOptions();
  const pageUrl = config.pageUrl ?? defaults.pageUrl;
  const pageTitle = config.pageTitle ?? defaults.pageTitle;
  const breakoutPagenow = config.breakoutPagenow ?? defaults.breakoutPagenow;

  navigationStore.setState({
    iframeUrl: toEmbedUrl(pageUrl),
    pageUrl,
    pageTitle,
    status: "loading",
    breakoutPagenow: [...breakoutPagenow],
    pendingNavigationSource: "shell",
  });
}
