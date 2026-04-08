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

export interface PendingUpdates {
  plugins: number;
  themes: number;
  core: number;
  total: number;
}

export interface VisitorTrendEntry {
  date: string;
  views: number;
}

export interface CountryStatEntry {
  country: string;
  visits: number;
}

export interface SiteSpeedData {
  ms: number | null;
  status: "good" | "fair" | "slow" | "error";
}

export interface PageItem {
  id: number;
  title: string;
  modified: string;
  daysOld?: number;
  editUrl: string;
  viewUrl: string;
}

export interface PagesOverview {
  recent: PageItem[];
  drafts: PageItem[];
  totalPublished: number;
  totalDrafts: number;
}

export interface ActionItem {
  type: "update" | "content" | "health" | "seo";
  severity: "error" | "warning" | "info";
  title: string;
  description?: string;
  action: string;
  url: string;
}

export interface SeoIssue {
  label: string;
  url: string;
}

export interface SeoOverview {
  score: number;
  issues: SeoIssue[];
  plugin: string | null;
  totalPages: number;
}

export interface DashboardData {
  atAGlance: AtAGlanceData;
  siteHealth: SiteHealthData;
  pendingUpdates: PendingUpdates;
  visitorTrend: VisitorTrendEntry[];
  countryStats: CountryStatEntry[];
  siteSpeed: SiteSpeedData;
  pagesOverview: PagesOverview;
  actionItems: ActionItem[];
  seoOverview: SeoOverview;
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
