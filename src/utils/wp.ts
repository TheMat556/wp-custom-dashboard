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

export function navigate(slug: string): void {
  spaNavigate(buildAdminUrl(slug));
}

export function navigateHome(): void {
  spaNavigate(`${getAdminBaseUrl()}/index.php`);
}

export function getWpUser() {
  return window.wpReactUi?.user ?? { name: "Admin", role: "administrator" };
}
