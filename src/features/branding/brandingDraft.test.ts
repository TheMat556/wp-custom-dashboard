import { describe, expect, it } from "vitest";
import {
  applyBrandingSettingsToDraft,
  buildBrandingSaveInput,
  createEmptyBrandingDraft,
  DEFAULT_PRIMARY_COLOR,
  isBrandingDraftDirty,
} from "./brandingDraft";
import type { BrandingData } from "./services/brandingApi";

describe("brandingDraft", () => {
  it("preserves theme preferences when applying fetched branding settings", () => {
    const initial = createEmptyBrandingDraft({
      themePreset: "ocean",
      customPresetColor: "#112233",
    });

    const next = applyBrandingSettingsToDraft(initial, {
      lightLogoId: 1,
      lightLogoUrl: "https://example.com/light.svg",
      darkLogoId: 2,
      darkLogoUrl: "https://example.com/dark.svg",
      longLogoId: 3,
      longLogoUrl: "https://example.com/long.svg",
      useLongLogo: true,
      primaryColor: "#123456",
      fontPreset: "unknown-font",
      openInNewTabPatterns: ["plugins.php"],
    });

    expect(next.themePreset).toBe("ocean");
    expect(next.customPresetColor).toBe("#112233");
    expect(next.fontPreset).toBe("inter");
    expect(next.patterns).toBe("plugins.php");
  });

  it("builds the save payload with trimmed link patterns", () => {
    const draft = createEmptyBrandingDraft({
      themePreset: "default",
      customPresetColor: "",
    });

    draft.lightLogoId = 5;
    draft.darkLogoId = 7;
    draft.longLogoId = 9;
    draft.useLongLogo = true;
    draft.primaryColor = "#abcdef";
    draft.fontPreset = "serif";
    draft.patterns = "  builder=bricks  \n\n edit_with_bricks \n";

    expect(buildBrandingSaveInput(draft)).toEqual({
      lightLogoId: 5,
      darkLogoId: 7,
      longLogoId: 9,
      useLongLogo: true,
      primaryColor: "#abcdef",
      fontPreset: "serif",
      openInNewTabPatterns: ["builder=bricks", "edit_with_bricks"],
    });
  });

  it("tracks branding and shell theme dirty state without forcing custom color defaults", () => {
    const draft = createEmptyBrandingDraft({
      themePreset: "default",
      customPresetColor: "",
    });

    const settings: BrandingData = {
      lightLogoId: 0,
      lightLogoUrl: null,
      darkLogoId: 0,
      darkLogoUrl: null,
      longLogoId: 0,
      longLogoUrl: null,
      useLongLogo: false,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      fontPreset: "inter",
      openInNewTabPatterns: [],
    };

    expect(
      isBrandingDraftDirty(settings, draft, {
        themePreset: "default",
        customPresetColor: "",
      })
    ).toBe(false);

    draft.themePreset = "custom";
    draft.customPresetColor = "#445566";

    expect(
      isBrandingDraftDirty(settings, draft, {
        themePreset: "default",
        customPresetColor: "",
      })
    ).toBe(true);
  });
});
