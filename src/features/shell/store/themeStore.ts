import { createStore } from "zustand/vanilla";
import { getBootConfig } from "../../../config/bootConfig";
import { createThemeService, type ThemeService } from "../services/themeApi";
import type { WpReactUiConfig } from "../../../types/wp";

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

export function applyThemeToDOM(theme: Theme) {
  document.getElementById("react-shell-root")?.setAttribute("data-theme", theme);
  document.body?.setAttribute("data-theme", theme);
  document.body?.classList.toggle("wp-react-dark", theme === "dark");
  writeStoredTheme(theme);
}

function getInitialTheme(theme: string): Theme {
  return readStoredTheme() ?? (isTheme(theme) ? theme : "light");
}

export interface ThemeStoreState {
  theme: Theme;
  service: ThemeService | null;
  toggle: () => void;
}

export const themeStore = createStore<ThemeStoreState>((set, get) => ({
  theme: "light",
  service: null,
  toggle() {
    const nextTheme: Theme = get().theme === "light" ? "dark" : "light";

    set({ theme: nextTheme });
    applyThemeToDOM(nextTheme);
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, {
        detail: { theme: nextTheme },
      })
    );

    void get()
      .service?.saveTheme(nextTheme)
      .catch((error) => {
        console.warn("[WP React UI] Could not save theme:", error);
      });
  },
}));

export function bootstrapThemeStore(
  config: Pick<WpReactUiConfig, "theme" | "restUrl" | "nonce">,
  service: ThemeService = createThemeService(config)
) {
  const initialTheme = getInitialTheme(config.theme);

  themeStore.setState({
    theme: initialTheme,
    service,
  });
  applyThemeToDOM(initialTheme);
}

export function resetThemeStore() {
  themeStore.setState({
    theme: "light",
    service: null,
  });
}
