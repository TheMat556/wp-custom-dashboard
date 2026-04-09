import { CUSTOM_PRESET_KEY } from "../../config/themePresets";
import { DEFAULT_FONT_PRESET, type FontPresetKey, isFontPresetKey } from "../../utils/fontPresets";
import type { BrandingData, BrandingSaveInput } from "./services/brandingApi";

export const DEFAULT_PRIMARY_COLOR = "#4f46e5";

export interface BrandingThemeSnapshot {
  themePreset: string;
  customPresetColor: string;
}

export interface BrandingDraft {
  lightLogoId: number;
  lightLogoUrl: string | null;
  darkLogoId: number;
  darkLogoUrl: string | null;
  longLogoId: number;
  longLogoUrl: string | null;
  useLongLogo: boolean;
  primaryColor: string;
  fontPreset: FontPresetKey;
  patterns: string;
  themePreset: string;
  customPresetColor: string;
}

export function createEmptyBrandingDraft(theme: BrandingThemeSnapshot): BrandingDraft {
  return {
    lightLogoId: 0,
    lightLogoUrl: null,
    darkLogoId: 0,
    darkLogoUrl: null,
    longLogoId: 0,
    longLogoUrl: null,
    useLongLogo: false,
    primaryColor: DEFAULT_PRIMARY_COLOR,
    fontPreset: DEFAULT_FONT_PRESET,
    patterns: "",
    themePreset: theme.themePreset,
    customPresetColor: theme.customPresetColor,
  };
}

export function applyBrandingSettingsToDraft(
  current: BrandingDraft,
  settings: BrandingData
): BrandingDraft {
  return {
    ...current,
    lightLogoId: settings.lightLogoId,
    lightLogoUrl: settings.lightLogoUrl,
    darkLogoId: settings.darkLogoId,
    darkLogoUrl: settings.darkLogoUrl,
    longLogoId: settings.longLogoId,
    longLogoUrl: settings.longLogoUrl,
    useLongLogo: settings.useLongLogo,
    primaryColor: settings.primaryColor,
    fontPreset: isFontPresetKey(settings.fontPreset) ? settings.fontPreset : DEFAULT_FONT_PRESET,
    patterns: settings.openInNewTabPatterns.join("\n"),
  };
}

export function buildBrandingSaveInput(draft: BrandingDraft): BrandingSaveInput {
  return {
    lightLogoId: draft.lightLogoId,
    darkLogoId: draft.darkLogoId,
    longLogoId: draft.longLogoId,
    useLongLogo: draft.useLongLogo,
    primaryColor: draft.primaryColor,
    fontPreset: draft.fontPreset,
    openInNewTabPatterns: draft.patterns
      .split("\n")
      .map((pattern) => pattern.trim())
      .filter(Boolean),
  };
}

export function isBrandingDraftDirty(
  settings: BrandingData | null,
  draft: BrandingDraft,
  savedTheme: BrandingThemeSnapshot
): boolean {
  if (!settings) {
    return false;
  }

  return (
    draft.lightLogoId !== settings.lightLogoId ||
    draft.darkLogoId !== settings.darkLogoId ||
    draft.longLogoId !== settings.longLogoId ||
    draft.useLongLogo !== settings.useLongLogo ||
    draft.primaryColor !== settings.primaryColor ||
    draft.fontPreset !== settings.fontPreset ||
    draft.patterns !== settings.openInNewTabPatterns.join("\n") ||
    draft.themePreset !== savedTheme.themePreset ||
    (draft.themePreset === CUSTOM_PRESET_KEY &&
      draft.customPresetColor !== savedTheme.customPresetColor)
  );
}
