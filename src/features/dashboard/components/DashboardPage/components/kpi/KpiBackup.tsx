import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { Typography, theme } from "antd";
import type { TFunc } from "../../types";
import { StatTile } from "../StatTile";

export interface KpiBackupProps {
  lastBackupDate: string | null | undefined;
  t: TFunc;
  intlLocale?: string;
}

function daysSince(dateStr: string): number {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return Infinity;
  return Math.floor((now - then) / 86_400_000);
}

function formatDate(dateStr: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function KpiBackup({ lastBackupDate, t, intlLocale = "en" }: KpiBackupProps) {
  const { token } = theme.useToken();

  let icon: React.ReactNode;
  let value: string;
  let sub: React.ReactNode;
  let color: string;
  let tooltip: string;

  if (!lastBackupDate) {
    icon = <ExclamationCircleOutlined />;
    value = t("Never");
    sub = (
      <Typography.Text style={{ fontSize: 12, color: token.colorTextTertiary }}>
        {t("No backup recorded")}
      </Typography.Text>
    );
    color = token.colorError;
    tooltip = t("No backup has been recorded yet");
  } else {
    const days = daysSince(lastBackupDate);
    const formattedDate = formatDate(lastBackupDate, intlLocale);

    if (days === 0) {
      icon = <CheckCircleOutlined />;
      value = t("Today");
      color = token.colorSuccess;
      tooltip = t("Backed up less than 24 hours ago");
    } else if (days === 1) {
      icon = <CheckCircleOutlined />;
      value = t("Yesterday");
      color = token.colorSuccess;
      tooltip = t("Last backup: {date}", { date: formattedDate });
    } else if (days <= 7) {
      icon = <CheckCircleOutlined />;
      value = t("{n}d ago", { n: days });
      color = token.colorSuccess;
      tooltip = t("Last backup: {date}", { date: formattedDate });
    } else if (days <= 30) {
      icon = <ClockCircleOutlined />;
      value = t("{n}d ago", { n: days });
      color = token.colorWarning;
      tooltip = t("Last backup: {date}", { date: formattedDate });
    } else {
      icon = <ExclamationCircleOutlined />;
      value = t("{n}d ago", { n: days });
      color = token.colorError;
      tooltip = t("Backup is overdue — more than 30 days ago");
    }

    sub = (
      <Typography.Text style={{ fontSize: 11, color: token.colorTextTertiary }}>
        {formattedDate}
      </Typography.Text>
    );
  }

  return (
    <StatTile
      icon={icon}
      label={t("Backup")}
      value={value}
      sub={sub}
      color={color}
      tooltip={tooltip}
    />
  );
}
