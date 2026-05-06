import { CloudUploadOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { useMemo } from "react";
import { useStore } from "zustand";
import { createT } from "../../../../utils/i18n";
import { relativeTime } from "../../../dashboard/components/DashboardPage/utils/formatters";
import { dashboardStore } from "../../../dashboard/store/dashboardStore";
import { useShellConfig } from "../../context/ShellConfigContext";

/**
 * Attempt to parse a date string. Returns a valid Date or undefined.
 */
function tryParseDate(dateStr: string): Date | undefined {
  try {
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? undefined : d;
  } catch {
    return undefined;
  }
}

function formatDateString(dateStr: string): string {
  const d = tryParseDate(dateStr);
  if (!d) return dateStr;
  return relativeTime(d.getTime() / 1000, "en");
}

function formatAbsoluteDate(dateStr: string): string {
  const d = tryParseDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface LastBackupIndicatorProps {
  isMobile?: boolean;
}

export function LastBackupIndicator({ isMobile }: LastBackupIndicatorProps) {
  const config = useShellConfig();
  const t = useMemo(() => createT(config.locale ?? "en_US"), [config.locale]);
  const lastBackupDate = useStore(dashboardStore, (s) => s.data?.atAGlance?.lastBackupDate);

  if (!lastBackupDate) return null;

  const relative = formatDateString(lastBackupDate);
  const absolute = formatAbsoluteDate(lastBackupDate);

  const content = (
    <Tooltip title={t("Last backup: {date}", { date: absolute })}>
      <span
        role="status"
        className={`wp-react-ui-backup-pill${isMobile ? "" : " wp-react-ui-backup-pill--desktop"}`}
        aria-label={t("Last backup: {date}", { date: absolute })}
      >
        <CloudUploadOutlined style={{ fontSize: 12 }} />
        <span>{relative}</span>
      </span>
    </Tooltip>
  );

  if (isMobile) {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
        <CloudUploadOutlined style={{ fontSize: 14 }} />
        <span>{t("Backup: {relative}", { relative })}</span>
      </span>
    );
  }

  return content;
}
