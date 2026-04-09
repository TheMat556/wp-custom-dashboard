import type {
  ActionItem,
  AtAGlanceData,
  BusinessFunctions,
  CalendarBooking,
  CalendarPreview,
  CoreUpdateItem,
  CountryStatEntry,
  LegalCompliance,
  OnboardingItem,
  PendingUpdates,
  SeoBasics,
  SeoOverview,
  SiteHealthData,
  SiteSpeedData,
  UpdateItem,
  VisitorTrendData,
  WeekDay,
} from "../../services/dashboardApi";

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

export interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
}

export interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  color: string;
  tooltip?: string;
  onClick?: () => void;
}

export interface ActionRowProps {
  item: ActionItem;
  adminUrl: string;
}

export interface WeekCalendarProps {
  weekDays: WeekDay[];
  intlLocale: string;
}

export interface LegalSectionProps {
  legal: LegalCompliance;
  adminUrl: string;
}

export interface BusinessSectionProps {
  biz: BusinessFunctions;
  adminUrl: string;
}

export interface SeoBasicsSectionProps {
  seoBasics: SeoBasics;
  adminUrl: string;
}

export interface HeroBannerProps {
  userName: string;
  adminUrl: string;
  greetingKey: string;
  intlLocale: string;
  t: TFunc;
  total30Views: number;
  viewTrend: number;
  sparkline: { date: string; views: number }[];
  stats: AtAGlanceData | null | undefined;
  readiness: number | null;
  isMd: boolean;
}

export interface OfflineAlertProps {
  speed: SiteSpeedData;
  t: TFunc;
  intlLocale: string;
  adminUrl: string;
}

export interface SummaryTilesProps {
  isSiteDown: boolean;
  health: SiteHealthData | null | undefined;
  speed: SiteSpeedData | null | undefined;
  updates: PendingUpdates | null | undefined;
  seo: SeoOverview | null | undefined;
  seoBasics: SeoBasics | null | undefined;
  total30Views: number;
  viewTrend: number;
  hasUpdates: boolean;
  t: TFunc;
  intlLocale: string;
  adminUrl: string;
  isLg: boolean;
  isMd: boolean;
}

export interface FirstStepsChecklistProps {
  checklist: OnboardingItem[];
  checklistDone: number;
  t: TFunc;
  adminUrl: string;
  isMd: boolean;
  onClose: () => void;
}

export interface TrafficChartsProps {
  trend: { date: string; views: number }[];
  countries: CountryStatEntry[];
  t: TFunc;
  intlLocale: string;
  isMd: boolean;
}

export interface UpcomingBookingsProps {
  calendar: CalendarPreview;
  t: TFunc;
  intlLocale: string;
  adminUrl: string;
  isMd: boolean;
}

export interface ActionCenterProps {
  actions: ActionItem[];
  criticalActions: ActionItem[];
  warningActions: ActionItem[];
  infoActions: ActionItem[];
  hasUpdates: boolean;
  t: TFunc;
  adminUrl: string;
}

export interface UpdatesSectionProps {
  updates: PendingUpdates;
  t: TFunc;
  adminUrl: string;
  isMd: boolean;
}

export interface SiteStatusOverviewProps {
  legalData: LegalCompliance | null | undefined;
  bizData: BusinessFunctions | null | undefined;
  seoBasics: SeoBasics | null | undefined;
  t: TFunc;
  adminUrl: string;
}

export type {
  ActionItem,
  AtAGlanceData,
  BusinessFunctions,
  CalendarBooking,
  CalendarPreview,
  CoreUpdateItem,
  CountryStatEntry,
  LegalCompliance,
  OnboardingItem,
  PendingUpdates,
  SeoBasics,
  SeoOverview,
  SiteHealthData,
  SiteSpeedData,
  UpdateItem,
  VisitorTrendData,
  WeekDay,
};
