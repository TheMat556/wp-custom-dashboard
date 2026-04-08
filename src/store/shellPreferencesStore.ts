import { createStore } from "zustand/vanilla";
import type { RecentPageRecord } from "../utils/commandPalette";
import type { PreferencesService } from "../services/preferencesApi";
import type { WpReactUiConfig } from "../types/wp";
import { createPreferencesService } from "../services/preferencesApi";

const STORAGE_KEY = "wp-react-ui-shell-preferences";
const MAX_RECENT_PAGES = 8;
const SYNC_DEBOUNCE_MS = 500;

export interface PersistedShellPreferences {
  favorites: string[];
  recentPages: RecentPageRecord[];
  density: "comfortable" | "compact";
  themePreset: string;
  customPresetColor: string;
  dashboardWidgetOrder: string[];
  hiddenWidgets: string[];
  highContrast: boolean;
}

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

function scheduleSyncToServer() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const { service } = shellPreferencesStore.getState();
    if (!service) return;
    const fields = getPersistedFields(shellPreferencesStore.getState());
    service.savePreferences(fields);
  }, SYNC_DEBOUNCE_MS);
}

function persistAndSync(
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
) {
  persistState(getPersistedFields(state));
  scheduleSyncToServer();
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
  service: PreferencesService | null;
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
  service: null,

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
    persistAndSync({ ...getPersistedFields(get()), favorites });
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
    persistAndSync({ ...getPersistedFields(get()), recentPages });
  },

  setDensity(density) {
    set({ density });
    persistAndSync({ ...getPersistedFields(get()), density });
  },

  setThemePreset(key, customColor) {
    const updates: Partial<PersistedShellPreferences> = { themePreset: key };
    if (customColor !== undefined) {
      updates.customPresetColor = customColor;
    }
    set(updates);
    persistAndSync({ ...getPersistedFields(get()), ...updates });
  },

  setDashboardWidgetOrder(order) {
    set({ dashboardWidgetOrder: order });
    persistAndSync({ ...getPersistedFields(get()), dashboardWidgetOrder: order });
  },

  toggleWidgetVisibility(widgetKey) {
    const hiddenWidgets = get().hiddenWidgets.includes(widgetKey)
      ? get().hiddenWidgets.filter((k) => k !== widgetKey)
      : [...get().hiddenWidgets, widgetKey];
    set({ hiddenWidgets });
    persistAndSync({ ...getPersistedFields(get()), hiddenWidgets });
  },

  setHighContrast(enabled) {
    set({ highContrast: enabled });
    persistAndSync({ ...getPersistedFields(get()), highContrast: enabled });
  },

  async syncFromServer() {
    const { service } = get();
    if (!service) return;

    try {
      const serverPrefs = await service.fetchPreferences();
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
      persistState(merged);
    } catch {
      // Silently fail — local state is still valid.
    }
  },
}));

export function bootstrapShellPreferencesStore(
  config?: Pick<WpReactUiConfig, "restUrl" | "nonce">
) {
  const persisted = readPersistedState();

  const service = config ? createPreferencesService(config) : null;

  shellPreferencesStore.setState({
    paletteOpen: false,
    paletteQuery: "",
    ...persisted,
    service,
  });

  // Kick off server sync in background (non-blocking).
  if (service) {
    shellPreferencesStore.getState().syncFromServer();
  }

  return () => {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
  };
}

export function resetShellPreferencesStore() {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
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
    service: null,
  });
}
