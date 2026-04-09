import {
  PLUGIN_ROUTE_PATHS,
} from "../../generated/contracts/routes";
import type { ActivityQuery, BrandingRequest } from "../../generated/contracts/dto";
import type { PersistedShellPreferences } from "../../store/shellPreferencesStore";
import type { PluginRestConfig } from "./pluginRestClient";
import { createPluginRestClient } from "./pluginRestClient";

export type BrandingSavePayload = BrandingRequest;
export type ActivityFilters = ActivityQuery;

function buildActivityQuery(filters: ActivityFilters = {}) {
  return {
    page: filters.page ? String(filters.page) : undefined,
    perPage: filters.perPage ? String(filters.perPage) : undefined,
    userId: filters.userId ? String(filters.userId) : undefined,
    action: filters.action,
  };
}

export interface PluginRouteApi {
  fetchMenu(): Promise<Response>;
  fetchTheme(): Promise<Response>;
  saveTheme(theme: "light" | "dark"): Promise<Response>;
  fetchBranding(): Promise<Response>;
  saveBranding(data: BrandingSavePayload): Promise<Response>;
  fetchPreferences(): Promise<Response>;
  savePreferences(prefs: Partial<PersistedShellPreferences>): Promise<Response>;
  fetchMenuCounts(): Promise<Response>;
  fetchDashboard(): Promise<Response>;
  fetchActivity(filters?: ActivityFilters): Promise<Response>;
}

export function createPluginRouteApi(config: PluginRestConfig): PluginRouteApi {
  const client = createPluginRestClient(config);

  return {
    async fetchMenu() {
      return client.get(PLUGIN_ROUTE_PATHS.menu);
    },

    async fetchTheme() {
      return client.get(PLUGIN_ROUTE_PATHS.theme);
    },

    async saveTheme(theme) {
      return client.post(PLUGIN_ROUTE_PATHS.theme, { theme });
    },

    async fetchBranding() {
      return client.get(PLUGIN_ROUTE_PATHS.branding);
    },

    async saveBranding(data) {
      return client.post(PLUGIN_ROUTE_PATHS.branding, data);
    },

    async fetchPreferences() {
      return client.get(PLUGIN_ROUTE_PATHS.preferences);
    },

    async savePreferences(prefs) {
      return client.post(PLUGIN_ROUTE_PATHS.preferences, prefs);
    },

    async fetchMenuCounts() {
      return client.get(PLUGIN_ROUTE_PATHS.menuCounts);
    },

    async fetchDashboard() {
      return client.get(PLUGIN_ROUTE_PATHS.dashboard);
    },

    async fetchActivity(filters) {
      return client.get(PLUGIN_ROUTE_PATHS.activity, buildActivityQuery(filters));
    },
  };
}
