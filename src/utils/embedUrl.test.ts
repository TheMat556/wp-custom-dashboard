/**
 * Tests for src/utils/embedUrl.ts
 *
 * jsdom URL: "http://localhost/wp-admin/admin.php" (set in vitest.config.ts)
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  fromEmbedUrl,
  isAdminUrl,
  isBreakoutUrl,
  isShellRouteUrl,
  normalizeToMenuKey,
  toEmbedUrl,
} from "./embedUrl";

function setAdminLocation(url: string) {
  history.replaceState({}, "", url);
}

describe("isAdminUrl", () => {
  beforeEach(() => {
    setAdminLocation("http://localhost/wp-admin/admin.php");
  });

  it("accepts same-origin wp-admin URLs", () => {
    expect(isAdminUrl("http://localhost/wp-admin/plugins.php")).toBe(true);
    expect(isAdminUrl("http://localhost/wp-admin/admin.php?page=my-plugin")).toBe(true);
  });

  it("accepts same-origin wp-admin URLs on subdirectory installs", () => {
    setAdminLocation("http://localhost/subsite/wp-admin/admin.php");
    expect(isAdminUrl("plugins.php")).toBe(true);
    expect(isAdminUrl("http://localhost/subsite/wp-admin/admin.php?page=my-plugin")).toBe(true);
    expect(isAdminUrl("http://localhost/wp-admin/plugins.php")).toBe(false);
  });

  it("rejects frontend URLs", () => {
    expect(isAdminUrl("http://localhost/about/")).toBe(false);
  });

  it("rejects cross-origin URLs", () => {
    expect(isAdminUrl("https://evil.com/wp-admin/admin.php")).toBe(false);
  });

  it("rejects empty string and javascript: URIs", () => {
    expect(isAdminUrl("")).toBe(false);
    expect(isAdminUrl("javascript:void(0)")).toBe(false);
  });
});

describe("toEmbedUrl", () => {
  beforeEach(() => {
    setAdminLocation("http://localhost/wp-admin/admin.php");
  });

  it("adds wp_shell_embed=1 to an admin URL", () => {
    const result = toEmbedUrl("http://localhost/wp-admin/plugins.php");
    expect(new URL(result).searchParams.get("wp_shell_embed")).toBe("1");
  });

  it("preserves existing query params", () => {
    const result = toEmbedUrl("http://localhost/wp-admin/admin.php?page=my-plugin");
    const u = new URL(result);
    expect(u.searchParams.get("page")).toBe("my-plugin");
    expect(u.searchParams.get("wp_shell_embed")).toBe("1");
  });

  it("does not duplicate the embed param if called twice", () => {
    const once = toEmbedUrl("http://localhost/wp-admin/admin.php?page=x");
    const twice = toEmbedUrl(once);
    expect(twice).toBe(once);
  });

  it("resolves relative paths against the current origin and adds embed param", () => {
    // jsdom resolves relative strings against window.location.origin, so "not-a-url"
    // becomes "http://localhost/not-a-url" and gets the embed param added.
    const result = toEmbedUrl("not-a-url");
    expect(new URL(result).searchParams.get("wp_shell_embed")).toBe("1");
  });

  it("resolves relative admin paths against the current admin document", () => {
    setAdminLocation("http://localhost/subsite/wp-admin/admin.php?page=dashboard");
    const result = toEmbedUrl("plugins.php");

    expect(result).toBe("http://localhost/subsite/wp-admin/plugins.php?wp_shell_embed=1");
  });
});

describe("fromEmbedUrl", () => {
  it("removes the embed param", () => {
    const embed = "http://localhost/wp-admin/plugins.php?wp_shell_embed=1";
    const clean = fromEmbedUrl(embed);
    expect(new URL(clean).searchParams.has("wp_shell_embed")).toBe(false);
  });

  it("canonicalizes the wp-admin root to index.php", () => {
    expect(fromEmbedUrl("http://localhost/wp-admin/?wp_shell_embed=1")).toBe(
      "http://localhost/wp-admin/index.php"
    );
  });

  it("is a no-op when embed param is absent", () => {
    const url = "http://localhost/wp-admin/plugins.php?paged=2";
    expect(fromEmbedUrl(url)).toBe(url);
  });

  it("round-trips correctly: fromEmbedUrl(toEmbedUrl(x)) === x", () => {
    const original = "http://localhost/wp-admin/admin.php?page=my-plugin";
    expect(fromEmbedUrl(toEmbedUrl(original))).toBe(original);
  });
});

describe("normalizeToMenuKey", () => {
  it("returns the ?page= param as the key", () => {
    expect(normalizeToMenuKey("http://localhost/wp-admin/admin.php?page=woocommerce")).toBe(
      "woocommerce"
    );
  });

  it("returns the PHP filename for direct file URLs", () => {
    expect(normalizeToMenuKey("http://localhost/wp-admin/plugins.php")).toBe("plugins.php");
    expect(normalizeToMenuKey("http://localhost/wp-admin/users.php")).toBe("users.php");
  });

  it("treats the wp-admin root as index.php", () => {
    expect(normalizeToMenuKey("http://localhost/wp-admin/")).toBe("index.php");
  });

  it("strips the embed param before extracting the key", () => {
    const embed = "http://localhost/wp-admin/admin.php?page=my-plugin&wp_shell_embed=1";
    expect(normalizeToMenuKey(embed)).toBe("my-plugin");
  });

  it("resolves relative paths and returns the last path segment", () => {
    // jsdom resolves "not-a-url" to "http://localhost/not-a-url"; the last
    // segment is "not-a-url" itself.
    expect(normalizeToMenuKey("not-a-url")).toBe("not-a-url");
  });
});

describe("isBreakoutUrl", () => {
  beforeEach(() => {
    setAdminLocation("http://localhost/wp-admin/admin.php");
  });

  it("flags post.php as a breakout URL", () => {
    expect(isBreakoutUrl("http://localhost/wp-admin/post.php?post=1&action=edit")).toBe(true);
  });

  it("flags post-new.php as a breakout URL", () => {
    expect(isBreakoutUrl("http://localhost/wp-admin/post-new.php")).toBe(true);
  });

  it("flags customize.php as a breakout URL", () => {
    expect(isBreakoutUrl("http://localhost/wp-admin/customize.php")).toBe(true);
  });

  it("does not flag plugins.php as a breakout URL", () => {
    expect(isBreakoutUrl("http://localhost/wp-admin/plugins.php")).toBe(false);
  });

  it("does not flag admin.php?page=my-plugin as a breakout URL", () => {
    expect(isBreakoutUrl("http://localhost/wp-admin/admin.php?page=my-plugin")).toBe(false);
  });

  it("uses an explicitly provided breakout list", () => {
    expect(
      isBreakoutUrl("http://localhost/wp-admin/custom-editor.php", ["custom-editor.php"])
    ).toBe(true);
    expect(isBreakoutUrl("http://localhost/wp-admin/post.php", ["custom-editor.php"])).toBe(false);
  });

  it("resolves breakout URLs correctly on subdirectory installs", () => {
    setAdminLocation("http://localhost/subsite/wp-admin/admin.php");
    expect(isBreakoutUrl("post.php?post=1&action=edit")).toBe(true);
  });
});

describe("isShellRouteUrl", () => {
  it("flags plugin shell routes by their page slug", () => {
    expect(
      isShellRouteUrl("http://localhost/wp-admin/admin.php?page=my-plugin&wp_shell_embed=1", [
        "my-plugin",
      ])
    ).toBe(true);
  });

  it("does not flag unrelated admin pages", () => {
    expect(
      isShellRouteUrl("http://localhost/wp-admin/plugins.php?wp_shell_embed=1", ["my-plugin"])
    ).toBe(false);
  });
});
