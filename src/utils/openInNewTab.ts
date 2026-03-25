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
