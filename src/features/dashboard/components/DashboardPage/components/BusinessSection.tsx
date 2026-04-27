import { BankOutlined, CalendarOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";
import { Alert, Button, Flex, Tag, Typography, theme } from "antd";
import { navigate } from "../../../../../utils/wp";
import type { BusinessSectionProps } from "../types";
import { Section } from "./Section";

const { Text } = Typography;

interface RowProps {
  biz: BusinessSectionProps["biz"];
  t: (key: string) => string;
}

function BookingsRow({ biz, t }: RowProps) {
  const { token } = theme.useToken();
  return (
    <Flex
      align="center"
      justify="space-between"
      gap={8}
      style={{ padding: "10px 0", borderBottom: `1px solid ${token.colorBorderSecondary}` }}
    >
      <Flex align="center" gap={8}>
        <CalendarOutlined
          style={{
            color: biz.bookings.available ? token.colorSuccess : token.colorTextTertiary,
            fontSize: 14,
            flexShrink: 0,
          }}
        />
        <div>
          <Text style={{ fontSize: 14 }}>{t("Booking System")}</Text>
          {biz.bookings.note && (
            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              {biz.bookings.note}
            </Text>
          )}
        </div>
      </Flex>
      <Flex align="center" gap={8} style={{ flexShrink: 0 }}>
        {biz.bookings.available && biz.bookings.totalUpcoming != null && (
          <Tag color="blue" style={{ margin: 0, fontSize: 12 }}>
            {biz.bookings.totalUpcoming}{" "}
            {t("{n} upcoming").split(" ")[0] === "{n}"
              ? t("{n} upcoming").replace("{n}", "")
              : "upcoming"}
          </Tag>
        )}
        <Tag
          color={biz.bookings.available ? "success" : "default"}
          style={{ margin: 0, fontSize: 12 }}
        >
          {biz.bookings.available ? t("Active") : t("Not installed")}
        </Tag>
      </Flex>
    </Flex>
  );
}

function ContactFormsRow({ biz, t }: RowProps) {
  const { token } = theme.useToken();
  return (
    <Flex
      align="center"
      justify="space-between"
      gap={8}
      style={{ padding: "10px 0", borderBottom: `1px solid ${token.colorBorderSecondary}` }}
    >
      <Flex align="center" gap={8}>
        <PhoneOutlined
          style={{
            color: biz.contactForms.available ? token.colorSuccess : token.colorWarning,
            fontSize: 14,
            flexShrink: 0,
          }}
        />
        <div>
          <Text style={{ fontSize: 14 }}>{t("Contact Forms")}</Text>
          {biz.contactForms.note && (
            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              {biz.contactForms.note}
            </Text>
          )}
        </div>
      </Flex>
      <Tag
        color={biz.contactForms.available ? "success" : "warning"}
        style={{ margin: 0, fontSize: 12 }}
      >
        {biz.contactForms.available ? (biz.contactForms.plugin ?? t("Active")) : t("Not installed")}
      </Tag>
    </Flex>
  );
}

function EmailDeliveryRow({ biz, t, adminUrl }: RowProps & { adminUrl?: string }) {
  const { token } = theme.useToken();
  return (
    <>
      <Flex align="center" justify="space-between" gap={8} style={{ paddingTop: 10 }}>
        <Flex align="center" gap={8}>
          <MailOutlined
            style={{
              color: biz.emailDelivery.smtpPlugin ? token.colorSuccess : token.colorWarning,
              fontSize: 14,
              flexShrink: 0,
            }}
          />
          <div>
            <Text style={{ fontSize: 14 }}>{t("Email Delivery")}</Text>
            {biz.emailDelivery.note && (
              <Text type="secondary" style={{ fontSize: 12, display: "block", maxWidth: 280 }}>
                {biz.emailDelivery.note}
              </Text>
            )}
          </div>
        </Flex>
        <Tag
          color={biz.emailDelivery.smtpPlugin ? "success" : "warning"}
          style={{ margin: 0, fontSize: 12, flexShrink: 0 }}
        >
          {biz.emailDelivery.smtpPlugin ? t("Configured") : t("Default (unreliable)")}
        </Tag>
      </Flex>
      {!biz.emailDelivery.smtpPlugin && adminUrl && (
        <Alert
          type="warning"
          showIcon
          message={
            <Text style={{ fontSize: 12 }}>
              {t(
                "Without an SMTP plugin, contact form emails may end up in spam. Install WP Mail SMTP (free) to fix this."
              )}
            </Text>
          }
          style={{ marginTop: 12, borderRadius: token.borderRadius }}
          action={
            <Button
              size="small"
              onClick={() =>
                navigate("plugin-install.php?s=wp+mail+smtp&tab=search&type=term", adminUrl)
              }
            >
              {t("Install free")}
            </Button>
          }
        />
      )}
    </>
  );
}

export function BusinessSection({
  biz,
  adminUrl,
  t,
}: BusinessSectionProps & { t: (key: string) => string }) {
  return (
    <Section
      icon={<BankOutlined />}
      title={t("Business & Contact Functions")}
      description={t("Key tools your customers use to reach you")}
    >
      <BookingsRow biz={biz} t={t} />
      <ContactFormsRow biz={biz} t={t} />
      <EmailDeliveryRow biz={biz} t={t} adminUrl={adminUrl} />
    </Section>
  );
}
