// ── License key helpers ──────────────────────────────────────────────────────

export function normalizeLicenseKey(value: string): string {
  return value.replace(/[^a-f0-9]/gi, "").toLowerCase();
}

export const MAX_VISIBLE_LICENSE_KEY_CHARS = 8;

export function getVisibleLicenseKeyCount(
  value: string,
  preferredCount = MAX_VISIBLE_LICENSE_KEY_CHARS
): number {
  return Math.min(preferredCount, normalizeLicenseKey(value).length);
}

export function maskLicenseKey(
  value: string,
  visibleCount = MAX_VISIBLE_LICENSE_KEY_CHARS
): string {
  const normalized = normalizeLicenseKey(value);
  if (normalized.length === 0) return "";
  const safeVisibleCount = getVisibleLicenseKeyCount(normalized, visibleCount);
  const hiddenCount = Math.max(0, normalized.length - safeVisibleCount);
  return `${"•".repeat(hiddenCount)}${normalized.slice(-safeVisibleCount)}`;
}
