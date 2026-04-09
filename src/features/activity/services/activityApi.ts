import { createPluginRouteApi } from "../../../shared/services/pluginRouteApi";
import { notifyApiError } from "../../../store/notificationStore";
import type { WpReactUiConfig } from "../../../types/wp";

export interface ActivityEntry {
  user_id: number;
  user_name: string;
  action: string;
  object_type: string;
  object_id: number;
  object_title: string;
  details: string;
  created_at: string;
}

export interface ActivityResponse {
  entries: ActivityEntry[];
  total: number;
  page: number;
  perPage: number;
}

export interface ActivityFilters {
  page?: number;
  perPage?: number;
  userId?: number;
  action?: string;
}

export interface ActivityService {
  fetchActivity(filters?: ActivityFilters): Promise<ActivityResponse>;
}

export function createActivityService(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
): ActivityService {
  const api = createPluginRouteApi(config);

  return {
    async fetchActivity(filters: ActivityFilters = {}) {
      const response = await api.fetchActivity(filters);

      if (!response.ok) {
        throw new Error(notifyApiError(response, "Activity log"));
      }

      return response.json();
    },
  };
}
