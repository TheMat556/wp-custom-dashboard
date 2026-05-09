import { CalendarOutlined } from "@ant-design/icons";
import { Typography, theme } from "antd";
import type { CalendarPreview, TFunc } from "../../types";
import { StatTile } from "../StatTile";

export interface KpiBookingsProps {
  calendar: CalendarPreview | null | undefined;
  t: TFunc;
}

export function KpiBookings({ calendar, t }: KpiBookingsProps) {
  const { token } = theme.useToken();

  if (!calendar?.available) {
    return (
      <StatTile
        icon={<CalendarOutlined />}
        label={t("Today")}
        value="\u2014"
        color={token.colorTextSecondary}
        tooltip={t("Booking calendar data not available")}
      />
    );
  }

  const todayCount = calendar.totalToday ?? 0;
  const upcomingCount = calendar.upcoming?.length ?? 0;

  const value = todayCount > 0 ? String(todayCount) : "0";
  const color = todayCount > 0 ? token.colorPrimary : token.colorTextSecondary;

  const sub =
    upcomingCount > 0 ? (
      <Typography.Text style={{ fontSize: 12, color: token.colorTextTertiary }}>
        {t("{n} upcoming", { n: upcomingCount })}
      </Typography.Text>
    ) : (
      <Typography.Text style={{ fontSize: 12, color: token.colorTextTertiary }}>
        {t("No bookings")}
      </Typography.Text>
    );

  const tooltip =
    todayCount > 0
      ? t("{n} bookings today, {m} upcoming", { n: todayCount, m: upcomingCount })
      : t("No bookings scheduled for today");

  return (
    <StatTile
      icon={<CalendarOutlined />}
      label={t("Today")}
      value={value}
      sub={sub}
      color={color}
      tooltip={tooltip}
    />
  );
}
