import { notifyApiError } from "../store/notificationStore";
import type { WpReactUiConfig } from "../types/wp";

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
  return {
    async fetchActivity(filters: ActivityFilters = {}) {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.perPage) params.set("perPage", String(filters.perPage));
      if (filters.userId) params.set("userId", String(filters.userId));
      if (filters.action) params.set("action", filters.action);

      const qs = params.toString();
      const url = `${config.restUrl}/activity${qs ? `?${qs}` : ""}`;

      const response = await fetch(url, {
        headers: { "X-WP-Nonce": config.nonce },
      });

      if (!response.ok) {
        throw new Error(notifyApiError(response, "Activity log"));
      }

      return response.json();
    },
  };
}
