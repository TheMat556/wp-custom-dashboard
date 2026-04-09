export const FONT_PRESETS = {
  inter: {
    label: "Inter",
    family: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  system: {
    label: "System UI",
    family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  grotesk: {
    label: "Helvetica",
    family: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  serif: {
    label: "Georgia",
    family: 'Georgia, Cambria, "Times New Roman", serif',
  },
} as const;

export type FontPresetKey = keyof typeof FONT_PRESETS;

export const DEFAULT_FONT_PRESET: FontPresetKey = "inter";

export function isFontPresetKey(value: string): value is FontPresetKey {
  return value in FONT_PRESETS;
}

export function getFontFamilyForPreset(value: string | undefined): string {
  if (value && isFontPresetKey(value)) {
    return FONT_PRESETS[value].family;
  }

  return FONT_PRESETS[DEFAULT_FONT_PRESET].family;
}
