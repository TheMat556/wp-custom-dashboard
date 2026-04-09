import { Grid, Spin } from "antd";
import { useMemo } from "react";
import PageCanvas from "../../../../shared/ui/PageCanvas";
import { DashboardContent } from "./DashboardContent";
import { useDashboardData } from "./hooks/useDashboardData";
import { getGreeting } from "./utils/formatters";

export default function DashboardPage() {
  const screens = Grid.useBreakpoint();
  const isMd = !!screens.md;
  const isLg = !!screens.lg;
  const greetingKey = useMemo(() => getGreeting(), []);

  const { config, t, intlLocale, loading, data, closeChecklist, ...viewModel } = useDashboardData();

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
