/**
 * Navigation store for the iframe shell architecture.
 *
 * Owns all state related to which URL is loaded in the content iframe,
 * the browser address bar URL, the loading flag, and history coordination.
 *
 * Browser history mechanics are delegated to utils/historyManager.
 */

import { createStore } from "zustand/vanilla";
import { type EmbedMessage, isEmbedMessage } from "../../../types/embedMessages";
import type { WpReactUiNavigationConfig } from "../../../types/wp";
import {
  DEFAULT_BREAKOUT_PAGENOW,
  fromEmbedUrl,
  isBreakoutUrl,
  normalizeToMenuKey,
  toEmbedUrl,
} from "../../../utils/embedUrl";
import {
  type HistoryEntry,
  listenPopstate,
  pushHistory,
  replaceHistory,
} from "../../../utils/historyManager";
import { isSameOrigin } from "../../../utils/security";
import { matchesOpenInNewTabPattern } from "../../../utils/openInNewTab";
import { sessionStore } from "../../session/store/sessionStore";

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
  iframeOverlayActive: boolean;
  breakoutPagenow: string[];
  openInNewTabPatterns: string[];
  pendingNavigationSource: "shell" | "history" | null;
}

export interface NavigationActions {
  navigate(url: string): void;
  handleIframeLoad(iframeWindow: Window): void;
  handleIframeMessage(event: MessageEvent): void;
  markShellPageReady(): void;
}

export interface NavigationBootstrapOptions {
  pageUrl: string;
  pageTitle: string;
  breakoutPagenow: string[];
  openInNewTabPatterns: string[];
}

function getDefaultBootstrapOptions(): NavigationBootstrapOptions {
  return {
    pageUrl: typeof window === "undefined" ? "" : fromEmbedUrl(window.location.href),
    pageTitle: typeof document === "undefined" ? "" : document.title,
    breakoutPagenow: [...DEFAULT_BREAKOUT_PAGENOW],
    openInNewTabPatterns: [],
  };
}

export const navigationStore = createStore<NavigationState & NavigationActions>()((set, get) => ({
  iframeUrl: "",
  pageUrl: "",
  pageTitle: "",
  status: "loading",
  iframeOverlayActive: false,
  breakoutPagenow: [...DEFAULT_BREAKOUT_PAGENOW],
  openInNewTabPatterns: [],
  pendingNavigationSource: "shell",

  navigate(url: string) {
    if (isBreakoutUrl(url, get().breakoutPagenow)) {
      if (!isSameOrigin(url)) {
        console.error("[shell] Blocked cross-origin breakout navigation:", url);
        return;
      }
      window.location.href = url;
      return;
    }

    const cleanUrl = fromEmbedUrl(url);
    if (matchesOpenInNewTabPattern(cleanUrl, get().openInNewTabPatterns)) {
      window.open(cleanUrl, "_blank", "noopener,noreferrer");
      return;
    }

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
      iframeOverlayActive: false,
      pendingNavigationSource: "shell",
    });
    pushHistory({ iframeUrl: embedUrl, pageUrl: cleanUrl }, "");
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
        iframeOverlayActive: false,
        pendingNavigationSource: null,
      });

      if (null === pendingNavigationSource) {
        pushHistory({ iframeUrl: href, pageUrl: cleanUrl }, title);
      }
    } catch {
      set({ status: "ready", iframeOverlayActive: false, pendingNavigationSource: null });
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
        iframeOverlayActive: false,
      });
      return;
    }

    if (msg.type === "title-change") {
      set({ pageTitle: msg.title });
      return;
    }

    if (msg.type === "session-expired") {
      sessionStore.getState().markExpired();
      return;
    }

    if (msg.type === "overlay-state") {
      set({ iframeOverlayActive: msg.active });
      return;
    }

    if (msg.type === "breakout") {
      if (!isSameOrigin(msg.url)) {
        console.error("[shell] Blocked cross-origin breakout navigation:", msg.url);
        return;
      }
      window.location.href = msg.url;
    }
  },

  markShellPageReady() {
    set({ status: "ready", iframeOverlayActive: false, pendingNavigationSource: null });
  },
}));

let teardownPopstateListener: (() => void) | null = null;
let unsubTitle: (() => void) | null = null;

export function bootstrapNavigationStore(
  config: Pick<WpReactUiNavigationConfig, "breakoutPagenow" | "openInNewTabPatterns"> & {
    pageUrl?: string;
    pageTitle?: string;
  }
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  teardownPopstateListener?.();
  unsubTitle?.();

  resetNavigationStore({
    pageUrl: config.pageUrl ?? getDefaultBootstrapOptions().pageUrl,
    pageTitle: config.pageTitle ?? getDefaultBootstrapOptions().pageTitle,
    breakoutPagenow:
      config.breakoutPagenow.length > 0
        ? [...config.breakoutPagenow]
        : [...DEFAULT_BREAKOUT_PAGENOW],
    openInNewTabPatterns: [...config.openInNewTabPatterns],
  });

  const initial = navigationStore.getState();
  replaceHistory({ iframeUrl: initial.iframeUrl, pageUrl: initial.pageUrl }, document.title);

  // Subscriber: sync document.title whenever pageTitle state changes.
  unsubTitle = navigationStore.subscribe((state, prev) => {
    if (state.pageTitle !== prev.pageTitle && typeof document !== "undefined") {
      document.title = state.pageTitle;
    }
  });

  teardownPopstateListener = listenPopstate((entry: HistoryEntry) => {
    navigationStore.setState({
      iframeUrl: entry.iframeUrl,
      pageUrl: entry.pageUrl,
      status: "loading",
      iframeOverlayActive: false,
      pendingNavigationSource: "history",
    });
  });

  return () => {
    teardownPopstateListener?.();
    teardownPopstateListener = null;
    unsubTitle?.();
    unsubTitle = null;
  };
}

export function resetNavigationStore(config: Partial<NavigationBootstrapOptions> = {}) {
  const defaults = getDefaultBootstrapOptions();
  const pageUrl = config.pageUrl ?? defaults.pageUrl;
  const pageTitle = config.pageTitle ?? defaults.pageTitle;
  const breakoutPagenow = config.breakoutPagenow ?? defaults.breakoutPagenow;
  const openInNewTabPatterns = config.openInNewTabPatterns ?? defaults.openInNewTabPatterns;

  navigationStore.setState({
    iframeUrl: toEmbedUrl(pageUrl),
    pageUrl,
    pageTitle,
    status: "loading",
    iframeOverlayActive: false,
    breakoutPagenow: [...breakoutPagenow],
    openInNewTabPatterns: [...openInNewTabPatterns],
    pendingNavigationSource: "shell",
  });
}
