import { notifyApiError } from "../store/notificationStore";
import type { WpReactUiConfig } from "../types/wp";

export interface AtAGlanceData {
  posts: number;
  postsDraft: number;
  pages: number;
  pagesDraft: number;
  comments: number;
  commentsPending: number;
  users: number;
  wpVersion: string;
  phpVersion: string;
}

export interface SiteHealthData {
  status: string;
  score: number;
}

export interface ActivityPerMonthEntry {
  month: string;
  posts: number;
  comments: number;
}

export interface ContentBreakdownEntry {
  name: string;
  value: number;
}

export interface PendingUpdates {
  plugins: number;
  themes: number;
  core: number;
  total: number;
}

export interface DashboardData {
  atAGlance: AtAGlanceData;
  siteHealth: SiteHealthData;
  activityPerMonth: ActivityPerMonthEntry[];
  contentBreakdown: ContentBreakdownEntry[];
  pendingUpdates: PendingUpdates;
}

export interface DashboardService {
  fetchDashboard(): Promise<DashboardData>;
}

export function createDashboardService(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
): DashboardService {
  return {
    async fetchDashboard() {
      const response = await fetch(`${config.restUrl}/dashboard`, {
        headers: { "X-WP-Nonce": config.nonce },
      });

      if (!response.ok) {
        throw new Error(notifyApiError(response, "Dashboard data"));
      }

      return response.json();
    },
  };
}
