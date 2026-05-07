import { UpCircleOutlined } from "@ant-design/icons";
import { Flex, Tag, Typography, theme } from "antd";
import { navigate } from "../../../../../../utils/wp";
import type { PendingUpdates, TFunc } from "../../types";
import { relativeTime } from "../../utils/formatters";
import { StatTile } from "../StatTile";

export interface KpiUpdatesProps {
  updates: PendingUpdates | null | undefined;
  hasUpdates: boolean;
  t: TFunc;
  intlLocale: string;
  adminUrl: string;
}

function getUpdatesSub(
  updates: PendingUpdates | null | undefined,
  hasUpdates: boolean,
  intlLocale: string,
  t: TFunc
): React.ReactNode {
  if (hasUpdates) {
    return (
      <Flex gap={3} wrap="wrap">
        {(updates?.plugins ?? 0) > 0 && (
          <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
            {updates?.plugins} {t("plugins")}
          </Tag>
        )}
        {(updates?.themes ?? 0) > 0 && (
          <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>
            {updates?.themes} {t("themes")}
          </Tag>
        )}
        {(updates?.core ?? 0) > 0 && (
          <Tag color="red" style={{ margin: 0, fontSize: 11 }}>
            {t("WordPress")}
          </Tag>
        )}
      </Flex>
    );
  }
  if (updates?.lastChecked) {
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {relativeTime(updates.lastChecked, intlLocale)}
      </Typography.Text>
    );
  }
  return (
    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
      {t("All up to date")}
    </Typography.Text>
  );
}

export function KpiUpdates({ updates, hasUpdates, t, intlLocale, adminUrl }: KpiUpdatesProps) {
  const { token } = theme.useToken();
  const color = hasUpdates ? token.colorWarning : token.colorSuccess;
  const tooltip = hasUpdates
    ? t("Updates fix security issues. Make a backup first, then update.")
    : t("Everything is up to date");
  return (
    <StatTile
      icon={<UpCircleOutlined />}
      label={t("Updates")}
      value={updates?.total ?? 0}
      sub={getUpdatesSub(updates, hasUpdates, intlLocale, t)}
      color={color}
      tooltip={tooltip}
      onClick={() => navigate("update-core.php", adminUrl)}
    />
  );
}
