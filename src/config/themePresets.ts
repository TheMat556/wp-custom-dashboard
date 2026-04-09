export interface ThemePreset {
  label: string;
  primaryColor: string;
  description: string;
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  default: {
    label: "Default",
    primaryColor: "", // Uses branding primary color
    description: "Uses your site's branding color",
  },
  ocean: {
    label: "Ocean",
    primaryColor: "#0284c7",
    description: "Cool blue tones",
  },
  forest: {
    label: "Forest",
    primaryColor: "#16a34a",
    description: "Natural green tones",
  },
  sunset: {
    label: "Sunset",
    primaryColor: "#ea580c",
    description: "Warm orange tones",
  },
  monochrome: {
    label: "Monochrome",
    primaryColor: "#6b7280",
    description: "Neutral gray tones",
  },
};

export const CUSTOM_PRESET_KEY = "custom";
