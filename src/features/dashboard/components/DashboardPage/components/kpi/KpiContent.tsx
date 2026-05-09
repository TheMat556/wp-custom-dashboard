import { FileTextOutlined } from "@ant-design/icons";
import { Typography, theme } from "antd";
import type { AtAGlanceData, TFunc } from "../../types";
import { StatTile } from "../StatTile";

export interface KpiContentProps {
  stats: AtAGlanceData | null | undefined;
  t: TFunc;
}

export function KpiContent({ stats, t }: KpiContentProps) {
  const { token } = theme.useToken();

  if (!stats) {
    return (
      <StatTile
        icon={<FileTextOutlined />}
        label={t("Content")}
        value="\u2014"
        color={token.colorTextSecondary}
        tooltip={t("Post and page content overview")}
      />
    );
  }

  const totalDrafts = (stats.postsDraft ?? 0) + (stats.pagesDraft ?? 0);

  const value = t("{n} posts \u00B7 {m} pages", {
    n: stats.posts ?? 0,
    m: stats.pages ?? 0,
  });

  const sub =
    totalDrafts > 0 ? (
      <Typography.Text style={{ fontSize: 12, color: token.colorWarning }}>
        {totalDrafts === 1
          ? t("{n} draft", { n: totalDrafts })
          : t("{n} drafts", { n: totalDrafts })}
      </Typography.Text>
    ) : (
      <Typography.Text style={{ fontSize: 12, color: token.colorTextTertiary }}>
        {t("No drafts")}
      </Typography.Text>
    );

  return (
    <StatTile
      icon={<FileTextOutlined />}
      label={t("Content")}
      value={value}
      sub={sub}
      color={token.colorPrimary}
      tooltip={t("Published posts, pages, and drafts overview")}
    />
  );
}
