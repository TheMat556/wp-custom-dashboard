import { createContext, useCallback, useContext, useEffect, useState } from "react";
import "../types/wp";

export type Theme = "light" | "dark";

// ─── Shared store outside React ───────────────────────────────────────────────
// This lives at module level so both shadow roots share the same instance.

type Listener = (theme: Theme) => void;

const listeners = new Set<Listener>();
const THEME_STORAGE_KEY = "wp-react-ui-theme";
const THEME_CHANGE_EVENT = "wp-react-ui-theme-change";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

function readStoredTheme(): Theme | null {
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

const serverTheme = window.wpReactUi?.theme;
let currentTheme: Theme = readStoredTheme() ?? (isTheme(serverTheme) ? serverTheme : "light");

function applyThemeToDOM(t: Theme) {
  document.getElementById("react-navbar-root")?.setAttribute("data-theme", t);
  document.getElementById("react-sidebar-root")?.setAttribute("data-theme", t);
  document.body.setAttribute("data-theme", t);
  document.body.classList.toggle("wp-react-dark", t === "dark");
  writeStoredTheme(t);
}

async function persistTheme(t: Theme) {
  const restUrl = window.wpReactUi?.restUrl ?? "/wp-json/wp-react-ui/v1";
  const nonce = window.wpReactUi?.nonce ?? "";
  try {
    await fetch(`${restUrl}/theme`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WP-Nonce": nonce,
      },
      body: JSON.stringify({ theme: t }),
    });
  } catch (e) {
    console.warn("[WP React UI] Could not save theme:", e);
  }
}

const themeStore = {
  get(): Theme {
    return currentTheme;
  },

  async toggle() {
    const next: Theme = currentTheme === "light" ? "dark" : "light";
    currentTheme = next;
    applyThemeToDOM(next);
    for (const fn of listeners) fn(next);
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, {
        detail: { theme: next },
      })
    );
    await persistTheme(next);
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// Apply initial theme on load
applyThemeToDOM(currentTheme);

// ─── React context (thin wrapper around the store) ────────────────────────────

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: currentTheme,
  toggle: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Subscribe to the shared store so this provider re-renders on change
  const [theme, setTheme] = useState<Theme>(themeStore.get);

  useEffect(() => {
    // Subscribe — will update this provider when ANY shadow root toggles
    const unsubscribe = themeStore.subscribe(setTheme);
    return unsubscribe;
  }, []);

  const toggle = useCallback(() => {
    themeStore.toggle();
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
