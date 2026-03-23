import { useStore } from "zustand";
import { type Theme, themeStore } from "../store/themeStore";

export interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

export function useTheme(): ThemeContextValue {
  const theme = useStore(themeStore, (state) => state.theme);
  const toggle = useStore(themeStore, (state) => state.toggle);

  return { theme, toggle };
}
