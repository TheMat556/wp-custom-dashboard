import { FormOutlined } from "@ant-design/icons";
import { Flex, Tag, Typography, theme } from "antd";
import type { SubmissionStats, TFunc } from "../../types";
import { StatTile } from "../StatTile";

export interface KpiConversionsProps {
  submissionStats: SubmissionStats | null | undefined;
  t: TFunc;
}

function renderConversionTags(
  forms: number | null,
  bookings: number | null,
  hasAny: boolean,
  t: TFunc
): React.ReactNode {
  if (!hasAny) {
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {t("No plugin detected")}
      </Typography.Text>
    );
  }

  const parts: React.ReactNode[] = [];
  if (forms !== null) {
    parts.push(
      <Tag key="forms" color="blue" style={{ margin: 0, fontSize: 11 }}>
        {forms} {t("forms")}
      </Tag>
    );
  }
  if (bookings !== null) {
    parts.push(
      <Tag key="bookings" color="purple" style={{ margin: 0, fontSize: 11 }}>
        {bookings} {t("bookings")}
      </Tag>
    );
  }
  return (
    <Flex gap={3} wrap="wrap">
      {parts}
    </Flex>
  );
}

export function KpiConversions({ submissionStats, t }: KpiConversionsProps) {
  const { token } = theme.useToken();
  const forms = submissionStats?.formSubmissions30d ?? null;
  const bookings = submissionStats?.bookings30d ?? null;
  const hasAny = forms !== null || bookings !== null;
  const total = (forms ?? 0) + (bookings ?? 0);
  const value = hasAny ? total : "—";
  const color = hasAny && total > 0 ? token.colorSuccess : token.colorTextSecondary;
  const tooltip = t("Form submissions and bookings in the last 30 days");

  return (
    <StatTile
      icon={<FormOutlined />}
      label={t("Conversions (30d)")}
      value={value}
      sub={renderConversionTags(forms, bookings, hasAny, t)}
      color={color}
      tooltip={tooltip}
    />
  );
}
