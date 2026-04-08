import { createStore } from "zustand/vanilla";
import type { RecentPageRecord } from "../utils/commandPalette";

const STORAGE_KEY = "wp-react-ui-shell-preferences";
const MAX_RECENT_PAGES = 8;

interface PersistedShellPreferences {
  favorites: string[];
  recentPages: RecentPageRecord[];
}

function canUseDOM(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function getDefaultPersistedState(): PersistedShellPreferences {
  return {
    favorites: [],
    recentPages: [],
  };
}

function readPersistedState(): PersistedShellPreferences {
  if (!canUseDOM()) {
    return getDefaultPersistedState();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultPersistedState();
    }

    const parsed = JSON.parse(raw) as Partial<PersistedShellPreferences>;

    return {
      favorites: Array.isArray(parsed.favorites)
        ? parsed.favorites.filter((value): value is string => typeof value === "string")
        : [],
      recentPages: Array.isArray(parsed.recentPages)
        ? parsed.recentPages.filter(
            (value): value is RecentPageRecord =>
              !!value &&
              typeof value.pageUrl === "string" &&
              typeof value.title === "string" &&
              typeof value.visitedAt === "number"
          )
        : [],
    };
  } catch {
    return getDefaultPersistedState();
  }
}

function persistState(state: PersistedShellPreferences) {
  if (!canUseDOM()) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore private-browsing or quota failures.
  }
}

function persistCurrentState(state: Pick<ShellPreferencesState, "favorites" | "recentPages">) {
  persistState({
    favorites: state.favorites,
    recentPages: state.recentPages,
  });
}

function fallbackTitle(pageUrl: string): string {
  try {
    const parsed = new URL(pageUrl);
    return parsed.pathname.split("/").filter(Boolean).pop() ?? pageUrl;
  } catch {
    return pageUrl;
  }
}

export interface ShellPreferencesState {
  paletteOpen: boolean;
  paletteQuery: string;
  favorites: string[];
  recentPages: RecentPageRecord[];
  openPalette: (query?: string) => void;
  closePalette: () => void;
  setPaletteQuery: (query: string) => void;
  toggleFavorite: (slug: string) => void;
  recordVisit: (pageUrl: string, title: string) => void;
}

export const shellPreferencesStore = createStore<ShellPreferencesState>((set, get) => ({
  paletteOpen: false,
  paletteQuery: "",
  favorites: [],
  recentPages: [],

  openPalette(query = "") {
    set({ paletteOpen: true, paletteQuery: query });
  },

  closePalette() {
    set({ paletteOpen: false, paletteQuery: "" });
  },

  setPaletteQuery(query: string) {
    set({ paletteQuery: query });
  },

  toggleFavorite(slug: string) {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) {
      return;
    }

    const favorites = get().favorites.includes(normalizedSlug)
      ? get().favorites.filter((item) => item !== normalizedSlug)
      : [normalizedSlug, ...get().favorites];

    persistCurrentState({ favorites, recentPages: get().recentPages });
    set({ favorites });
  },

  recordVisit(pageUrl: string, title: string) {
    const normalizedUrl = pageUrl.trim();
    if (!normalizedUrl) {
      return;
    }

    const recentPages = [
      {
        pageUrl: normalizedUrl,
        title: title.trim() || fallbackTitle(normalizedUrl),
        visitedAt: Date.now(),
      },
      ...get().recentPages.filter((item) => item.pageUrl !== normalizedUrl),
    ].slice(0, MAX_RECENT_PAGES);

    persistCurrentState({ favorites: get().favorites, recentPages });
    set({ recentPages });
  },
}));

export function bootstrapShellPreferencesStore() {
  const persisted = readPersistedState();

  shellPreferencesStore.setState({
    paletteOpen: false,
    paletteQuery: "",
    favorites: persisted.favorites,
    recentPages: persisted.recentPages,
  });

  return () => {};
}

export function resetShellPreferencesStore() {
  shellPreferencesStore.setState({
    paletteOpen: false,
    paletteQuery: "",
    favorites: [],
    recentPages: [],
  });
}
