import { createStore } from "zustand/vanilla";
import "../types/wp";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "wp-react-ui-theme";
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

async function persistTheme(theme: Theme) {
  const restUrl = window.wpReactUi?.restUrl ?? "/wp-json/wp-react-ui/v1";
  const nonce = window.wpReactUi?.nonce ?? "";

  try {
    await fetch(`${restUrl}/theme`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WP-Nonce": nonce,
      },
      body: JSON.stringify({ theme }),
    });
  } catch (error) {
    console.warn("[WP React UI] Could not save theme:", error);
  }
}

const serverTheme = window.wpReactUi?.theme;
const initialTheme = readStoredTheme() ?? (isTheme(serverTheme) ? serverTheme : "light");

export interface ThemeStoreState {
  theme: Theme;
  toggle: () => void;
}

export const themeStore = createStore<ThemeStoreState>((set, get) => ({
  theme: initialTheme,
  toggle() {
    const nextTheme: Theme = get().theme === "light" ? "dark" : "light";

    set({ theme: nextTheme });
    applyThemeToDOM(nextTheme);
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, {
        detail: { theme: nextTheme },
      })
    );
    void persistTheme(nextTheme);
  },
}));

applyThemeToDOM(initialTheme);
