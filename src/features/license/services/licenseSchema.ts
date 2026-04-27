import { z } from "zod";
import type { LicenseResponse, LicenseSettingsResponse } from "../../../generated/contracts/dto";

export const LicenseResponseSchema = z.object({
  status: z.enum(["active", "expired", "grace", "disabled"]),
  role: z.string().nullable(),
  tier: z.string().nullable(),
  expiresAt: z.string().nullable(),
  features: z.array(z.string()),
  graceDaysRemaining: z.number(),
  hasKey: z.boolean(),
  keyPrefix: z.string().nullable(),
  serverConfigured: z.boolean(),
});

// Compile-time structural compatibility check
type _LicenseResponseCheck =
  z.infer<typeof LicenseResponseSchema> extends LicenseResponse ? true : never;
const _licenseCheck: _LicenseResponseCheck = true;
void _licenseCheck;

export const LicenseSettingsResponseSchema = z.object({
  serverUrl: z.string().nullable(),
  serverConfigured: z.boolean(),
  storedLicenseKey: z.string().nullable(),
});

type _LicenseSettingsCheck =
  z.infer<typeof LicenseSettingsResponseSchema> extends LicenseSettingsResponse ? true : never;
const _licenseSettingsCheck: _LicenseSettingsCheck = true;
void _licenseSettingsCheck;
