import { useMemo, useState, useEffect } from "react";
import { useStore } from "zustand";
import { useShellConfig } from "../../../context/ShellConfigContext";
import { bootstrapDashboardStore, dashboardStore } from "../../../store/dashboardStore";
import type { ActionItem } from "../../../services/dashboardApi";
import { createT, localeToIntl } from "../../../utils/i18n";

const CHECKLIST_CLOSED_KEY = "wp-react-ui-checklist-closed";

export function useDashboardData() {
  const config      = useShellConfig();
  const data        = useStore(dashboardStore, (s) => s.data);
  const loading     = useStore(dashboardStore, (s) => s.loading);
  const intlLocale  = useMemo(() => localeToIntl(config.locale ?? "en_US"), [config.locale]);
  const t           = useMemo(() => createT(config.locale ?? "en_US"), [config.locale]);

  const [checklistClosed, setChecklistClosed] = useState(
    () => localStorage.getItem(CHECKLIST_CLOSED_KEY) === "1",
  );

  useEffect(() => {
    bootstrapDashboardStore(config);
    dashboardStore.getState().load();
  }, [config]);

  const closeChecklist = () => {
    localStorage.setItem(CHECKLIST_CLOSED_KEY, "1");
    setChecklistClosed(true);
  };

  // Raw slices
  const health      = data?.siteHealth ?? null;
  const updates     = data?.pendingUpdates ?? null;
  const trendData   = data?.visitorTrend ?? null;
  const trend       = trendData?.days ?? [];
  const countries   = data?.countryStats ?? [];
  const speed       = data?.siteSpeed ?? null;
  const baseActions = data?.actionItems ?? [];
  const seo         = data?.seoOverview ?? null;
  const seoBasics   = data?.seoBasics ?? null;
  const legalData   = data?.legalCompliance ?? null;
  const bizData     = data?.businessFunctions ?? null;
  const stats       = data?.atAGlance ?? null;
  const checklist   = data?.onboardingChecklist ?? [];
  const readiness   = data?.siteReadinessScore ?? null;
  const calendar    = data?.calendarPreview ?? null;

  // Derived
  const total30Views = trendData?.total ?? trend.reduce((s, d) => s + d.views, 0);
  const sparkline    = trend.slice(-7);
  const viewTrend    = trendData?.trendPct ?? (() => {
    const yViews = trend[trend.length - 2]?.views ?? 0;
    const tViews = trend[trend.length - 1]?.views ?? 0;
    return yViews > 0 ? Math.round(((tViews - yViews) / yViews) * 100) : 0;
  })();

  const seoActionIds = new Set(baseActions.map((a) => a.title));
  const seoActions: ActionItem[] = (seo?.issues ?? [])
    .filter((issue) => !seoActionIds.has(issue.label))
    .map((issue) => ({
      type: "seo" as const,
      title: issue.label,
      url: issue.editUrl ?? issue.url,
      action: "View page",
      severity: "warning" as const,
      description: "This page has an SEO issue that may reduce its visibility in search results.",
    }));

  const actions         = [...baseActions, ...seoActions];
  const criticalActions = actions.filter((a) => a.severity === "error");
  const warningActions  = actions.filter((a) => a.severity === "warning");
  const infoActions     = actions.filter((a) => a.severity === "info");
  const hasUpdates      = (updates?.total ?? 0) > 0;
  const isSiteDown      = speed?.status === "error";
  const checklistDone   = checklist.filter((c) => c.done).length;
  const showChecklist   = checklist.length > 0 && checklistDone < checklist.length && !checklistClosed;

  return {
    config,
    t,
    intlLocale,
    loading,
    data,
    // slices
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
    // derived
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
    closeChecklist,
  };
}
