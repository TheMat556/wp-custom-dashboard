import { Flex, Grid, Spin, theme } from "antd";
import { useMemo } from "react";
import { useDashboardData } from "./hooks/useDashboardData";
import { getGreeting } from "./utils/formatters";
import { DashboardContent } from "./DashboardContent";

export default function DashboardPage() {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isMd = !!screens.md;
  const isLg = !!screens.lg;
  const greetingKey = useMemo(() => getGreeting(), []);

  const { config, t, intlLocale, loading, data, closeChecklist, ...viewModel } =
    useDashboardData();

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
      </div>
    </div>
  );
}
