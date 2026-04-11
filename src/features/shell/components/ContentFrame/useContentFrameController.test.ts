import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getShellRoute, useContentFrameController } from "./useContentFrameController";

vi.mock("../../context/ShellConfigContext", () => ({
  useShellConfig: () => ({ shellRoutes: [] }),
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
      getShellRoute("http://localhost/wp-admin/?page=wp-react-ui-branding", [])
    ).not.toBeNull();
  });

  it("returns null for an ordinary admin page URL", () => {
    expect(getShellRoute("http://localhost/wp-admin/edit.php", [])).toBeNull();
  });

  it("returns null for an invalid URL", () => {
    expect(getShellRoute("not-a-url", [])).toBeNull();
  });

  it("returns a lazy component for a registered plugin route", () => {
    const route = { slug: "my-plugin", label: "My Plugin", entrypoint_url: "/my-plugin.js" };
    expect(
      getShellRoute("http://localhost/wp-admin/?page=my-plugin", [route])
    ).not.toBeNull();
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

  it("forwards message events to handleIframeMessage", () => {
    renderHook(() => useContentFrameController());
    window.dispatchEvent(new MessageEvent("message", { data: { type: "test" } }));
    expect(mockHandleIframeMessage).toHaveBeenCalled();
  });

  it("returns an iframeRef object", () => {
    const { result } = renderHook(() => useContentFrameController());
    expect(result.current.iframeRef).toBeDefined();
    expect(Object.hasOwn(result.current.iframeRef, "current")).toBe(true);
  });
});
