import { Button, Flex, Grid, Spin, Switch, Typography, theme } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { CUSTOM_PRESET_KEY, THEME_PRESETS } from "../../../../config/themePresets";
import PageCanvas from "../../../../shared/ui/PageCanvas";
import { FONT_PRESETS, type FontPresetKey } from "../../../../utils/fontPresets";
import { createT } from "../../../../utils/i18n";
import { useShellConfig } from "../../../shell/context/ShellConfigContext";
import { shellPreferencesStore } from "../../../shell/store/shellPreferencesStore";
import {
  applyBrandingSettingsToDraft,
  type BrandingDraft,
  buildBrandingSaveInput,
  createEmptyBrandingDraft,
  DEFAULT_PRIMARY_COLOR,
  isBrandingDraftDirty,
} from "../../brandingDraft";
import { loadBranding, saveBranding } from "../../store/brandingActions";
import { brandingStore } from "../../store/brandingStore";
import { BrandAssetsSection } from "./BrandAssetsSection";
import { ColorSettingsSection } from "./ColorSettingsSection";
import { LinkRulesSection } from "./LinkRulesSection";
import { TypographySection } from "./TypographySection";

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

function getThemePreferenceSnapshot() {
  return {
    themePreset: shellPreferencesStore.getState().themePreset ?? "default",
    customPresetColor: shellPreferencesStore.getState().customPresetColor ?? DEFAULT_PRIMARY_COLOR,
  };
}

export default function BrandingSettings() {
  const config = useShellConfig();
  const settings = useStore(brandingStore, (state) => state.settings);
  const loading = useStore(brandingStore, (state) => state.loading);
  const saving = useStore(brandingStore, (state) => state.saving);
  const highContrast = useStore(shellPreferencesStore, (state) => state.highContrast);
  const [draft, setDraft] = useState(() => createEmptyBrandingDraft(getThemePreferenceSnapshot()));
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const t = useMemo(() => createT(config.locale ?? "en_US"), [config.locale]);
  const themePresetOptions = useMemo(
    () => [
      ...Object.entries(THEME_PRESETS).map(([key, preset]) => ({
        value: key,
        label: t(preset.label),
      })),
      { value: CUSTOM_PRESET_KEY, label: t("Custom") },
    ],
    [t]
  );
  const fontPresetOptions = useMemo(
    () =>
      Object.entries(FONT_PRESETS).map(([value, preset]) => ({
        value,
        label: t(preset.label),
      })),
    [t]
  );

  useEffect(() => {
    void loadBranding();
  }, []);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setDraft((current) => applyBrandingSettingsToDraft(current, settings));
  }, [settings]);

  const updateDraft = useCallback((updates: Partial<BrandingDraft>) => {
    setDraft((current) => ({ ...current, ...updates }));
  }, []);

  const toggleHighContrast = useCallback(() => {
    const next = !highContrast;
    shellPreferencesStore.getState().setHighContrast(next);
    const root = document.getElementById("react-shell-root");

    if (root) {
      root.classList.toggle("wp-react-ui-high-contrast", next);
      document.body.classList.toggle("wp-react-ui-high-contrast", next);
    }
  }, [highContrast]);

  const isDirty = useMemo(
    () => isBrandingDraftDirty(settings, draft, getThemePreferenceSnapshot()),
    [draft, settings]
  );

  const handleSave = useCallback(async () => {
    await saveBranding(buildBrandingSaveInput(draft));
    shellPreferencesStore.getState().setThemePreset(draft.themePreset, draft.customPresetColor);
  }, [draft]);

  if (loading && !settings) {
    return (
      <PageCanvas centered aria-busy="true">
        <Spin size="large" />
      </PageCanvas>
    );
  }

  return (
    <PageCanvas>
      <div className="wp-react-ui-page-intro">
        <Flex
          className="wp-react-ui-page-intro__header"
          justify="space-between"
          align="flex-start"
          gap={24}
          wrap
        >
          <div className="wp-react-ui-page-intro__copy" style={{ minWidth: 0 }}>
            <Title
              level={2}
              className="wp-react-ui-page-intro__title"
              style={{ marginBottom: 6, fontSize: screens.md ? 30 : 24 }}
            >
              {t("Brand Assets")}
            </Title>
            <Paragraph
              type="secondary"
              className="wp-react-ui-page-intro__description"
              style={{ marginBottom: 0, maxWidth: 760, fontSize: 14 }}
            >
              {t(
                "Centralized management for identity logos, color accents, and global navigation fragments used across the shell."
              )}
            </Paragraph>
          </div>

          <Flex className="wp-react-ui-page-intro__actions" gap={12} wrap align="center">
            <div className="wp-react-ui-inline-control">
              <Text style={{ fontSize: 12, fontWeight: 700, color: token.colorTextSecondary }}>
                {t("Logo-only sidebar")}
              </Text>
              <Switch
                checked={draft.useLongLogo}
                onChange={(useLongLogo) => updateDraft({ useLongLogo })}
                checkedChildren={t("On")}
                unCheckedChildren={t("Off")}
              />
            </div>
            <Button
              type="primary"
              loading={saving}
              onClick={() => void handleSave()}
              disabled={!isDirty}
            >
              {t("Save Brand Assets")}
            </Button>
          </Flex>
        </Flex>
      </div>

      <BrandAssetsSection
        t={t}
        isLg={!!screens.lg}
        lightLogoId={draft.lightLogoId}
        lightLogoUrl={draft.lightLogoUrl}
        darkLogoId={draft.darkLogoId}
        darkLogoUrl={draft.darkLogoUrl}
        onLightLogoSelect={(id, url) => updateDraft({ lightLogoId: id, lightLogoUrl: url })}
        onLightLogoRemove={() => updateDraft({ lightLogoId: 0, lightLogoUrl: null })}
        onDarkLogoSelect={(id, url) => updateDraft({ darkLogoId: id, darkLogoUrl: url })}
        onDarkLogoRemove={() => updateDraft({ darkLogoId: 0, darkLogoUrl: null })}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: screens.lg ? "repeat(2, minmax(0, 1fr))" : "1fr",
          gap: 24,
          alignItems: "stretch",
          marginTop: 24,
        }}
      >
        <ColorSettingsSection
          t={t}
          themePresetOptions={themePresetOptions}
          draftThemePreset={draft.themePreset}
          draftCustomColor={draft.customPresetColor}
          highContrast={highContrast}
          onThemePresetChange={(themePreset) => updateDraft({ themePreset })}
          onCustomColorChange={(customPresetColor) => updateDraft({ customPresetColor })}
          onToggleHighContrast={toggleHighContrast}
          onReset={() =>
            updateDraft({
              themePreset: "default",
              customPresetColor: DEFAULT_PRIMARY_COLOR,
            })
          }
        />

        <LinkRulesSection
          t={t}
          patterns={draft.patterns}
          onPatternsChange={(patterns) => updateDraft({ patterns })}
        />
      </div>

      <div style={{ marginTop: 24 }}>
        <TypographySection
          t={t}
          fontPreset={draft.fontPreset}
          fontPresetOptions={fontPresetOptions}
          isXl={!!screens.xl}
          isMd={!!screens.md}
          isLg={!!screens.lg}
          onFontPresetChange={(fontPreset: FontPresetKey) => updateDraft({ fontPreset })}
        />
      </div>

      <Flex
        justify="space-between"
        align="center"
        gap={16}
        wrap
        style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t("Changes are applied live after saving.")}
        </Text>

        <Flex gap={12} wrap />
      </Flex>
    </PageCanvas>
  );
}
