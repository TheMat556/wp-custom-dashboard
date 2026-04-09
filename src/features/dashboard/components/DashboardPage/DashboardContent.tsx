import { HeroBanner } from "./components/HeroBanner";
import { OfflineAlert } from "./components/OfflineAlert";
import { SummaryTiles } from "./components/SummaryTiles";
import { FirstStepsChecklist } from "./components/FirstStepsChecklist";
import { TrafficCharts } from "./components/TrafficCharts";
import { UpcomingBookings } from "./components/UpcomingBookings";
import { ActionCenter } from "./components/ActionCenter";
import { UpdatesSection } from "./components/UpdatesSection";
import { SiteStatusOverview } from "./components/SiteStatusOverview";
import type { TFunc } from "./types";
import type { DashboardViewModel } from "../../dashboardViewModel";
import type { WpReactUiConfig } from "../../../../types/wp";

interface DashboardContentProps {
  config: WpReactUiConfig;
  t: TFunc;
  intlLocale: string;
  greetingKey: string;
  viewModel: DashboardViewModel;
  isMd: boolean;
  isLg: boolean;
  closeChecklist: () => void;
}

export function DashboardContent({
  config,
  t,
  intlLocale,
  greetingKey,
  viewModel,
  isMd,
  isLg,
  closeChecklist,
}: DashboardContentProps) {
  return (
    <>
      <HeroBanner
        userName={config.user.name}
        adminUrl={config.adminUrl}
        greetingKey={greetingKey}
        intlLocale={intlLocale}
        t={t}
        total30Views={viewModel.total30Views}
        viewTrend={viewModel.viewTrend}
        sparkline={viewModel.sparkline}
        stats={viewModel.stats}
        readiness={viewModel.readiness}
        isMd={isMd}
      />

      {viewModel.isSiteDown && viewModel.speed && (
        <div style={{ marginBottom: 16 }}>
          <OfflineAlert
            speed={viewModel.speed}
            t={t}
            intlLocale={intlLocale}
            adminUrl={config.adminUrl}
          />
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <SummaryTiles
          isSiteDown={viewModel.isSiteDown}
          health={viewModel.health}
          speed={viewModel.speed}
          updates={viewModel.updates}
          seo={viewModel.seo}
          seoBasics={viewModel.seoBasics}
          total30Views={viewModel.total30Views}
          viewTrend={viewModel.viewTrend}
          hasUpdates={viewModel.hasUpdates}
          t={t}
          intlLocale={intlLocale}
          adminUrl={config.adminUrl}
          isLg={isLg}
          isMd={isMd}
        />
      </div>

      {viewModel.showChecklist && (
        <>
          <FirstStepsChecklist
            checklist={viewModel.checklist}
            checklistDone={viewModel.checklistDone}
            t={t}
            adminUrl={config.adminUrl}
            isMd={isMd}
            onClose={closeChecklist}
          />
          <div style={{ height: 20 }} />
        </>
      )}

      <TrafficCharts
        trend={viewModel.trend}
        countries={viewModel.countries}
        t={t}
        intlLocale={intlLocale}
        isMd={isMd}
      />

      {viewModel.calendar?.available && (
        <UpcomingBookings
          calendar={viewModel.calendar}
          t={t}
          intlLocale={intlLocale}
          adminUrl={config.adminUrl}
          isMd={isMd}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
        <ActionCenter
          actions={viewModel.actions}
          criticalActions={viewModel.criticalActions}
          warningActions={viewModel.warningActions}
          infoActions={viewModel.infoActions}
          hasUpdates={viewModel.hasUpdates}
          t={t}
          adminUrl={config.adminUrl}
        />

        {viewModel.hasUpdates && viewModel.updates && (
          <UpdatesSection
            updates={viewModel.updates}
            t={t}
            adminUrl={config.adminUrl}
            isMd={isMd}
          />
        )}

        {(viewModel.legalData || viewModel.bizData || viewModel.seoBasics) && (
          <SiteStatusOverview
            legalData={viewModel.legalData}
            bizData={viewModel.bizData}
            seoBasics={viewModel.seoBasics}
            t={t}
            adminUrl={config.adminUrl}
          />
        )}
      </div>
    </>
  );
}
