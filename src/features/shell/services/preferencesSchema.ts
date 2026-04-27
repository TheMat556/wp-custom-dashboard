import { z } from "zod";
import type { PersistedShellPreferences } from "../../../types/shellPreferences";

const RecentPageRecordSchema = z.object({
  pageUrl: z.string(),
  title: z.string(),
  visitedAt: z.number(),
});

// All fields are optional — the server persists and returns only what was saved.
export const PartialPreferencesSchema = z.object({
  favorites: z.array(z.string()).optional(),
  recentPages: z.array(RecentPageRecordSchema).optional(),
  density: z.enum(["comfortable", "compact"]).optional(),
  themePreset: z.string().optional(),
  customPresetColor: z.string().optional(),
  dashboardWidgetOrder: z.array(z.string()).optional(),
  hiddenWidgets: z.array(z.string()).optional(),
  highContrast: z.boolean().optional(),
});

export const PreferencesResponseSchema = z.object({
  preferences: PartialPreferencesSchema,
});

// Compile-time structural compatibility check
type _PrefsCheck =
  z.infer<typeof PartialPreferencesSchema> extends Partial<PersistedShellPreferences>
    ? true
    : never;
const _prefsCheck: _PrefsCheck = true;
void _prefsCheck;
