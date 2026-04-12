import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Alert, Button, Flex, Progress, Typography, theme } from "antd";
import { navigate } from "../../../../../utils/wp";
import type { SeoBasicsSectionProps } from "../types";
import { Section } from "./Section";

const { Text } = Typography;

export function SeoBasicsSection({ seoBasics, adminUrl }: SeoBasicsSectionProps) {
  const { token } = theme.useToken();
  const checks = Object.values(seoBasics.checks);
  return (
    <Section
      icon={<SearchOutlined />}
      title="SEO Basics"
      description={
        seoBasics.plugin
          ? `Powered by ${seoBasics.plugin}`
          : "Basic checks — no SEO plugin required"
      }
      extra={
        <Flex align="center" gap={8}>
          <Progress
            type="circle"
            percent={seoBasics.score}
            size={36}
            strokeColor={seoBasics.score >= 75 ? token.colorSuccess : token.colorWarning}
          />
        </Flex>
      }
    >
      {checks.map((check, i) => (
        <Flex
          key={check.label}
          align="center"
          justify="space-between"
          gap={8}
          style={{
            padding: "9px 0",
            borderBottom:
              i < checks.length - 1 ? `1px solid ${token.colorBorderSecondary}` : undefined,
          }}
        >
          <Flex align="center" gap={8}>
            {check.ok ? (
              <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 14 }} />
            ) : (
              <ExclamationCircleOutlined
                style={{
                  color: check.critical ? token.colorError : token.colorWarning,
                  fontSize: 14,
                }}
              />
            )}
            <Text style={{ fontSize: 14 }}>{check.label}</Text>
          </Flex>
          {!check.ok && check.url && (
            <Button
              size="small"
              type="link"
              style={{ padding: 0, fontSize: 12, flexShrink: 0 }}
              onClick={() => {
                if (check.url) navigate(check.url, adminUrl);
              }}
            >
              Fix →
            </Button>
          )}
        </Flex>
      ))}
      {!seoBasics.plugin && (
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          message={
            <Text style={{ fontSize: 12 }}>
              Install Yoast SEO (free) for full SEO tracking, meta descriptions, and XML sitemaps.
            </Text>
          }
          style={{ marginTop: 12, borderRadius: token.borderRadius }}
          action={
            <Button
              size="small"
              onClick={() =>
                navigate("plugin-install.php?s=yoast+seo&tab=search&type=term", adminUrl)
              }
            >
              Install free
            </Button>
          }
        />
      )}
    </Section>
  );
}
