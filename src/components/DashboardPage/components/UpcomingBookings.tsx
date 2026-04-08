import { CalendarOutlined } from "@ant-design/icons";
import { Badge, Button, Flex, Tag, Typography, theme } from "antd";
import { navigate } from "../../../utils/wp";
import type { CalendarBooking, UpcomingBookingsProps } from "../types";
import { formatBookingTime } from "../utils/formatters";
import { Section } from "./Section";
import { WeekCalendar } from "./WeekCalendar";

const { Text } = Typography;

export function UpcomingBookings({
  calendar,
  t,
  intlLocale,
  adminUrl,
  isMd,
}: UpcomingBookingsProps) {
  const { token } = theme.useToken();

  return (
    <div style={{ marginBottom: 16 }}>
      <Section
        icon={<CalendarOutlined />}
        title={t("Upcoming Bookings")}
        description={t("Next 7 days")}
        extra={
          <Flex align="center" gap={8}>
            {calendar.totalToday > 0 && (
              <Badge count={calendar.totalToday} color={token.colorPrimary} />
            )}
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => navigate("admin.php?page=h-bricks-elements", adminUrl)}
            >
              {t("View all")}
            </Button>
          </Flex>
        }
      >
        {calendar.weekDays && calendar.weekDays.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <WeekCalendar weekDays={calendar.weekDays} intlLocale={intlLocale} />
          </div>
        )}
        {calendar.upcoming.length === 0 ? (
          <Flex align="center" justify="center" style={{ height: 48 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("No bookings in the next 7 days")}
            </Text>
          </Flex>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMd ? "repeat(2, 1fr)" : "1fr",
              gap: 8,
            }}
          >
            {calendar.upcoming.map((booking: CalendarBooking) => (
              <Flex
                key={booking.id}
                align="center"
                gap={10}
                style={{
                  padding: "10px 14px",
                  background: token.colorBgLayout,
                  borderRadius: token.borderRadius,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: booking.isToday ? token.colorPrimary : token.colorTextQuaternary,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {booking.customerName || "—"}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {formatBookingTime(booking.startDate, intlLocale, t)}
                  </Text>
                </div>
                {booking.isToday && (
                  <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>
                    {t("Today")}
                  </Tag>
                )}
              </Flex>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
