import { SafetyCertificateOutlined } from "@ant-design/icons";
import { Flex, Tag, theme } from "antd";
import type { LegalCompliance, TFunc } from "../../types";
import { StatTile } from "../StatTile";

export interface KpiLegalProps {
  legalData: LegalCompliance | null | undefined;
  t: TFunc;
}

export function KpiLegal({ legalData, t }: KpiLegalProps) {
  const { token } = theme.useToken();

  if (!legalData) {
    return (
      <StatTile
        icon={<SafetyCertificateOutlined />}
        label={t("Legal")}
        value="\u2014"
        color={token.colorTextSecondary}
        tooltip={t("Legal compliance data not available")}
      />
    );
  }

  const privacyOk = legalData.privacyPolicy?.published ?? false;
  const impressumOk = legalData.impressum?.published ?? false;
  const trackingOk = !legalData.trackingWithoutConsent;
  const allGood = privacyOk && impressumOk && trackingOk;

  const color = allGood ? token.colorSuccess : token.colorError;
  const value = allGood ? t("All good") : t("Action needed");

  const sub = (
    <Flex gap={4} wrap="wrap" align="center">
      {privacyOk ? (
        <Tag color="success" style={{ margin: 0, fontSize: 11, lineHeight: "18px" }}>
          {t("Privacy Policy")}
        </Tag>
      ) : (
        <Tag color="error" style={{ margin: 0, fontSize: 11, lineHeight: "18px" }}>
          {t("Privacy Policy")}
        </Tag>
      )}
      {impressumOk ? (
        <Tag color="success" style={{ margin: 0, fontSize: 11, lineHeight: "18px" }}>
          {t("Impressum")}
        </Tag>
      ) : (
        <Tag color="error" style={{ margin: 0, fontSize: 11, lineHeight: "18px" }}>
          {t("Impressum")}
        </Tag>
      )}
      {trackingOk ? (
        <Tag color="success" style={{ margin: 0, fontSize: 11, lineHeight: "18px" }}>
          {t("Tracking consent")}
        </Tag>
      ) : (
        <Tag color="error" style={{ margin: 0, fontSize: 11, lineHeight: "18px" }}>
          {t("Tracking consent")}
        </Tag>
      )}
    </Flex>
  );

  const tooltip = allGood
    ? t("Privacy policy and impressum are published, tracking complies with consent rules")
    : t("Some legal requirements need your attention — check the Site Status section");

  return (
    <StatTile
      icon={<SafetyCertificateOutlined />}
      label={t("Legal")}
      value={value}
      sub={sub}
      color={color}
      tooltip={tooltip}
    />
  );
}
