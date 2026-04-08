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

export interface RecentPostData {
  id: number;
  title: string;
  status: string;
  author: string;
  modified: string;
  editUrl: string | null;
}

export interface SiteHealthData {
  status: string;
  score: number;
}

export interface PostsPerMonthEntry {
  month: string;
  posts: number;
}

export interface ContentBreakdownEntry {
  name: string;
  value: number;
}

export interface DashboardData {
  atAGlance: AtAGlanceData;
  recentPosts: RecentPostData[];
  siteHealth: SiteHealthData;
  postsPerMonth: PostsPerMonthEntry[];
  contentBreakdown: ContentBreakdownEntry[];
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
