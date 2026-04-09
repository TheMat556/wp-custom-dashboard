import type {
  ActionItem,
  AtAGlanceData,
  BusinessFunctions,
  CalendarPreview,
  CountryStatEntry,
  DashboardData,
  LegalCompliance,
  OnboardingItem,
  PendingUpdates,
  SeoBasics,
  SeoOverview,
  SiteHealthData,
  SiteSpeedData,
  VisitorTrendEntry,
} from "./services/dashboardApi";

export interface DashboardViewModel {
  health: SiteHealthData | null;
  updates: PendingUpdates | null;
  trend: VisitorTrendEntry[];
  countries: CountryStatEntry[];
  speed: SiteSpeedData | null;
  seo: SeoOverview | null;
  seoBasics: SeoBasics | null;
  legalData: LegalCompliance | null;
  bizData: BusinessFunctions | null;
  stats: AtAGlanceData | null;
  checklist: OnboardingItem[];
  readiness: number | null;
  calendar: CalendarPreview | null;
  total30Views: number;
  sparkline: VisitorTrendEntry[];
  viewTrend: number;
  actions: ActionItem[];
  criticalActions: ActionItem[];
  warningActions: ActionItem[];
  infoActions: ActionItem[];
  hasUpdates: boolean;
  isSiteDown: boolean;
  checklistDone: number;
  showChecklist: boolean;
}

export function createDashboardViewModel(
  data: DashboardData | null,
  checklistClosed: boolean
): DashboardViewModel {
  const health = data?.siteHealth ?? null;
  const updates = data?.pendingUpdates ?? null;
  const trendData = data?.visitorTrend ?? null;
  const trend = trendData?.days ?? [];
  const countries = data?.countryStats ?? [];
  const speed = data?.siteSpeed ?? null;
  const baseActions = data?.actionItems ?? [];
  const seo = data?.seoOverview ?? null;
  const seoBasics = data?.seoBasics ?? null;
  const legalData = data?.legalCompliance ?? null;
  const bizData = data?.businessFunctions ?? null;
  const stats = data?.atAGlance ?? null;
  const checklist = data?.onboardingChecklist ?? [];
  const readiness = data?.siteReadinessScore ?? null;
  const calendar = data?.calendarPreview ?? null;
  const total30Views = trendData?.total ?? trend.reduce((sum, day) => sum + day.views, 0);
  const sparkline = trend.slice(-7);
  const viewTrend =
    trendData?.trendPct ??
    (() => {
      const yesterdayViews = trend[trend.length - 2]?.views ?? 0;
      const todayViews = trend[trend.length - 1]?.views ?? 0;
      return yesterdayViews > 0 ? Math.round(((todayViews - yesterdayViews) / yesterdayViews) * 100) : 0;
    })();

  const seoActionIds = new Set(baseActions.map((action) => action.title));
  const seoActions: ActionItem[] = (seo?.issues ?? [])
    .filter((issue) => !seoActionIds.has(issue.label))
    .map((issue) => ({
      type: "seo",
      title: issue.label,
      url: issue.editUrl ?? issue.url,
      action: "View page",
      severity: "warning",
      description:
        "This page has an SEO issue that may reduce its visibility in search results.",
    }));

  const actions = [...baseActions, ...seoActions];
  const criticalActions = actions.filter((action) => action.severity === "error");
  const warningActions = actions.filter((action) => action.severity === "warning");
  const infoActions = actions.filter((action) => action.severity === "info");
  const hasUpdates = (updates?.total ?? 0) > 0;
  const isSiteDown = speed?.status === "error";
  const checklistDone = checklist.filter((item) => item.done).length;
  const showChecklist =
    checklist.length > 0 && checklistDone < checklist.length && !checklistClosed;

  return {
    health,
    updates,
    trend,
    countries,
    speed,
    seo,
    seoBasics,
    legalData,
    bizData,
    stats,
    checklist,
    readiness,
    calendar,
    total30Views,
    sparkline,
    viewTrend,
    actions,
    criticalActions,
    warningActions,
    infoActions,
    hasUpdates,
    isSiteDown,
    checklistDone,
    showChecklist,
  };
}
