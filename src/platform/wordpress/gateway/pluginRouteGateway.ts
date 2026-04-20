import type {
  ActivityQuery,
  BrandingRequest,
  ChatBootstrapRequest,
  ChatBootstrapResponse,
  ChatPollRequest,
  ChatPollResponse,
  ChatSendRequest,
  ChatSendResponse,
  ChatThreadActionRequest,
  LicenseActivateRequest,
  LicenseSettingsRequest,
  LicenseSettingsResponse,
} from "../../../generated/contracts/dto";
import { PLUGIN_ROUTE_PATHS } from "../../../generated/contracts/routes";
import type { PersistedShellPreferences } from "../../../types/shellPreferences";
import type { PluginRestConfig } from "../client/pluginRestClient";
import { createPluginRestClient } from "../client/pluginRestClient";

export type { PluginRestConfig } from "../client/pluginRestClient";
export type BrandingSavePayload = BrandingRequest;
export type ActivityFilters = ActivityQuery;
export type ChatBootstrapPayload = ChatBootstrapRequest;
export type ChatBootstrapData = ChatBootstrapResponse;
export type ChatPollPayload = ChatPollRequest;
export type ChatPollData = ChatPollResponse;
export type ChatLongPollPayload = ChatPollRequest & { timeoutSeconds?: number };
export type ChatSendPayload = ChatSendRequest;
export type ChatSendData = ChatSendResponse;
export type ChatThreadActionPayload = ChatThreadActionRequest;
export type ChatThreadActionData = ChatBootstrapResponse;
export type LicenseActivatePayload = LicenseActivateRequest;
export type LicenseSettingsPayload = LicenseSettingsRequest;
export type LicenseSettingsData = LicenseSettingsResponse;

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
  fetchChatBootstrap(data: ChatBootstrapPayload): Promise<Response>;
  fetchChatPoll(data: ChatPollPayload): Promise<Response>;
  longPollChat(data: ChatLongPollPayload, signal?: AbortSignal): Promise<Response>;
  sendChatMessage(data: ChatSendPayload): Promise<Response>;
  archiveChatThread(data: ChatThreadActionPayload): Promise<Response>;
  unarchiveChatThread(data: ChatThreadActionPayload): Promise<Response>;
  deleteChatThread(data: ChatThreadActionPayload): Promise<Response>;
  fetchLicense(force?: boolean): Promise<Response>;
  fetchLicenseSettings(): Promise<Response>;
  saveLicenseSettings(data: LicenseSettingsPayload): Promise<Response>;
  activateLicense(data: LicenseActivatePayload): Promise<Response>;
  deactivateLicense(): Promise<Response>;
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

    async fetchChatBootstrap(data) {
      return client.post(PLUGIN_ROUTE_PATHS.chatBootstrap, data);
    },

    async fetchChatPoll(data) {
      return client.post(PLUGIN_ROUTE_PATHS.chatPoll, data);
    },

    async longPollChat(data, signal) {
      return client.post(PLUGIN_ROUTE_PATHS.chatPoll, data, undefined, signal);
    },

    async sendChatMessage(data) {
      return client.post(PLUGIN_ROUTE_PATHS.chatSend, data);
    },

    async archiveChatThread(data) {
      return client.post(PLUGIN_ROUTE_PATHS.chatArchive, data);
    },

    async unarchiveChatThread(data) {
      return client.post(PLUGIN_ROUTE_PATHS.chatUnarchive, data);
    },

    async deleteChatThread(data) {
      return client.post(PLUGIN_ROUTE_PATHS.chatDelete, data);
    },

    async fetchLicense(force?: boolean) {
      const path = force ? `${PLUGIN_ROUTE_PATHS.license}?force=1` : PLUGIN_ROUTE_PATHS.license;
      return client.get(path);
    },

    async fetchLicenseSettings() {
      return client.get(PLUGIN_ROUTE_PATHS.licenseSettings);
    },

    async saveLicenseSettings(data) {
      return client.post(PLUGIN_ROUTE_PATHS.licenseSettings, data);
    },

    async activateLicense(data) {
      return client.post(PLUGIN_ROUTE_PATHS.licenseActivate, data);
    },

    async deactivateLicense() {
      return client.post(PLUGIN_ROUTE_PATHS.licenseDeactivate);
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
