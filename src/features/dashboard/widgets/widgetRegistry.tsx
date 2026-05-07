import type { CSSProperties, ReactNode } from "react";
import type { WidgetSize } from "../../../types/shellPreferences";
import { ActionCenter } from "../components/DashboardPage/components/ActionCenter";
import { CountryChart } from "../components/DashboardPage/components/CountryChart";
import { FirstStepsChecklist } from "../components/DashboardPage/components/FirstStepsChecklist";
import { HeroBanner } from "../components/DashboardPage/components/HeroBanner";
import { KpiBackup } from "../components/DashboardPage/components/kpi/KpiBackup";
import { KpiBookings } from "../components/DashboardPage/components/kpi/KpiBookings";
import { KpiContainer } from "../components/DashboardPage/components/kpi/KpiContainer";
import { KpiContent } from "../components/DashboardPage/components/kpi/KpiContent";
import { KpiConversions } from "../components/DashboardPage/components/kpi/KpiConversions";
import { KpiEmail } from "../components/DashboardPage/components/kpi/KpiEmail";
import { KpiLegal } from "../components/DashboardPage/components/kpi/KpiLegal";
import { KpiReadiness } from "../components/DashboardPage/components/kpi/KpiReadiness";
import { KpiSeoScore } from "../components/DashboardPage/components/kpi/KpiSeoScore";
import { KpiSpeed } from "../components/DashboardPage/components/kpi/KpiSpeed";
import { KpiUpdates } from "../components/DashboardPage/components/kpi/KpiUpdates";
import { KpiVisitors } from "../components/DashboardPage/components/kpi/KpiVisitors";
import { KpiWebsite } from "../components/DashboardPage/components/kpi/KpiWebsite";
import { OfflineAlert } from "../components/DashboardPage/components/OfflineAlert";
import { SiteStatusOverview } from "../components/DashboardPage/components/SiteStatusOverview";
import { TrafficCharts } from "../components/DashboardPage/components/TrafficCharts";
import { UpcomingBookings } from "../components/DashboardPage/components/UpcomingBookings";
import { UpdatesSection } from "../components/DashboardPage/components/UpdatesSection";
import type { TFunc } from "../components/DashboardPage/types";
import type { DashboardViewModel } from "../dashboardViewModel";
import type { SiteSpeedData } from "../services/dashboardApi";

export type { WidgetSize } from "../../../types/shellPreferences";

export interface WidgetRenderProps {
  config: {
    adminUrl: string;
    user: { name: string };
  };
  viewModel: DashboardViewModel;
  t: TFunc;
  intlLocale: string;
  isMd: boolean;
  isLg: boolean;
  greetingKey?: string;
  closeChecklist?: () => void;
  /** Whether the dashboard is currently in edit mode */
  isEditing?: boolean;
  /** The actual widget key (may differ from meta.key for instance widgets) */
  widgetKey?: string;
}

export interface DashboardWidgetMeta {
  key: string;
  label: string;
  defaultSize: WidgetSize;
  allowedSizes: WidgetSize[];
  hidableByUser: boolean;
  isEligible: (vm: DashboardViewModel) => boolean;
  render: (props: WidgetRenderProps) => ReactNode;
}

function revealVar(delay: string): CSSProperties {
  return { "--dashboard-reveal-delay": delay } as CSSProperties;
}

export const DASHBOARD_WIDGETS: DashboardWidgetMeta[] = [
  {
    key: "hero",
    label: "Hero Banner",
    defaultSize: "full",
    allowedSizes: ["full"],
    hidableByUser: false,
    isEligible: () => true,
    render: ({ config, viewModel, t, intlLocale, isMd, greetingKey }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("40ms")}>
        <HeroBanner
          userName={config.user.name}
          adminUrl={config.adminUrl}
          greetingKey={greetingKey ?? "Good morning"}
          intlLocale={intlLocale}
          t={t}
          total30Views={viewModel.total30Views}
          viewTrend={viewModel.viewTrend}
          sparkline={viewModel.sparkline}
          stats={viewModel.stats}
          readiness={viewModel.readiness}
          isMd={isMd}
        />
      </div>
    ),
  },
  {
    key: "offline-alert",
    label: "Offline Alert",
    defaultSize: "full",
    allowedSizes: ["full"],
    hidableByUser: false,
    isEligible: (vm) => vm.isSiteDown && !!vm.speed,
    render: ({ viewModel, t, intlLocale, config }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("90ms")}>
        <OfflineAlert
          speed={viewModel.speed as SiteSpeedData}
          t={t}
          intlLocale={intlLocale}
          adminUrl={config.adminUrl}
        />
      </div>
    ),
  },
  // ---- Individual KPI widgets (can be used standalone or inside a container) ----
  {
    key: "kpi-website",
    label: "Website status",
    defaultSize: "1x",
    allowedSizes: ["1x", "2x"],
    hidableByUser: true,
    isEligible: (vm) => !!vm.health,
    render: ({ config, viewModel, t }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("120ms")}>
        <KpiWebsite
          isSiteDown={viewModel.isSiteDown}
          health={viewModel.health}
          speed={viewModel.speed}
          t={t}
          adminUrl={config.adminUrl}
        />
      </div>
    ),
  },
  {
    key: "kpi-visitors",
    label: "Visitors (30d)",
    defaultSize: "1x",
    allowedSizes: ["1x", "2x"],
    hidableByUser: true,
    isEligible: (vm) => vm.total30Views > 0,
    render: ({ viewModel, t, intlLocale }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("140ms")}>
        <KpiVisitors
          total30Views={viewModel.total30Views}
          viewTrend={viewModel.viewTrend}
          t={t}
          intlLocale={intlLocale}
        />
      </div>
    ),
  },
  {
    key: "kpi-updates",
    label: "Updates",
    defaultSize: "1x",
    allowedSizes: ["1x", "2x"],
    hidableByUser: true,
    isEligible: (vm) => !!vm.updates,
    render: ({ config, viewModel, t, intlLocale }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("160ms")}>
        <KpiUpdates
          updates={viewModel.updates}
          hasUpdates={viewModel.hasUpdates}
          t={t}
          intlLocale={intlLocale}
          adminUrl={config.adminUrl}
        />
      </div>
    ),
  },
  {
    key: "kpi-speed",
    label: "Speed",
    defaultSize: "1x",
    allowedSizes: ["1x", "2x"],
    hidableByUser: true,
    isEligible: (vm) => !!vm.speed,
    render: ({ viewModel, t }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("180ms")}>
        <KpiSpeed isSiteDown={viewModel.isSiteDown} speed={viewModel.speed} t={t} />
      </div>
    ),
  },
  {
    key: "kpi-conversions",
    label: "Conversions (30d)",
    defaultSize: "1x",
    allowedSizes: ["1x", "2x"],
    hidableByUser: true,
    isEligible: (vm) => !!vm.submissionStats,
    render: ({ viewModel, t }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("200ms")}>
        <KpiConversions submissionStats={viewModel.submissionStats} t={t} />
      </div>
    ),
  },
  {
    key: "kpi-backup",
    label: "Backup Status",
    defaultSize: "1x",
    allowedSizes: ["1x", "2x"],
    hidableByUser: true,
    isEligible: (vm) => !!vm.stats?.lastBackupDate,
    render: ({ viewModel, t }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("220ms")}>
        <KpiBackup lastBackupDate={viewModel.stats?.lastBackupDate} t={t} />
      </div>
    ),
  },
  // ---- New KPI widgets ----
  {
    key: "kpi-seo-score",
    label: "SEO Score",
    defaultSize: "1x",
    allowedSizes: ["1x", "2x"],
    hidableByUser: true,
    isEligible: (vm) => !!vm.seoBasics,
    render: ({ viewModel, t }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("150ms")}>
        <KpiSeoScore seoBasics={viewModel.seoBasics} seo={viewModel.seo} t={t} />
      </div>
    ),
  },
  {
    key: "kpi-content",
    label: "Content",
    defaultSize: "1x",
    allowedSizes: ["1x", "2x"],
    hidableByUser: true,
    isEligible: (vm) => !!vm.stats,
    render: ({ viewModel, t }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("160ms")}>
        <KpiContent stats={viewModel.stats} t={t} />
      </div>
    ),
  },
  {
    key: "kpi-legal",
    label: "Legal",
    defaultSize: "1x",
    allowedSizes: ["1x", "2x"],
    hidableByUser: true,
    isEligible: (vm) => !!vm.legalData,
    render: ({ viewModel, t }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("170ms")}>
        <KpiLegal legalData={viewModel.legalData} t={t} />
      </div>
    ),
  },
  {
    key: "kpi-email",
    label: "Email",
    defaultSize: "1x",
    allowedSizes: ["1x", "2x"],
    hidableByUser: true,
    isEligible: (vm) => !!vm.bizData,
    render: ({ viewModel, t }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("180ms")}>
        <KpiEmail bizData={viewModel.bizData} t={t} />
      </div>
    ),
  },
  {
    key: "kpi-readiness",
    label: "Readiness",
    defaultSize: "1x",
    allowedSizes: ["1x", "2x"],
    hidableByUser: true,
    isEligible: (vm) => vm.readiness != null,
    render: ({ viewModel, t }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("190ms")}>
        <KpiReadiness readiness={viewModel.readiness} t={t} />
      </div>
    ),
  },
  {
    key: "kpi-bookings",
    label: "Today's Bookings",
    defaultSize: "1x",
    allowedSizes: ["1x", "2x"],
    hidableByUser: true,
    isEligible: (vm) => !!vm.calendar?.available,
    render: ({ viewModel, t }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("200ms")}>
        <KpiBookings calendar={viewModel.calendar} t={t} />
      </div>
    ),
  },
  // ---- KPI Container ----
  {
    key: "kpi-container",
    label: "KPI Container",
    defaultSize: "full",
    allowedSizes: ["full"],
    hidableByUser: true,
    isEligible: () => true,
    render: (props) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("110ms")}>
        <KpiContainer
          instanceKey={props.widgetKey ?? "kpi-container"}
          viewModel={props.viewModel}
          config={props.config}
          t={props.t}
          intlLocale={props.intlLocale}
          isEditing={props.isEditing ?? false}
        />
      </div>
    ),
  },
  {
    key: "first-steps-checklist",
    label: "First Steps Checklist",
    defaultSize: "full",
    allowedSizes: ["full", "half"],
    hidableByUser: true,
    isEligible: () => true,
    render: ({ config, viewModel, t, isMd, closeChecklist }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("160ms")}>
        <FirstStepsChecklist
          checklist={viewModel.checklist}
          checklistDone={viewModel.checklistDone}
          t={t}
          adminUrl={config.adminUrl}
          isMd={isMd}
          onClose={closeChecklist ?? (() => {})}
        />
      </div>
    ),
  },
  {
    key: "traffic",
    label: "Page Views",
    defaultSize: "full",
    allowedSizes: ["full", "half"],
    hidableByUser: true,
    isEligible: () => true,
    render: ({ viewModel, t, intlLocale, isMd }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("200ms")}>
        <TrafficCharts
          trend={viewModel.trend}
          countries={viewModel.countries}
          t={t}
          intlLocale={intlLocale}
          isMd={isMd}
        />
      </div>
    ),
  },
  {
    key: "country-chart",
    label: "Visitors by Country",
    defaultSize: "full",
    allowedSizes: ["full", "half"],
    hidableByUser: true,
    isEligible: () => true,
    render: ({ viewModel, t, intlLocale }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("240ms")}>
        <CountryChart countries={viewModel.countries} t={t} intlLocale={intlLocale} />
      </div>
    ),
  },
  {
    key: "upcoming-bookings",
    label: "Upcoming Bookings",
    defaultSize: "full",
    allowedSizes: ["full", "half"],
    hidableByUser: true,
    isEligible: () => true,
    render: ({ viewModel, t, intlLocale, config, isMd }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("240ms")}>
        <UpcomingBookings
          calendar={
            viewModel.calendar ?? { upcoming: [], weekDays: [], totalToday: 0, available: false }
          }
          t={t}
          intlLocale={intlLocale}
          adminUrl={config.adminUrl}
          isMd={isMd}
        />
      </div>
    ),
  },
  {
    key: "action-center",
    label: "Action Center",
    defaultSize: "full",
    allowedSizes: ["full", "half"],
    hidableByUser: true,
    isEligible: () => true,
    render: ({ config, viewModel, t }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("280ms")}>
        <ActionCenter
          actions={viewModel.actions}
          criticalActions={viewModel.criticalActions}
          warningActions={viewModel.warningActions}
          infoActions={viewModel.infoActions}
          hasUpdates={viewModel.hasUpdates}
          t={t}
          adminUrl={config.adminUrl}
        />
      </div>
    ),
  },
  {
    key: "updates-section",
    label: "Updates Section",
    defaultSize: "full",
    allowedSizes: ["full", "half"],
    hidableByUser: true,
    isEligible: () => true,
    render: ({ config, viewModel, t, isMd }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("320ms")}>
        <UpdatesSection
          updates={
            viewModel.updates ?? {
              total: 0,
              plugins: 0,
              themes: 0,
              core: 0,
              lastChecked: null,
              pluginList: [],
              themeList: [],
              coreList: [],
            }
          }
          t={t}
          adminUrl={config.adminUrl}
          isMd={isMd}
        />
      </div>
    ),
  },
  {
    key: "site-status-overview",
    label: "Site Status Overview",
    defaultSize: "full",
    allowedSizes: ["full", "half"],
    hidableByUser: true,
    isEligible: (vm) => !!vm.legalData || !!vm.bizData || !!vm.seoBasics,
    render: ({ config, viewModel, t }) => (
      <div className="wp-react-ui-dashboard-reveal" style={revealVar("360ms")}>
        <SiteStatusOverview
          legalData={viewModel.legalData}
          bizData={viewModel.bizData}
          seoBasics={viewModel.seoBasics}
          t={t}
          adminUrl={config.adminUrl}
        />
      </div>
    ),
  },
];

/** Prefix for KPI container instance keys in the widget order. */
export const KPI_CONTAINER_INSTANCE_PREFIX = "kpi-container::";

/** The individual KPI widget keys that live inside KPI containers. */
export const KPI_WIDGET_KEYS = [
  "kpi-website",
  "kpi-visitors",
  "kpi-updates",
  "kpi-speed",
  "kpi-conversions",
  "kpi-backup",
  "kpi-seo-score",
  "kpi-content",
  "kpi-legal",
  "kpi-email",
  "kpi-readiness",
  "kpi-bookings",
];

/**
 * Default key for the default KPI container instance.
 * Used to seed `DEFAULT_WIDGET_ORDER` so a fresh dashboard always shows the
 * container alongside the other widgets.
 */
const DEFAULT_KPI_CONTAINER_INSTANCE_KEY = `${KPI_CONTAINER_INSTANCE_PREFIX}__default__`;

/**
 * Default order for the dashboard grid. Excludes:
 *  - the bare `kpi-container` template key (replaced below by the default
 *    instance key so the container actually renders for new users)
 *  - the individual KPI keys, which by default live *inside* the KPI container
 *    rather than as standalone widgets in the grid. They can still be added to
 *    the grid via the catalogue if removed from the container.
 */
export const DEFAULT_WIDGET_ORDER: string[] = DASHBOARD_WIDGETS.map((w) =>
  w.key === "kpi-container" ? DEFAULT_KPI_CONTAINER_INSTANCE_KEY : w.key
).filter((key) => !KPI_WIDGET_KEYS.includes(key));

/**
 * Maps removed legacy widget keys to their replacement set.
 * These are keys that existed in a previous version and should be expanded
 * when encountered in persisted data.
 */
export const LEGACY_WIDGET_REPLACEMENTS: Record<string, string[]> = {
  "summary-tiles": ["kpi-website", "kpi-visitors", "kpi-updates", "kpi-speed", "kpi-conversions"],
};

/**
 * Maps template keys to their canonical instance keys during order normalization.
 * Unlike LEGACY_WIDGET_REPLACEMENTS, these are not legacy — they are live mappings
 * from a generic template key (e.g. "kpi-container") to the default instance key.
 */
export const TEMPLATE_REWRITES: Record<string, string> = {
  "kpi-container": `${KPI_CONTAINER_INSTANCE_PREFIX}__default__`,
};

/**
 * Returns true if the given key is a KPI container instance key.
 */
export function isContainerInstanceKey(key: string): boolean {
  return key.startsWith(KPI_CONTAINER_INSTANCE_PREFIX);
}

/**
 * Parses a container instance key to extract the instance ID.
 * E.g. "kpi-container::__default__" → "__default__"
 */
export function parseContainerInstanceKey(key: string): string | null {
  if (!isContainerInstanceKey(key)) return null;
  return key.slice(KPI_CONTAINER_INSTANCE_PREFIX.length);
}

/**
 * Resolves a widget key to its meta. Handles container instance keys
 * by mapping them to the kpi-container template. Also maps the plain
 * "kpi-container" template key to the default instance key so it
 * always resolves correctly.
 */
export function resolveWidgetKey(key: string): DashboardWidgetMeta | undefined {
  // Map the bare template key to the default instance
  if (key === "kpi-container") {
    return resolveWidgetKey(`${KPI_CONTAINER_INSTANCE_PREFIX}__default__`);
  }
  if (isContainerInstanceKey(key)) {
    const template = DASHBOARD_WIDGETS.find((w) => w.key === "kpi-container");
    if (!template) return undefined;
    return { ...template, key };
  }
  return DASHBOARD_WIDGETS.find((w) => w.key === key);
}

/**
 * Returns true if the key is one of the 5 KPI widget keys.
 */
export function isKpiWidgetKey(key: string): boolean {
  return KPI_WIDGET_KEYS.includes(key);
}

/**
 * Expands legacy widget keys (e.g. `summary-tiles`) into their replacement set.
 */
export function migrateLegacyWidgetKeys(order: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const key of order) {
    const replacement = LEGACY_WIDGET_REPLACEMENTS[key];
    if (replacement) {
      for (const r of replacement) {
        if (!seen.has(r)) {
          seen.add(r);
          out.push(r);
        }
      }
    } else if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/**
 * Merges the persisted order with the registry's default order.
 */
export function mergeWidgetOrder(persistedOrder: string[]): string[] {
  const migrated = migrateLegacyWidgetKeys(persistedOrder);
  const registryKeys = new Set(DEFAULT_WIDGET_ORDER);
  const hasContainerInstance = migrated.some(isContainerInstanceKey);

  const normalized = migrated.map((key) => TEMPLATE_REWRITES[key] ?? key);

  const validPersisted = normalized.filter((key) => {
    if (isContainerInstanceKey(key)) return true;
    return registryKeys.has(key);
  });

  const defaultInstanceKey = `${KPI_CONTAINER_INSTANCE_PREFIX}__default__`;
  // Only seed the default container when there are no container instances at all
  // (e.g. fresh user). When hasContainerInstance is true, the default will NOT
  // be re-added even if it's missing from validPersisted — this prevents
  // overriding deliberate user removal of the default container.
  if (!hasContainerInstance) {
    // The default key will come from missingFromRegistry below.
  }

  const missingFromRegistry = DEFAULT_WIDGET_ORDER.filter((key) => {
    if (hasContainerInstance && (key in TEMPLATE_REWRITES || key === defaultInstanceKey))
      return false;
    return !validPersisted.includes(key);
  });

  return [...validPersisted, ...missingFromRegistry];
}

/**
 * Returns the ordered list of widget metadata that should be visible.
 */
export function getVisibleWidgets(
  vm: DashboardViewModel,
  hiddenKeys: string[],
  order: string[]
): DashboardWidgetMeta[] {
  const mergedOrder = mergeWidgetOrder(order);
  const hiddenSet = new Set(hiddenKeys);

  return mergedOrder
    .map((key) => resolveWidgetKey(key))
    .filter((w): w is DashboardWidgetMeta => !!w)
    .filter((w) => !hiddenSet.has(w.key) || !w.hidableByUser)
    .filter((w) => w.isEligible(vm));
}

/**
 * Returns the ordered list of hidden widget metadata.
 */
export function getHiddenWidgets(hiddenKeys: string[], order: string[]): DashboardWidgetMeta[] {
  const mergedOrder = mergeWidgetOrder(order);
  const hiddenSet = new Set(hiddenKeys);

  return mergedOrder
    .map((key) => resolveWidgetKey(key))
    .filter((w): w is DashboardWidgetMeta => !!w)
    .filter((w) => hiddenSet.has(w.key) && w.hidableByUser && !isContainerInstanceKey(w.key));
}
