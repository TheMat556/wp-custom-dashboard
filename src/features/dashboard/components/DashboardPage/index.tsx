import { Alert, Grid, Spin } from "antd";
import { lazy, Suspense, useMemo } from "react";
import { useStore } from "zustand";
import PageCanvas from "../../../../shared/ui/PageCanvas";
import { useFeature, useLicense } from "../../../license/context/LicenseContext";
import { dashboardEditModeStore } from "../../store/dashboardEditModeStore";
import { DashboardContent } from "./DashboardContent";
import { useDashboardData } from "./hooks/useDashboardData";
import { getGreeting } from "./utils/formatters";

const EditModeChrome = lazy(() => import("./components/edit/EditModeChrome"));

export default function DashboardPage() {
  const screens = Grid.useBreakpoint();
  const isMd = !!screens.md;
  const isLg = !!screens.lg;
  const greetingKey = useMemo(() => getGreeting(), []);
  const canViewDashboard = useFeature("dashboard");
  const license = useLicense();

  const { config, t, intlLocale, loading, data, closeChecklist, ...viewModel } =
    useDashboardData(canViewDashboard);

  const isEditing = useStore(dashboardEditModeStore, (s) => s.isEditing);

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

  const content = (
    <DashboardContent
      config={config}
      t={t}
      intlLocale={intlLocale}
      greetingKey={greetingKey}
      viewModel={viewModel}
      isMd={isMd}
      isLg={isLg}
      closeChecklist={closeChecklist}
      isEditing={isEditing}
    />
  );

  return (
    <PageCanvas>
      {isEditing ? (
        <Suspense fallback={null}>
          <EditModeChrome viewModel={viewModel}>{content}</EditModeChrome>
        </Suspense>
      ) : (
        content
      )}
    </PageCanvas>
  );
}
