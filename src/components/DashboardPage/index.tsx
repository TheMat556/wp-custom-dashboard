import { Flex, Grid, Spin, theme } from "antd";
import { useMemo } from "react";
import { useDashboardData } from "./hooks/useDashboardData";
import { getGreeting } from "./utils/formatters";
import { ActionCenter } from "./components/ActionCenter";
import { FirstStepsChecklist } from "./components/FirstStepsChecklist";
import { HeroBanner } from "./components/HeroBanner";
import { OfflineAlert } from "./components/OfflineAlert";
import { SiteStatusOverview } from "./components/SiteStatusOverview";
import { SummaryTiles } from "./components/SummaryTiles";
import { TrafficCharts } from "./components/TrafficCharts";
import { UpcomingBookings } from "./components/UpcomingBookings";
import { UpdatesSection } from "./components/UpdatesSection";

export default function DashboardPage() {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isMd = !!screens.md;
  const isLg = !!screens.lg;
  const greetingKey = useMemo(() => getGreeting(), []);

  const {
    config,
    t,
    intlLocale,
    loading,
    data,
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
    closeChecklist,
  } = useDashboardData();

  if (loading && !data) {
    return (
      <Flex align="center" justify="center" style={{ height: "100%", background: token.colorBgLayout }}>
        <Spin size="large" />
      </Flex>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        background: token.colorBgLayout,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: isMd ? 40 : 20,
          boxSizing: "border-box",
        }}
      >
        <HeroBanner
          userName={config.user.name}
          adminUrl={config.adminUrl}
          greetingKey={greetingKey}
          intlLocale={intlLocale}
          t={t}
          total30Views={total30Views}
          viewTrend={viewTrend}
          sparkline={sparkline}
          stats={stats}
          readiness={readiness}
          isMd={isMd}
        />

        {isSiteDown && speed && (
          <div style={{ marginBottom: 16 }}>
            <OfflineAlert speed={speed} t={t} intlLocale={intlLocale} adminUrl={config.adminUrl} />
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <SummaryTiles
            isSiteDown={isSiteDown}
            health={health}
            speed={speed}
            updates={updates}
            seo={seo}
            seoBasics={seoBasics}
            total30Views={total30Views}
            viewTrend={viewTrend}
            hasUpdates={hasUpdates}
            t={t}
            intlLocale={intlLocale}
            adminUrl={config.adminUrl}
            isLg={isLg}
            isMd={isMd}
          />
        </div>

        {showChecklist && (
          <>
            <FirstStepsChecklist
              checklist={checklist}
              checklistDone={checklistDone}
              t={t}
              adminUrl={config.adminUrl}
              isMd={isMd}
              onClose={closeChecklist}
            />
            <div style={{ height: 20 }} />
          </>
        )}

        <TrafficCharts
          trend={trend}
          countries={countries}
          t={t}
          intlLocale={intlLocale}
          isMd={isMd}
        />

        {calendar?.available && (
          <UpcomingBookings
            calendar={calendar}
            t={t}
            intlLocale={intlLocale}
            adminUrl={config.adminUrl}
            isMd={isMd}
          />
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
          <ActionCenter
            actions={actions}
            criticalActions={criticalActions}
            warningActions={warningActions}
            infoActions={infoActions}
            hasUpdates={hasUpdates}
            t={t}
            adminUrl={config.adminUrl}
          />

          {hasUpdates && updates && (
            <UpdatesSection
              updates={updates}
              t={t}
              adminUrl={config.adminUrl}
              isMd={isMd}
            />
          )}

          {(legalData || bizData || seoBasics) && (
            <SiteStatusOverview
              legalData={legalData}
              bizData={bizData}
              seoBasics={seoBasics}
              t={t}
              adminUrl={config.adminUrl}
            />
          )}
        </div>
      </div>
    </div>
  );
}
