import { createStore } from "zustand/vanilla";
import { getBootConfig } from "../../../config/bootConfig";
import type { WpReactUiConfig } from "../../../types/wp";
import { logger } from "../../../utils/logger";
import { createThemeService, type ThemeService } from "../services/themeApi";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = getBootConfig().theme.storageKey;
export const THEME_CHANGE_EVENT = "wp-react-ui-theme-change";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function readStoredTheme(): Theme | null {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

function writeStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private browsing or disabled storage — ignore
  }
}

function notifyEmbeddedFrames(theme: Theme) {
  const payload = { type: THEME_CHANGE_EVENT, detail: { theme } };

  for (const frame of document.querySelectorAll("iframe")) {
    try {
      frame.contentWindow?.postMessage(payload, window.location.origin);
    } catch {
      // Ignore inaccessible or not-yet-ready frames.
    }
  }
}

export function applyThemeToDOM(theme: Theme) {
  document.documentElement?.setAttribute("data-theme", theme);
  document.getElementById("react-shell-root")?.setAttribute("data-theme", theme);
  document.body?.setAttribute("data-theme", theme);
  document.documentElement?.classList.toggle("wp-react-dark", theme === "dark");
  document.body?.classList.toggle("wp-react-dark", theme === "dark");
  writeStoredTheme(theme);
  notifyEmbeddedFrames(theme);
}

function getInitialTheme(theme: string): Theme {
  return readStoredTheme() ?? (isTheme(theme) ? theme : "light");
}

export interface ThemeStoreState {
  theme: Theme;
  toggle: () => void;
}

let themeService: ReturnType<typeof createThemeService> | null = null;

export const themeStore = createStore<ThemeStoreState>((set, get) => ({
  theme: "light",
  toggle() {
    const nextTheme: Theme = get().theme === "light" ? "dark" : "light";
    set({ theme: nextTheme });
    // DOM effects and service call are handled by subscribers added in bootstrapThemeStore.
  },
}));

export function bootstrapThemeStore(
  config: Pick<WpReactUiConfig, "theme" | "restUrl" | "nonce">,
  service: ThemeService = createThemeService(config)
) {
  const initialTheme = getInitialTheme(config.theme);

  const unsubDom = themeStore.subscribe((state, prev) => {
    if (state.theme !== prev.theme) {
      applyThemeToDOM(state.theme);
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme: state.theme } }));
    }
  });

  const unsubService = themeStore.subscribe((state, prev) => {
    if (state.theme !== prev.theme && themeService) {
      void themeService.saveTheme(state.theme).catch((error) => {
        logger.warn("[WP React UI] Could not save theme:", error);
      });
    }
  });

  // Set initial state while service is still null so subscribers won't save on bootstrap.
  themeStore.setState({ theme: initialTheme });
  // Apply DOM explicitly for initial render (subscriber only fires when theme *changes*).
  applyThemeToDOM(initialTheme);
  // Attach service after initial setState so bootstrap doesn't trigger a saveTheme call.
  themeService = service;

  return () => {
    unsubDom();
    unsubService();
  };
}

export function resetThemeStore() {
  themeService = null;
  themeStore.setState({ theme: "light" });
}
