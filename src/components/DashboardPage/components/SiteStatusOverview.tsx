import {
  BankOutlined,
  FileProtectOutlined,
  InfoCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Collapse, Flex, Tag, Typography, theme } from "antd";
import type { SiteStatusOverviewProps } from "../types";
import { BusinessSection } from "./BusinessSection";
import { LegalSection } from "./LegalSection";
import { SeoBasicsSection } from "./SeoBasicsSection";
import { Section } from "./Section";

const { Text } = Typography;

export function SiteStatusOverview({
  legalData,
  bizData,
  seoBasics,
  t,
  adminUrl,
}: SiteStatusOverviewProps) {
  const { token } = theme.useToken();

  const collapseItems = [
    ...(legalData
      ? [
          {
            key: "legal",
            label: (
              <Flex align="center" gap={8}>
                <FileProtectOutlined style={{ color: token.colorPrimary, fontSize: 14 }} />
                <Text style={{ fontSize: 14 }}>{t("Legal & Compliance")}</Text>
                {!legalData.privacyPolicy.published ||
                !legalData.impressum.published ||
                legalData.trackingWithoutConsent ? (
                  <Tag color="error" style={{ margin: 0, fontSize: 12 }}>
                    {t("Action needed")}
                  </Tag>
                ) : (
                  <Tag color="success" style={{ margin: 0, fontSize: 12 }}>
                    {t("All good")}
                  </Tag>
                )}
              </Flex>
            ),
            children: <LegalSection legal={legalData} adminUrl={adminUrl} />,
          },
        ]
      : []),
    ...(bizData
      ? [
          {
            key: "business",
            label: (
              <Flex align="center" gap={8}>
                <BankOutlined style={{ color: token.colorPrimary, fontSize: 14 }} />
                <Text style={{ fontSize: 14 }}>{t("Business Functions")}</Text>
                {!bizData.contactForms.available || !bizData.emailDelivery.smtpPlugin ? (
                  <Tag color="warning" style={{ margin: 0, fontSize: 12 }}>
                    Review
                  </Tag>
                ) : (
                  <Tag color="success" style={{ margin: 0, fontSize: 12 }}>
                    {t("Active")}
                  </Tag>
                )}
              </Flex>
            ),
            children: <BusinessSection biz={bizData} adminUrl={adminUrl} />,
          },
        ]
      : []),
    ...(seoBasics
      ? [
          {
            key: "seo",
            label: (
              <Flex align="center" gap={8}>
                <SearchOutlined style={{ color: token.colorPrimary, fontSize: 14 }} />
                <Text style={{ fontSize: 14 }}>{t("SEO Basics")}</Text>
                <Tag
                  color={seoBasics.score >= 75 ? "success" : "warning"}
                  style={{ margin: 0, fontSize: 12 }}
                >
                  {seoBasics.score}%
                </Tag>
              </Flex>
            ),
            children: <SeoBasicsSection seoBasics={seoBasics} adminUrl={adminUrl} />,
          },
        ]
      : []),
  ];

  return (
    <Section
      icon={<InfoCircleOutlined />}
      title={t("Site Status Overview")}
      description={t("Legal compliance, business functions, and SEO health")}
    >
      <Collapse ghost items={collapseItems} />
    </Section>
  );
}
