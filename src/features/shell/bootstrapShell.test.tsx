/**
 * Focused tests for bootstrapShell teardown behavior.
 *
 * We test the teardown function returned by bootstrapShell to ensure
 * it properly cleans up stores and unmounts the React root.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { themeStore } from "./store/themeStore";
import { sidebarStore } from "./store/sidebarStore";
import { menuStore } from "../navigation/store/menuStore";

// Mock createRoot to avoid actual React rendering
vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
    unmount: vi.fn(),
  })),
}));

// Lazily import bootstrapShell after mocks are in place
async function getBootstrapShell() {
  const mod = await import("./bootstrapShell");
  return mod.bootstrapShell;
}

const minimalConfig = {
  theme: "light" as const,
  restUrl: "http://localhost/wp-json/wp-react-ui/v1",
  nonce: "test-nonce",
  adminUrl: "http://localhost/wp-admin/",
  siteName: "Test Site",
  assetsUrl: "http://localhost/assets/",
  user: { name: "Admin", role: "administrator" },
  branding: {
    siteName: "Test Site",
    logos: { lightUrl: null, darkUrl: null, longUrl: null, defaultUrl: "/logo.svg" },
    useLongLogo: false,
    primaryColor: "#4f46e5",
    fontPreset: "inter",
  },
  navigation: {
    fullReloadPageParams: [],
    shellDisabledPagenow: [],
    breakoutPagenow: [],
    openInNewTabPatterns: [],
  },
  logoutUrl: "http://localhost/wp-login.php?action=logout",
  logoutNonce: "logout-nonce",
  menu: [],
  publicUrl: "/",
  locale: "en_US",
  shellRoutes: [],
};

describe("bootstrapShell teardown", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  it("teardown resets themeStore to light", async () => {
    const bootstrapShell = await getBootstrapShell();
    const teardown = bootstrapShell(host, minimalConfig);

    // Toggle theme to dark
    themeStore.setState({ theme: "dark" });
    expect(themeStore.getState().theme).toBe("dark");

    teardown();

    expect(themeStore.getState().theme).toBe("light");
  });

  it("teardown resets menuStore items to empty", async () => {
    const bootstrapShell = await getBootstrapShell();
    const teardown = bootstrapShell(host, minimalConfig);

    menuStore.setState({ items: [{ slug: "test", label: "Test" }] });
    expect(menuStore.getState().items).toHaveLength(1);

    teardown();

    expect(menuStore.getState().items).toHaveLength(0);
  });

  it("teardown resets sidebarStore collapsed state", async () => {
    const bootstrapShell = await getBootstrapShell();
    const teardown = bootstrapShell(host, minimalConfig);

    sidebarStore.setState({ collapsed: true });
    expect(sidebarStore.getState().collapsed).toBe(true);

    teardown();

    expect(sidebarStore.getState().collapsed).toBe(false);
  });

  it("teardown unmounts React root", async () => {
    const { createRoot } = await import("react-dom/client");
    const unmountSpy = vi.fn();
    vi.mocked(createRoot).mockReturnValueOnce({
      render: vi.fn(),
      unmount: unmountSpy,
    });

    const bootstrapShell = await getBootstrapShell();
    const teardown = bootstrapShell(host, minimalConfig);
    teardown();

    expect(unmountSpy).toHaveBeenCalledOnce();
  });
});
