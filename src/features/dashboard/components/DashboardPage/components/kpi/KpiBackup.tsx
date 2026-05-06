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
}

function daysSince(dateStr: string): number {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return Infinity;
  return Math.floor((now - then) / 86_400_000);
}

export function KpiBackup({ lastBackupDate, t }: KpiBackupProps) {
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

    if (days <= 1) {
      icon = <CheckCircleOutlined />;
      value = t("Today");
      color = token.colorSuccess;
      tooltip = t("Backed up less than 24 hours ago");
    } else if (days <= 7) {
      icon = <CheckCircleOutlined />;
      value = t("{n}d ago", { n: days });
      color = token.colorSuccess;
      tooltip = `Last backup: ${lastBackupDate}`;
    } else if (days <= 30) {
      icon = <ClockCircleOutlined />;
      value = t("{n}d ago", { n: days });
      color = token.colorWarning;
      tooltip = `Last backup: ${lastBackupDate}`;
    } else {
      icon = <ExclamationCircleOutlined />;
      value = t("{n}d ago", { n: days });
      color = token.colorError;
      tooltip = t("Backup is overdue — more than 30 days ago");
    }

    sub = (
      <Typography.Text style={{ fontSize: 11, color: token.colorTextTertiary }}>
        {lastBackupDate}
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
