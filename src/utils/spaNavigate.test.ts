/**
 * Tests for spaNavigate.ts
 *
 * PREREQUISITE: isAdminUrl and isSpaEligibleUrl must be exported from spaNavigate.ts:
 *   export function isAdminUrl(...) { ... }
 *   export function isSpaEligibleUrl(...) { ... }
 *
 * The jsdom environment is set globally in vitest.config.ts with:
 *   url: "http://localhost/wp-admin/admin.php"
 * This ensures window.location.origin === "http://localhost" which
 * isAdminUrl() uses for same-origin checks.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isAdminUrl, isSpaEligibleUrl, spaNavigate } from "./spaNavigate";

// ── isAdminUrl ────────────────────────────────────────────────────────────────

describe("isAdminUrl", () => {
  it("accepts a standard wp-admin URL", () => {
    expect(isAdminUrl("http://localhost/wp-admin/admin.php?page=my-plugin")).toBe(true);
  });

  it("accepts a wp-admin URL without query string", () => {
    expect(isAdminUrl("http://localhost/wp-admin/index.php")).toBe(true);
  });

  it("rejects a frontend URL", () => {
    expect(isAdminUrl("http://localhost/about/")).toBe(false);
  });

  it("rejects a cross-origin URL", () => {
    expect(isAdminUrl("https://evil.com/wp-admin/admin.php?page=x")).toBe(false);
  });

  it("rejects an empty string without throwing", () => {
    expect(isAdminUrl("")).toBe(false);
  });

  it("rejects a javascript: URI without throwing", () => {
    expect(isAdminUrl("javascript:void(0)")).toBe(false);
  });
});

// ── isSpaEligibleUrl ──────────────────────────────────────────────────────────

describe("isSpaEligibleUrl", () => {
  it("accepts a standard plugin page via admin.php", () => {
    expect(isSpaEligibleUrl("http://localhost/wp-admin/admin.php?page=my-plugin")).toBe(true);
  });

  it("rejects site-health (unsafe page param)", () => {
    expect(isSpaEligibleUrl("http://localhost/wp-admin/admin.php?page=site-health")).toBe(false);
  });

  it("rejects the branding settings page (unsafe page param)", () => {
    expect(isSpaEligibleUrl("http://localhost/wp-admin/admin.php?page=wp-react-ui-branding")).toBe(
      false
    );
  });

  it("rejects h-bricks-elements (unsafe page param)", () => {
    expect(isSpaEligibleUrl("http://localhost/wp-admin/admin.php?page=h-bricks-elements")).toBe(
      false
    );
  });

  it("rejects index.php (not admin.php)", () => {
    expect(isSpaEligibleUrl("http://localhost/wp-admin/index.php")).toBe(false);
  });

  it("rejects edit.php (not admin.php)", () => {
    expect(isSpaEligibleUrl("http://localhost/wp-admin/edit.php")).toBe(false);
  });

  it("rejects admin.php without a ?page param", () => {
    expect(isSpaEligibleUrl("http://localhost/wp-admin/admin.php")).toBe(false);
  });

  it("rejects a frontend URL", () => {
    expect(isSpaEligibleUrl("http://localhost/about/")).toBe(false);
  });

  it("rejects a cross-origin URL", () => {
    expect(isSpaEligibleUrl("https://evil.com/wp-admin/admin.php?page=x")).toBe(false);
  });

  it("rejects an empty string without throwing", () => {
    expect(isSpaEligibleUrl("")).toBe(false);
  });
});

// ── spaNavigate ───────────────────────────────────────────────────────────────

describe("spaNavigate", () => {
  const PLUGIN_URL = "http://localhost/wp-admin/admin.php?page=my-plugin";
  const NON_SPA_URL = "http://localhost/wp-admin/index.php";

  beforeEach(() => {
    // location.assign is not writable in jsdom by default — delete + redefine
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: {
        ...window.location,
        assign: vi.fn(),
        href: "http://localhost/wp-admin/admin.php",
        origin: "http://localhost",
      },
    });

    document.body.innerHTML = `
      <div id="wpcontent"><p>old content</p></div>
      <div id="wpfooter"><p>old footer</p></div>
      <div id="react-sidebar-root"></div>
      <div id="react-navbar-root"></div>
    `;

    // Disable View Transition API so tests run the synchronous doSwap() path
    (document as DocumentWithViewTransition).startViewTransition = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to location.assign for non-SPA eligible URLs", async () => {
    const result = await spaNavigate(NON_SPA_URL);
    expect(result).toBe(false);
    expect(window.location.assign).toHaveBeenCalledWith(NON_SPA_URL);
  });

  it("falls back to location.assign when fetch returns non-200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        headers: { get: () => "text/html" },
      })
    );
    const result = await spaNavigate(PLUGIN_URL);
    expect(result).toBe(false);
    expect(window.location.assign).toHaveBeenCalledWith(PLUGIN_URL);
  });

  it("falls back when fetch returns non-HTML content-type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => "application/json" },
        text: async () => "{}",
      })
    );
    const result = await spaNavigate(PLUGIN_URL);
    expect(result).toBe(false);
  });

  it("falls back when fetch throws a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const result = await spaNavigate(PLUGIN_URL);
    expect(result).toBe(false);
    expect(window.location.assign).toHaveBeenCalledWith(PLUGIN_URL);
  });

  it("swaps #wpcontent and returns true on a successful fetch", async () => {
    const newHtml = `
      <html><head><title>New Page</title></head>
      <body>
        <div id="wpcontent"><p>new content</p></div>
        <div id="wpfooter"><p>new footer</p></div>
      </body></html>
    `;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => "text/html" },
        text: async () => newHtml,
      })
    );

    const result = await spaNavigate(PLUGIN_URL);
    expect(result).toBe(true);
    expect(document.getElementById("wpcontent")?.innerHTML).toContain("new content");
    expect(document.getElementById("wpfooter")?.innerHTML).toContain("new footer");
    expect(document.title).toBe("New Page");
  });

  it("dispatches the wp-spa-navigate custom event on success", async () => {
    const newHtml = `
      <html><body>
        <div id="wpcontent"><p>x</p></div>
      </body></html>
    `;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => "text/html" },
        text: async () => newHtml,
      })
    );

    const listener = vi.fn();
    window.addEventListener("wp-spa-navigate", listener);

    await spaNavigate(PLUGIN_URL);

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail.url).toBe(PLUGIN_URL);

    window.removeEventListener("wp-spa-navigate", listener);
  });
});
