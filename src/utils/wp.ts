/**
 * Shared WordPress admin helpers.
 * Used across Navbar, Sidebar, and breadcrumbs.
 */

import "../types/wp";
import { spaNavigate } from "./spaNavigate";

export function getWpConfig() {
  return window.wpReactUi ?? {};
}

export function getAdminBaseUrl(): string {
  const adminUrl = getWpConfig().adminUrl ?? "/wp-admin/";
  return adminUrl.replace(/\/$/, "");
}

export function getActiveKey(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const page = new URLSearchParams(window.location.search).get("page");
  if (page) return page;
  return window.location.pathname.split("/").filter(Boolean).pop();
}

export function buildAdminUrl(slug: string): string {
  const base = getAdminBaseUrl();
  const normalizedSlug = slug.replace(/^\/+/, "");
  return normalizedSlug.includes("?") || normalizedSlug.includes(".php")
    ? `${base}/${normalizedSlug}`
    : `${base}/admin.php?page=${normalizedSlug}`;
}

function requiresHardNavigation(url: string, slug?: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    const raw = `${parsed.pathname}${parsed.search} ${slug ?? ""}`;
    return (
      raw.includes("/upload.php") ||
      raw.includes("upload.php") ||
      raw.includes("/media-upload.php") ||
      raw.includes("media-upload.php") ||
      raw.includes("/media-new.php") ||
      raw.includes("media-new.php") ||
      raw.includes("page=upload.php") ||
      raw.includes("page=media-upload.php") ||
      raw.includes("page=media-new.php")
    );
  } catch {
    return false;
  }
}

export function navigate(slug: string): void {
  const target = buildAdminUrl(slug);
  if (requiresHardNavigation(target, slug)) {
    window.location.assign(target);
    return;
  }

  spaNavigate(target);
}

export function navigateHome(): void {
  spaNavigate(`${getAdminBaseUrl()}/index.php`);
}

export function getWpUser() {
  return window.wpReactUi?.user ?? { name: "Admin", role: "administrator" };
}
