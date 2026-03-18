import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import "../types/wp";

export type Theme = "light" | "dark";

// ─── Shared store outside React ───────────────────────────────────────────────
// This lives at module level so both shadow roots share the same instance.

type Listener = (theme: Theme) => void;

const listeners = new Set<Listener>();

let currentTheme: Theme =
  (window.wpReactUi?.theme ?? "light") as Theme;

function applyThemeToDOM(t: Theme) {
  document.getElementById("react-navbar-root")?.setAttribute("data-theme", t);
  document.getElementById("react-sidebar-root")?.setAttribute("data-theme", t);
  document.body.setAttribute("data-theme", t);
  document.body.classList.toggle("wp-react-dark", t === "dark");
}

async function persistTheme(t: Theme) {
  const restUrl =
    window.wpReactUi?.restUrl ?? "/wp-json/wp-react-ui/v1";
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
    listeners.forEach((fn) => fn(next));
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

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}