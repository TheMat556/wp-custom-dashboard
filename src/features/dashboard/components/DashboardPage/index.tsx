import { Alert, Grid, Spin } from "antd";
import { useMemo } from "react";
import PageCanvas from "../../../../shared/ui/PageCanvas";
import { useFeature, useLicense } from "../../../license/context/LicenseContext";
import { DashboardContent } from "./DashboardContent";
import { useDashboardData } from "./hooks/useDashboardData";
import { getGreeting } from "./utils/formatters";

export default function DashboardPage() {
  const screens = Grid.useBreakpoint();
  const isMd = !!screens.md;
  const isLg = !!screens.lg;
  const greetingKey = useMemo(() => getGreeting(), []);
  const canViewDashboard = useFeature("dashboard");
  const license = useLicense();

  const { config, t, intlLocale, loading, data, closeChecklist, ...viewModel } =
    useDashboardData(canViewDashboard);

  if (!canViewDashboard) {
    return (
      <PageCanvas>
        <Alert
          type="warning"
          showIcon
          message="Dashboard locked"
          description={
            license.hasKey
              ? "The current license does not include dashboard access."
              : "Activate a license to unlock the dashboard."
          }
        />
      </PageCanvas>
    );
  }

  if (loading && !data) {
    return (
      <PageCanvas centered aria-busy="true">
        <Spin size="large" />
      </PageCanvas>
    );
  }

  return (
    <PageCanvas>
      <DashboardContent
        config={config}
        t={t}
        intlLocale={intlLocale}
        greetingKey={greetingKey}
        viewModel={viewModel}
        isMd={isMd}
        isLg={isLg}
        closeChecklist={closeChecklist}
      />
    </PageCanvas>
  );
}
