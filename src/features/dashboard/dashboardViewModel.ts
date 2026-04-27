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
  SubmissionStats,
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

/** @returns the value or null, without adding ?? to the caller's complexity score. */
function val<T>(v: T | null | undefined): T | null {
  return v ?? null;
}

/** @returns the array or empty, without adding ?? to the caller's complexity score. */
function arr<T>(v: T[] | null | undefined): T[] {
  return v ?? [];
}

function extractDataFields(data: DashboardData | null) {
  const trendData = val(data?.visitorTrend);
  const trend = arr(trendData?.days);
  return {
    health: val(data?.siteHealth),
    updates: val(data?.pendingUpdates),
    trendData,
    trend,
    countries: arr(data?.countryStats),
    speed: val(data?.siteSpeed),
    baseActions: arr(data?.actionItems),
    seo: val(data?.seoOverview),
    seoBasics: val(data?.seoBasics),
    legalData: val(data?.legalCompliance),
    bizData: val(data?.businessFunctions),
    stats: val(data?.atAGlance),
    checklist: arr(data?.onboardingChecklist),
    readiness: val(data?.siteReadinessScore),
    calendar: val(data?.calendarPreview),
    submissionStats: val(data?.submissionStats),
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
  submissionStats: SubmissionStats | null;
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
    submissionStats,
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
    submissionStats,
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
