/** Derives initials (≤ 2 chars) from a name or domain string. */
export function getInitials(value: string | null | undefined, fallback = "?"): string {
  if (!value) return fallback;
  const parts = value
    .split(/[\s.-]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return fallback;
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Returns a stable HSL background color seeded from a domain string. */
export function hashDomainColor(domain: string): string {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash << 5) - hash + domain.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 58%, 42%)`;
}

/** Returns a human-friendly role label. */
export function getRoleLabel(role: string | null): string {
  if (role === "owner") return "Owner";
  if (role === "customer") return "Customer";
  return "Unassigned";
}

/** Formats an ISO date string as a relative time label (e.g. "5m", "3h", "Yesterday"). */
export function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}

/** Formats an ISO date string as a full locale-aware date + time string. */
export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
