import { FileProtectOutlined } from "@ant-design/icons";
import { Alert, Button, Flex, Tag, Typography, theme } from "antd";
import { navigate } from "../../../../../utils/wp";
import type { LegalSectionProps } from "../types";
import { Section } from "./Section";

const { Text } = Typography;

export function LegalSection({ legal, adminUrl }: LegalSectionProps) {
  const { token } = theme.useToken();
  const rows = [
    {
      key: "privacy",
      label: legal.privacyPolicy.title ?? "Privacy Policy",
      item: legal.privacyPolicy,
      url: legal.privacyPolicy.editUrl ?? "options-privacy.php",
    },
    {
      key: "impressum",
      label: legal.impressum.title ?? "Imprint / Impressum",
      item: legal.impressum,
      url: legal.impressum.editUrl ?? "post-new.php?post_type=page",
    },
  ];
  const allOk = rows.every((r) => r.item.exists && r.item.published) && !legal.trackingWithoutConsent;

  return (
    <Section
      icon={<FileProtectOutlined />}
      title="Legal & Compliance"
      description="Required pages and data protection status"
      extra={
        allOk ? (
          <Tag color="success" style={{ margin: 0 }}>
            All good
          </Tag>
        ) : (
          <Tag color="error" style={{ margin: 0 }}>
            Action needed
          </Tag>
        )
      }
    >
      {rows.map((row) => {
        const ok = row.item.exists && row.item.published;
        const warn = row.item.exists && !row.item.published;
        const color = ok ? token.colorSuccess : warn ? token.colorError : token.colorWarning;
        const statusLabel = ok
          ? "Published"
          : warn
            ? `Draft${row.item.daysOld ? ` (${row.item.daysOld}d old)` : ""}`
            : "Missing";
        return (
          <Flex
            key={row.key}
            align="center"
            justify="space-between"
            gap={8}
            style={{ padding: "10px 0", borderBottom: `1px solid ${token.colorBorderSecondary}` }}
          >
            <Flex align="center" gap={8}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                }}
              />
              <div>
                <Text style={{ fontSize: 14 }}>{row.label}</Text>
                {!ok && (
                  <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                    {warn
                      ? "This legal page exists but is not published — visitors cannot access it."
                      : "This required page is missing."}
                  </Text>
                )}
              </div>
            </Flex>
            <Flex align="center" gap={8} style={{ flexShrink: 0 }}>
              <Tag
                color={ok ? "success" : warn ? "error" : "warning"}
                style={{ margin: 0, fontSize: 12 }}
              >
                {statusLabel}
              </Tag>
              {!ok && (
                <Button size="small" onClick={() => navigate(row.url, adminUrl)}>
                  {warn ? "Publish now" : "Create"}
                </Button>
              )}
            </Flex>
          </Flex>
        );
      })}
      <Flex
        align="center"
        justify="space-between"
        gap={8}
        style={{ padding: "10px 0", borderBottom: `1px solid ${token.colorBorderSecondary}` }}
      >
        <Flex align="center" gap={8}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: legal.cookiePlugin ? token.colorSuccess : token.colorWarning,
              flexShrink: 0,
            }}
          />
          <div>
            <Text style={{ fontSize: 14 }}>Cookie Consent</Text>
            {!legal.cookiePlugin && (
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                No cookie notice plugin detected.
              </Text>
            )}
          </div>
        </Flex>
        <Tag color={legal.cookiePlugin ? "success" : "warning"} style={{ margin: 0, fontSize: 12 }}>
          {legal.cookiePlugin ?? "Not configured"}
        </Tag>
      </Flex>
      {legal.trackingWithoutConsent && (
        <Alert
          type="warning"
          showIcon
          message={
            <Text style={{ fontSize: 12 }}>
              Tracking plugin active without cookie consent banner — this may violate GDPR.
            </Text>
          }
          style={{ marginTop: 12, borderRadius: token.borderRadius }}
          action={
            <Button size="small" onClick={() => navigate("plugins.php", adminUrl)}>
              Review plugins
            </Button>
          }
        />
      )}
    </Section>
  );
}
