import { notifyApiError } from "../../../store/notificationStore";
import type { WpReactUiConfig } from "../../../types/wp";
import { createPluginRouteApi } from "../../../shared/services/pluginRouteApi";

export interface AtAGlanceData {
  posts: number;
  postsDraft: number;
  pages: number;
  pagesDraft: number;
  users: number;
  wpVersion: string;
  phpVersion: string;
}

export interface SiteHealthData {
  status: string;
  score: number;
}

export interface UpdateItem {
  slug: string;
  name: string;
  currentVersion: string;
  newVersion: string;
  url?: string;
  requiresWP?: string | null;
  requiresPHP?: string | null;
  testedUpTo?: string | null;
}

export interface CoreUpdateItem {
  currentVersion: string;
  newVersion: string;
}

export interface PendingUpdates {
  plugins: number;
  themes: number;
  core: number;
  total: number;
  lastChecked?: number | null;
  pluginList?: UpdateItem[];
  themeList?: UpdateItem[];
  coreList?: CoreUpdateItem[];
}

export interface VisitorTrendEntry {
  date: string;
  views: number;
}

export interface VisitorTrendData {
  days: VisitorTrendEntry[];
  total: number;
  prevTotal: number;
  trendPct: number;
}

export interface CountryStatEntry {
  country: string;
  visits: number;
}

export interface SpeedHistoryItem {
  ts: number;
  ok: boolean;
  ms: number | null;
}

export interface SiteSpeedData {
  ms: number | null;
  status: "good" | "fair" | "slow" | "error";
  reason?: string;
  errorClass?: string;
  errorDetail?: string;
  checkedAt?: number;
  firstFailAt?: number;
  history?: SpeedHistoryItem[];
  httpCode?: number;
}

export interface CalendarBooking {
  id: number;
  customerName: string;
  startDate: string;
  endDate: string;
  status: string;
  calendarId: number;
  isToday: boolean;
}

export interface WeekDay {
  date: string;
  dayLabel: string;
  dayNum: number;
  month: string;
  isToday: boolean;
  bookings: CalendarBooking[];
  count: number;
}

export interface CalendarPreview {
  available: boolean;
  upcoming: CalendarBooking[];
  totalToday: number;
  weekDays?: WeekDay[];
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
  impact?: string;
  description?: string;
  action: string;
  url: string;
}

export interface SeoIssue {
  label: string;
  url: string;
  editUrl?: string;
}

export interface OnboardingItem {
  key: string;
  label: string;
  done: boolean;
  url: string;
}

export interface SeoOverview {
  score: number;
  issues: SeoIssue[];
  plugin: string | null;
  totalPages: number;
}

export interface SeoBasicCheck {
  ok: boolean;
  label: string;
  critical?: boolean;
  url?: string;
  value?: string;
  shortCount?: number;
}

export interface SeoBasics {
  score: number;
  checks: {
    searchVisible: SeoBasicCheck;
    homeTitle: SeoBasicCheck;
    sitemap: SeoBasicCheck;
    pageTitles: SeoBasicCheck;
  };
  plugin?: string | null;
}

export interface LegalItem {
  exists: boolean;
  published: boolean;
  status?: string;
  title?: string;
  daysOld?: number;
  editUrl?: string;
  viewUrl?: string | null;
}

export interface LegalCompliance {
  privacyPolicy: LegalItem;
  impressum: LegalItem;
  cookiePlugin: string | null;
  trackingWithoutConsent: boolean;
}

export interface BusinessBookings {
  available: boolean;
  status: string;
  totalUpcoming?: number;
  totalToday?: number;
  note?: string;
  testUrl?: string;
}

export interface BusinessForms {
  available: boolean;
  plugin?: string;
  status: string;
  note?: string;
}

export interface BusinessEmail {
  smtpPlugin: string | null;
  status: string;
  note?: string;
}

export interface BusinessFunctions {
  bookings: BusinessBookings;
  contactForms: BusinessForms;
  emailDelivery: BusinessEmail;
}

export interface DashboardData {
  atAGlance: AtAGlanceData;
  siteHealth: SiteHealthData;
  pendingUpdates: PendingUpdates;
  visitorTrend: VisitorTrendData;
  countryStats: CountryStatEntry[];
  siteSpeed: SiteSpeedData;
  pagesOverview: PagesOverview;
  actionItems: ActionItem[];
  seoOverview: SeoOverview;
  seoBasics?: SeoBasics;
  legalCompliance?: LegalCompliance;
  businessFunctions?: BusinessFunctions;
  onboardingChecklist?: OnboardingItem[];
  siteReadinessScore?: number;
  calendarPreview?: CalendarPreview | null;
}

export interface DashboardService {
  fetchDashboard(): Promise<DashboardData>;
}

export function createDashboardService(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
): DashboardService {
  const api = createPluginRouteApi(config);

  return {
    async fetchDashboard() {
      const response = await api.fetchDashboard();

      if (!response.ok) {
        throw new Error(notifyApiError(response, "Dashboard data"));
      }

      return response.json();
    },
  };
}
