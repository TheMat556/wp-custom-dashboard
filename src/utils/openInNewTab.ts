import { isAdminUrl } from "./embedUrl";

export function normalizeOpenInNewTabPatterns(patterns: string[] | undefined): string[] {
  if (!Array.isArray(patterns)) {
    return [];
  }

  return Array.from(
    new Set(
      patterns
        .map((pattern) => pattern.trim().toLowerCase())
        .filter((pattern) => pattern.length > 0)
    )
  );
}

export function matchesOpenInNewTabPattern(url: string, patterns: string[] | undefined): boolean {
  if (!url) {
    return false;
  }

  const normalizedUrl = url.toLowerCase();
  return normalizeOpenInNewTabPatterns(patterns).some((pattern) => normalizedUrl.includes(pattern));
}

export function shouldOpenOutsideAdminInNewTab(url: string): boolean {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return false;
  }

  const normalizedUrl = trimmedUrl.toLowerCase();
  if (
    normalizedUrl.startsWith("#") ||
    normalizedUrl.startsWith("javascript:") ||
    normalizedUrl.startsWith("mailto:") ||
    normalizedUrl.startsWith("tel:")
  ) {
    return false;
  }

  try {
    const parsed = new URL(trimmedUrl, window.location.href);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    return !isAdminUrl(parsed.toString());
  } catch {
    return false;
  }
}
