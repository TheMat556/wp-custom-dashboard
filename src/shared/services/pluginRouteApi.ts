// Re-export from the canonical platform/wordpress gateway.
// Feature services should prefer importing directly from platform/wordpress/gateway/pluginRouteGateway.
export type {
  PluginRestConfig,
  BrandingSavePayload,
  ActivityFilters,
  PluginRouteApi,
} from "../../platform/wordpress/gateway/pluginRouteGateway";
export { createPluginRouteApi } from "../../platform/wordpress/gateway/pluginRouteGateway";

