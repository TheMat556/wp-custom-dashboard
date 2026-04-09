import { createStore } from "zustand/vanilla";
import type { RecentPageRecord } from "../../../utils/commandPalette";
import type { PreferencesService } from "../services/preferencesApi";
import type { WpReactUiConfig } from "../../../types/wp";
import { createPreferencesService } from "../services/preferencesApi";
import type { PersistedShellPreferences } from "../../../types/shellPreferences";

export type { PersistedShellPreferences } from "../../../types/shellPreferences";

const STORAGE_KEY = "wp-react-ui-shell-preferences";
const MAX_RECENT_PAGES = 8;
const SYNC_DEBOUNCE_MS = 500;

function canUseDOM(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function getDefaultPersistedState(): PersistedShellPreferences {
  return {
    favorites: [],
    recentPages: [],
    density: "comfortable",
    themePreset: "default",
    customPresetColor: "",
    dashboardWidgetOrder: [],
    hiddenWidgets: [],
    highContrast: false,
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
    const defaults = getDefaultPersistedState();

    return {
      favorites: Array.isArray(parsed.favorites)
        ? parsed.favorites.filter((value): value is string => typeof value === "string")
        : defaults.favorites,
      recentPages: Array.isArray(parsed.recentPages)
        ? parsed.recentPages.filter(
            (value): value is RecentPageRecord =>
              !!value &&
              typeof value.pageUrl === "string" &&
              typeof value.title === "string" &&
              typeof value.visitedAt === "number"
          )
        : defaults.recentPages,
      density:
        parsed.density === "compact" || parsed.density === "comfortable"
          ? parsed.density
          : defaults.density,
      themePreset:
        typeof parsed.themePreset === "string" && parsed.themePreset
          ? parsed.themePreset
          : defaults.themePreset,
      customPresetColor:
        typeof parsed.customPresetColor === "string"
          ? parsed.customPresetColor
          : defaults.customPresetColor,
      dashboardWidgetOrder: Array.isArray(parsed.dashboardWidgetOrder)
        ? parsed.dashboardWidgetOrder.filter(
            (v): v is string => typeof v === "string"
          )
        : defaults.dashboardWidgetOrder,
      hiddenWidgets: Array.isArray(parsed.hiddenWidgets)
        ? parsed.hiddenWidgets.filter(
            (v): v is string => typeof v === "string"
          )
        : defaults.hiddenWidgets,
      highContrast:
        typeof parsed.highContrast === "boolean"
          ? parsed.highContrast
          : defaults.highContrast,
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

function getPersistedFields(
  state: Pick<
    ShellPreferencesState,
    | "favorites"
    | "recentPages"
    | "density"
    | "themePreset"
    | "customPresetColor"
    | "dashboardWidgetOrder"
    | "hiddenWidgets"
    | "highContrast"
  >
): PersistedShellPreferences {
  return {
    favorites: state.favorites,
    recentPages: state.recentPages,
    density: state.density,
    themePreset: state.themePreset,
    customPresetColor: state.customPresetColor,
    dashboardWidgetOrder: state.dashboardWidgetOrder,
    hiddenWidgets: state.hiddenWidgets,
    highContrast: state.highContrast,
  };
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let preferencesService: PreferencesService | null = null;
let unsubPersist: (() => void) | null = null;

function scheduleSyncToServer() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    if (!preferencesService) return;
    const fields = getPersistedFields(shellPreferencesStore.getState());
    preferencesService.savePreferences(fields);
  }, SYNC_DEBOUNCE_MS);
}

function fallbackTitle(pageUrl: string): string {
  try {
    const parsed = new URL(pageUrl);
    return parsed.pathname.split("/").filter(Boolean).pop() ?? pageUrl;
  } catch {
    return pageUrl;
  }
}

export interface ShellPreferencesState extends PersistedShellPreferences {
  paletteOpen: boolean;
  paletteQuery: string;
  openPalette: (query?: string) => void;
  closePalette: () => void;
  setPaletteQuery: (query: string) => void;
  toggleFavorite: (slug: string) => void;
  recordVisit: (pageUrl: string, title: string) => void;
  setDensity: (density: "comfortable" | "compact") => void;
  setThemePreset: (key: string, customColor?: string) => void;
  setDashboardWidgetOrder: (order: string[]) => void;
  toggleWidgetVisibility: (widgetKey: string) => void;
  setHighContrast: (enabled: boolean) => void;
  syncFromServer: () => Promise<void>;
}

export const shellPreferencesStore = createStore<ShellPreferencesState>((set, get) => ({
  paletteOpen: false,
  paletteQuery: "",
  favorites: [],
  recentPages: [],
  density: "comfortable",
  themePreset: "default",
  customPresetColor: "",
  dashboardWidgetOrder: [],
  hiddenWidgets: [],
  highContrast: false,

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
    if (!normalizedSlug) return;

    const favorites = get().favorites.includes(normalizedSlug)
      ? get().favorites.filter((item) => item !== normalizedSlug)
      : [normalizedSlug, ...get().favorites];

    set({ favorites });
  },

  recordVisit(pageUrl: string, title: string) {
    const normalizedUrl = pageUrl.trim();
    if (!normalizedUrl) return;

    const recentPages = [
      {
        pageUrl: normalizedUrl,
        title: title.trim() || fallbackTitle(normalizedUrl),
        visitedAt: Date.now(),
      },
      ...get().recentPages.filter((item) => item.pageUrl !== normalizedUrl),
    ].slice(0, MAX_RECENT_PAGES);

    set({ recentPages });
  },

  setDensity(density) {
    set({ density });
  },

  setThemePreset(key, customColor) {
    const updates: Partial<PersistedShellPreferences> = { themePreset: key };
    if (customColor !== undefined) {
      updates.customPresetColor = customColor;
    }
    set(updates);
  },

  setDashboardWidgetOrder(order) {
    set({ dashboardWidgetOrder: order });
  },

  toggleWidgetVisibility(widgetKey) {
    const hiddenWidgets = get().hiddenWidgets.includes(widgetKey)
      ? get().hiddenWidgets.filter((k) => k !== widgetKey)
      : [...get().hiddenWidgets, widgetKey];
    set({ hiddenWidgets });
  },

  setHighContrast(enabled) {
    set({ highContrast: enabled });
  },

  async syncFromServer() {
    if (!preferencesService) return;

    try {
      const serverPrefs = await preferencesService.fetchPreferences();
      if (!serverPrefs || Object.keys(serverPrefs).length === 0) return;

      // Server wins for conflicts — merge server data over local.
      const current = getPersistedFields(get());
      const merged: PersistedShellPreferences = {
        ...current,
        ...serverPrefs,
        // Keep local recent pages if server has none (they accumulate locally).
        recentPages:
          Array.isArray(serverPrefs.recentPages) && serverPrefs.recentPages.length > 0
            ? serverPrefs.recentPages
            : current.recentPages,
      };

      set(merged);
      // Subscriber will handle localStorage persistence.
    } catch {
      // Silently fail — local state is still valid.
    }
  },
}));

export function bootstrapShellPreferencesStore(
  config?: Pick<WpReactUiConfig, "restUrl" | "nonce">
) {
  const persisted = readPersistedState();

  // Clean up any previously registered subscriber before re-bootstrapping.
  unsubPersist?.();
  preferencesService = config ? createPreferencesService(config) : null;

  shellPreferencesStore.setState({
    paletteOpen: false,
    paletteQuery: "",
    ...persisted,
  });

  // Subscriber: write to localStorage and schedule server sync whenever a
  // persisted field changes. Runs synchronously after every state update.
  unsubPersist = shellPreferencesStore.subscribe((state, prev) => {
    const next = getPersistedFields(state);
    const previous = getPersistedFields(prev);
    if (JSON.stringify(next) !== JSON.stringify(previous)) {
      persistState(next);
      scheduleSyncToServer();
    }
  });

  // Kick off server sync in background (non-blocking).
  if (preferencesService) {
    shellPreferencesStore.getState().syncFromServer();
  }

  return () => {
    unsubPersist?.();
    unsubPersist = null;
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
  };
}

export function resetShellPreferencesStore() {
  unsubPersist?.();
  unsubPersist = null;
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  preferencesService = null;
  shellPreferencesStore.setState({
    paletteOpen: false,
    paletteQuery: "",
    favorites: [],
    recentPages: [],
    density: "comfortable",
    themePreset: "default",
    customPresetColor: "",
    dashboardWidgetOrder: [],
    hiddenWidgets: [],
    highContrast: false,
  });
}
