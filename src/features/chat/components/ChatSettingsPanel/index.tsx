import { SaveOutlined, SettingOutlined } from "@ant-design/icons";
import { Button, Collapse, Flex, Input, Typography } from "antd";
import { useMemo } from "react";
import SurfacePanel from "../../../../shared/ui/SurfacePanel";
import { createT } from "../../../../utils/i18n";
import styles from "./ChatSettingsPanel.module.css";

const { Paragraph, Title, Text } = Typography;

interface ChatSettingsPanelProps {
  locale: string;
  serverUrl: string;
  savedServerUrl: string | null;
  settingsLoading: boolean;
  settingsSaving: boolean;
  serverDirty: boolean;
  onServerUrlChange: (url: string) => void;
  onServerUrlSave: () => Promise<void>;
}

/**
 * Chat backend connection settings panel.
 *
 * Allows managers to configure the license server URL for chat backend.
 */
export function ChatSettingsPanel({
  locale,
  serverUrl,
  savedServerUrl,
  settingsLoading,
  settingsSaving,
  serverDirty,
  onServerUrlChange,
  onServerUrlSave,
}: ChatSettingsPanelProps) {
  const t = useMemo(() => createT(locale ?? "en_US"), [locale]);

  return (
    <SurfacePanel
      style={{ marginTop: 24 }}
      title={
        <Title level={4} style={{ margin: 0, fontSize: 18 }}>
          {t("Connection settings")}
        </Title>
      }
      description={
        <Text type="secondary" style={{ fontSize: 13 }}>
          {t(
            "Native chat uses the same central WordPress license-server URL as the rest of the licensed features."
          )}
        </Text>
      }
      icon={<SettingOutlined />}
    >
      <Collapse
        bordered={false}
        defaultActiveKey={[]}
        items={[
          {
            key: "chat-connection",
            label: t("Edit chat backend connection"),
            children: (
              <Flex vertical gap={16}>
                <div>
                  <Text strong>{t("License server URL")}</Text>
                  <Paragraph type="secondary" style={{ marginTop: 6, marginBottom: 12 }}>
                    {t("This URL points the shell to the central WordPress chat backend.")}
                  </Paragraph>
                  <Input
                    size="large"
                    className={styles.urlInput}
                    value={serverUrl}
                    onChange={(e) => onServerUrlChange(e.target.value)}
                    placeholder={t("https://licenses.example.com")}
                    disabled={settingsLoading || settingsSaving}
                  />
                </div>
                <Flex justify="space-between" align="center" gap={12} wrap>
                  <Text type="secondary">
                    {savedServerUrl
                      ? t("Current backend: {url}", { url: savedServerUrl })
                      : t("No central chat backend URL is configured yet.")}
                  </Text>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={settingsSaving}
                    disabled={settingsLoading || settingsSaving || !serverDirty}
                    onClick={() => void onServerUrlSave()}
                  >
                    {t("Save")}
                  </Button>
                </Flex>
              </Flex>
            ),
          },
        ]}
      />
    </SurfacePanel>
  );
}
