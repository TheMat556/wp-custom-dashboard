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

function computeViewTrend(trendPct: number | undefined, trend: VisitorTrendEntry[]): number {
  if (trendPct != null) return trendPct;
  const yesterdayViews = trend[trend.length - 2]?.views ?? 0;
  const todayViews = trend[trend.length - 1]?.views ?? 0;
  return yesterdayViews > 0
    ? Math.round(((todayViews - yesterdayViews) / yesterdayViews) * 100)
    : 0;
}

function buildSeoActions(seo: SeoOverview | null, baseActions: ActionItem[]): ActionItem[] {
  const seoActionIds = new Set(baseActions.map((action) => action.title));
  return (seo?.issues ?? [])
    .filter((issue) => !seoActionIds.has(issue.label))
    .map((issue) => ({
      type: "seo" as const,
      title: issue.label,
      url: issue.editUrl ?? issue.url,
      action: "View page",
      severity: "warning" as const,
      description: "This page has an SEO issue that may reduce its visibility in search results.",
    }));
}

function extractDataFields(data: DashboardData | null) {
  const trendData = data?.visitorTrend ?? null;
  const trend = trendData?.days ?? [];
  return {
    health: data?.siteHealth ?? null,
    updates: data?.pendingUpdates ?? null,
    trendData,
    trend,
    countries: data?.countryStats ?? [],
    speed: data?.siteSpeed ?? null,
    baseActions: data?.actionItems ?? [],
    seo: data?.seoOverview ?? null,
    seoBasics: data?.seoBasics ?? null,
    legalData: data?.legalCompliance ?? null,
    bizData: data?.businessFunctions ?? null,
    stats: data?.atAGlance ?? null,
    checklist: data?.onboardingChecklist ?? [],
    readiness: data?.siteReadinessScore ?? null,
    calendar: data?.calendarPreview ?? null,
  };
}

function buildActionGroups(baseActions: ActionItem[], seoActions: ActionItem[]) {
  const actions = [...baseActions, ...seoActions];
  return {
    actions,
    criticalActions: actions.filter((a) => a.severity === "error"),
    warningActions: actions.filter((a) => a.severity === "warning"),
    infoActions: actions.filter((a) => a.severity === "info"),
  };
}

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
  const {
    health,
    updates,
    trendData,
    trend,
    countries,
    speed,
    baseActions,
    seo,
    seoBasics,
    legalData,
    bizData,
    stats,
    checklist,
    readiness,
    calendar,
  } = extractDataFields(data);
  const total30Views = trendData?.total ?? trend.reduce((sum, day) => sum + day.views, 0);
  const sparkline = trend.slice(-7);
  const viewTrend = computeViewTrend(trendData?.trendPct, trend);
  const seoActions = buildSeoActions(seo, baseActions);
  const { actions, criticalActions, warningActions, infoActions } = buildActionGroups(
    baseActions,
    seoActions
  );
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
