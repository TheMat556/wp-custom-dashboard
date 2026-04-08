import type { TFunc } from "../types";

export function getGreeting(): "Good morning" | "Good afternoon" | "Good evening" | "Good night" {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 18) return "Good afternoon";
  if (h >= 18 && h < 22) return "Good evening";
  return "Good night";
}

export function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export function relativeTime(unixTs: number, intlLocale: string): string {
  const diffMs = Date.now() - unixTs * 1000;
  const diffMin = Math.round(diffMs / 60000);
  try {
    const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: "auto" });
    if (diffMin < 2) return rtf.format(0, "minute");
    if (diffMin < 60) return rtf.format(-diffMin, "minute");
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return rtf.format(-diffH, "hour");
    const diffD = Math.round(diffH / 24);
    return rtf.format(-diffD, "day");
  } catch {
    if (diffMin < 2) return "just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.round(diffH / 24)}d ago`;
  }
}

export function formatBookingTime(dtStr: string, intlLocale: string, t: TFunc): string {
  try {
    const dt = new Date(dtStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const timeStr = dt.toLocaleTimeString(intlLocale, { hour: "2-digit", minute: "2-digit" });
    if (today.toDateString() === dt.toDateString()) return `${t("Today")}, ${timeStr}`;
    if (tomorrow.toDateString() === dt.toDateString()) return `${t("Tomorrow")}, ${timeStr}`;
    return (
      dt.toLocaleDateString(intlLocale, { weekday: "short", month: "short", day: "numeric" }) +
      `, ${timeStr}`
    );
  } catch {
    return dtStr;
  }
}
