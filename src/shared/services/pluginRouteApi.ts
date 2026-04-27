// Re-export from the canonical platform/wordpress gateway.
// Feature services should prefer importing directly from platform/wordpress/gateway/pluginRouteGateway.
export type {
  ActivityFilters,
  BrandingSavePayload,
  ChatBootstrapData,
  ChatBootstrapPayload,
  ChatLongPollPayload,
  ChatPollData,
  ChatPollPayload,
  ChatSendData,
  ChatSendPayload,
  LicenseActivatePayload,
  LicenseSettingsData,
  LicenseSettingsPayload,
  PluginRestConfig,
  PluginRouteApi,
} from "../../platform/wordpress/gateway/pluginRouteGateway";
export { createPluginRouteApi } from "../../platform/wordpress/gateway/pluginRouteGateway";
