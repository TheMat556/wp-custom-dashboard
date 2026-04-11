import { Tooltip, Typography, theme } from "antd";
import type { CalendarBooking, WeekCalendarProps } from "../types";

const { Text } = Typography;

export function WeekCalendar({ weekDays, intlLocale }: WeekCalendarProps) {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${weekDays.length}, 1fr)`,
        gap: 6,
        overflowX: "auto",
        minWidth: 0,
      }}
    >
      {weekDays.map((day) => {
        const localLabel = new Date(`${day.date}T12:00:00`).toLocaleDateString(intlLocale, {
          weekday: "short",
        });
        return (
          <div
            key={day.date}
            style={{
              borderRadius: token.borderRadius,
              border: `1px solid ${day.isToday ? `${token.colorPrimary}60` : token.colorBorderSecondary}`,
              background: day.isToday ? `${token.colorPrimary}08` : "var(--color-bg-surface-muted)",
              padding: "8px 4px",
              minWidth: 0,
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 6 }}>
              <div
                style={{
                  fontSize: 11,
                  color: day.isToday ? token.colorPrimary : token.colorTextSecondary,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                {localLabel}
              </div>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: day.isToday ? token.colorPrimary : "transparent",
                  color: day.isToday ? "#fff" : token.colorText,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "2px auto 0",
                  fontSize: 14,
                  fontWeight: day.isToday ? 700 : 400,
                }}
              >
                {day.dayNum}
              </div>
            </div>
            {day.bookings.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  —
                </Text>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {day.bookings.map((b: CalendarBooking) => {
                  const timeStr = new Date(b.startDate).toLocaleTimeString(intlLocale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <Tooltip key={b.id} title={`${b.customerName || "—"} · ${timeStr}`}>
                      <div
                        style={{
                          padding: "2px 4px",
                          borderRadius: 4,
                          background: `${token.colorPrimary}18`,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: token.colorPrimary,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {timeStr}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: token.colorText,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontWeight: 500,
                          }}
                        >
                          {b.customerName || "—"}
                        </div>
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
