import { InfoCircleOutlined, UpCircleOutlined } from "@ant-design/icons";
import { Alert, Button, Flex, Typography, theme } from "antd";
import { navigate } from "../../../../../utils/wp";
import type { CoreUpdateItem, UpdateItem, UpdatesSectionProps } from "../types";
import { Section } from "./Section";

const { Text } = Typography;

export function UpdatesSection({ updates, t, adminUrl, isMd }: UpdatesSectionProps) {
  const { token } = theme.useToken();

  return (
    <Section
      icon={<UpCircleOutlined />}
      title={t("Available Updates")}
      description={t("Review before updating — always backup first")}
    >
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message={
          <Text style={{ fontSize: 12 }}>
            {t(
              "Create a backup before updating. Most hosting control panels offer one-click backups."
            )}
          </Text>
        }
        style={{ marginBottom: 14, borderRadius: token.borderRadius }}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMd ? "repeat(2, 1fr)" : "1fr",
          gap: 8,
        }}
      >
        {updates.coreList?.map((u: CoreUpdateItem, i: number) => (
          <Flex
            key={i}
            align="center"
            justify="space-between"
            gap={8}
            className="wp-react-ui-inset-panel"
            style={{
              padding: "10px 14px",
              borderLeft: `3px solid ${token.colorError}`,
            }}
          >
            <div>
              <Text style={{ fontSize: 14, fontWeight: 500 }}>{t("WordPress Core")}</Text>
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                {u.currentVersion} → {u.newVersion}
              </Text>
            </div>
            <Button size="small" danger onClick={() => navigate("update-core.php", adminUrl)}>
              {t("Update")}
            </Button>
          </Flex>
        ))}
        {updates.pluginList?.map((p: UpdateItem, i: number) => (
          <Flex
            key={i}
            align="center"
            justify="space-between"
            gap={8}
            className="wp-react-ui-inset-panel"
            style={{
              padding: "10px 14px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {p.currentVersion} → {p.newVersion}
                {p.testedUpTo ? ` · ${t("Tested WP {v}", { v: p.testedUpTo })}` : ""}
              </Text>
            </div>
            <Button
              size="small"
              onClick={() => navigate("update-core.php", adminUrl)}
              style={{ flexShrink: 0 }}
            >
              {t("Update")}
            </Button>
          </Flex>
        ))}
        {updates.themeList?.map((th: UpdateItem, i: number) => (
          <Flex
            key={i}
            align="center"
            justify="space-between"
            gap={8}
            className="wp-react-ui-inset-panel"
            style={{
              padding: "10px 14px",
            }}
          >
            <div>
              <Text style={{ fontSize: 14, fontWeight: 500 }}>{th.name} (Theme)</Text>
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                {th.currentVersion} → {th.newVersion}
              </Text>
            </div>
            <Button size="small" onClick={() => navigate("update-core.php", adminUrl)}>
              {t("Update")}
            </Button>
          </Flex>
        ))}
      </div>
    </Section>
  );
}
