import { type ReactNode, useMemo } from "react";
import { useStore } from "zustand";
import { type Theme, themeStore } from "../store/themeStore";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useTheme(): ThemeContextValue {
  const theme = useStore(themeStore, (state) => state.theme);
  const toggle = useStore(themeStore, (state) => state.toggle);

  return useMemo(
    () => ({
      theme,
      toggle,
    }),
    [theme, toggle]
  );
}
