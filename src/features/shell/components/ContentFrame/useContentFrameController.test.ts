import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getShellRoute,
  isSameOrigin,
  useContentFrameController,
} from "./useContentFrameController";

vi.mock("../../context/ShellConfigContext", () => ({
  useShellConfig: () => ({ shellRoutes: [], user: { canManageOptions: true } }),
}));

const mockHandleIframeLoad = vi.fn();
const mockHandleIframeMessage = vi.fn();

let mockPageUrl = "http://localhost/wp-admin/edit.php";
let mockStatus = "ready";

vi.mock("zustand", async (importOriginal) => {
  const orig = await importOriginal<typeof import("zustand")>();
  return {
    ...orig,
    useStore: (_store: unknown, selector: (s: unknown) => unknown) =>
      selector({
        iframeUrl: "http://localhost/wp-admin/edit.php?wp_shell_embed=1",
        get pageUrl() {
          return mockPageUrl;
        },
        get status() {
          return mockStatus;
        },
        handleIframeLoad: mockHandleIframeLoad,
        handleIframeMessage: mockHandleIframeMessage,
      }),
  };
});

// ── getShellRoute unit tests ──────────────────────────────────────────────────

describe("getShellRoute", () => {
  it("returns DashboardPage for /wp-admin/index.php", () => {
    expect(getShellRoute("http://localhost/wp-admin/index.php", [])).not.toBeNull();
  });

  it("returns DashboardPage for /wp-admin/", () => {
    expect(getShellRoute("http://localhost/wp-admin/", [])).not.toBeNull();
  });

  it("returns BrandingSettings for ?page=wp-react-ui-branding", () => {
    expect(
      getShellRoute("http://localhost/wp-admin/?page=wp-react-ui-branding", [], true)
    ).not.toBeNull();
  });

  it("returns null for built-in settings pages without manage_options", () => {
    expect(
      getShellRoute("http://localhost/wp-admin/?page=wp-react-ui-license", [], false)
    ).toBeNull();
    expect(
      getShellRoute("http://localhost/wp-admin/?page=wp-react-ui-branding", [], false)
    ).toBeNull();
  });

  it("returns null for an ordinary admin page URL", () => {
    expect(getShellRoute("http://localhost/wp-admin/edit.php", [])).toBeNull();
  });

  it("returns null for an invalid URL", () => {
    expect(getShellRoute("not-a-url", [])).toBeNull();
  });

  it("returns a lazy component for a registered plugin route", () => {
    const route = { slug: "my-plugin", label: "My Plugin", entrypoint_url: "/my-plugin.js" };
    expect(getShellRoute("http://localhost/wp-admin/?page=my-plugin", [route])).not.toBeNull();
  });
});

// ── isSameOrigin unit tests ──────────────────────────────────────────────────

describe("isSameOrigin", () => {
  it("returns true for a relative URL", () => {
    expect(isSameOrigin("/my-plugin.js")).toBe(true);
  });

  it("returns true for same-origin absolute URL", () => {
    expect(isSameOrigin(`${window.location.origin}/my-plugin.js`)).toBe(true);
  });

  it("returns false for a cross-origin URL", () => {
    expect(isSameOrigin("https://evil.com/malicious.js")).toBe(false);
  });

  it("returns false for a protocol-relative cross-origin URL", () => {
    expect(isSameOrigin("//evil.com/malicious.js")).toBe(false);
  });

  it("returns true for empty string (resolves to current page)", () => {
    expect(isSameOrigin("")).toBe(true);
  });
});

// ── Cross-origin entrypoint blocking ────────────────────────────────────────

describe("cross-origin entrypoint blocking", () => {
  it("returns null for a plugin route with a cross-origin entrypoint_url", () => {
    const route = {
      slug: "evil-plugin",
      label: "Evil",
      entrypoint_url: "https://evil.com/payload.js",
    };
    // getDynamicComponent throws internally; getShellRoute catches and returns null
    const result = getShellRoute("http://localhost/wp-admin/?page=evil-plugin", [route]);
    expect(result).toBeNull();
  });

  it("returns a component for a same-origin entrypoint_url", () => {
    const route = {
      slug: "good-plugin",
      label: "Good",
      entrypoint_url: "/good-plugin.js",
    };
    const result = getShellRoute("http://localhost/wp-admin/?page=good-plugin", [route]);
    expect(result).not.toBeNull();
  });
});

// ── useContentFrameController integration tests ───────────────────────────────

describe("useContentFrameController", () => {
  beforeEach(() => {
    mockPageUrl = "http://localhost/wp-admin/edit.php";
    mockStatus = "ready";
    vi.clearAllMocks();
  });

  it("registers a window message listener on mount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const { unmount } = renderHook(() => useContentFrameController());
    expect(addSpy).toHaveBeenCalledWith("message", expect.any(Function));
    unmount();
  });

  it("removes window message listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useContentFrameController());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("returns ShellPage=null for a non-shell URL", () => {
    mockPageUrl = "http://localhost/wp-admin/edit.php";
    const { result } = renderHook(() => useContentFrameController());
    expect(result.current.ShellPage).toBeNull();
  });

  it("returns a ShellPage component for dashboard URL", () => {
    mockPageUrl = "http://localhost/wp-admin/index.php";
    const { result } = renderHook(() => useContentFrameController());
    expect(result.current.ShellPage).not.toBeNull();
  });

  it("does NOT forward message events to handleIframeMessage when source is not the trusted iframe", () => {
    // iframeRef.current is null in tests (no real iframe mounted), so all postMessage
    // sources are rejected — this verifies the source-pinning guard is active.
    renderHook(() => useContentFrameController());
    window.dispatchEvent(new MessageEvent("message", { data: { type: "test" } }));
    expect(mockHandleIframeMessage).not.toHaveBeenCalled();
  });

  it("returns an iframeRef object", () => {
    const { result } = renderHook(() => useContentFrameController());
    expect(result.current.iframeRef).toBeDefined();
    expect(Object.hasOwn(result.current.iframeRef, "current")).toBe(true);
  });
});
