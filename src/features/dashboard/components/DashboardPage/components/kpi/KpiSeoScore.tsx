import { ScanOutlined } from "@ant-design/icons";
import { Typography, theme } from "antd";
import type { SeoBasics, SeoOverview, TFunc } from "../../types";
import { StatTile } from "../StatTile";

export interface KpiSeoScoreProps {
  seoBasics: SeoBasics | null | undefined;
  seo: SeoOverview | null | undefined;
  t: TFunc;
}

export function KpiSeoScore({ seoBasics, seo, t }: KpiSeoScoreProps) {
  const { token } = theme.useToken();

  const score = seoBasics?.score ?? seo?.score;
  const issueCount = seo?.issues?.length ?? 0;
  const hasData = score != null;

  let color: string;
  let value: React.ReactNode;
  let sub: React.ReactNode;
  let tooltip: string;

  if (!hasData) {
    color = token.colorTextSecondary;
    value = "\u2014";
    sub = null;
    tooltip = t("Install an SEO plugin to track your search visibility");
  } else {
    if (score >= 80) color = token.colorSuccess;
    else if (score >= 50) color = token.colorWarning;
    else color = token.colorError;

    value = `${score}%`;

    if (issueCount > 0) {
      sub = (
        <Typography.Text style={{ fontSize: 12, color: token.colorTextTertiary }}>
          {issueCount === 1
            ? t("{n} issue", { n: issueCount })
            : t("{n} issues", { n: issueCount })}
        </Typography.Text>
      );
    } else {
      sub = (
        <Typography.Text style={{ fontSize: 12, color: token.colorSuccess }}>
          {t("No issues")}
        </Typography.Text>
      );
    }

    tooltip = t("Your search engine visibility score based on SEO checks");
  }

  return (
    <StatTile
      icon={<ScanOutlined />}
      label={t("SEO Score")}
      value={value}
      sub={sub}
      color={color}
      tooltip={tooltip}
    />
  );
}
