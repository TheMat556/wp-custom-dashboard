import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WpReactUiConfig } from "../../../types/wp";
import { ShellConfigProvider } from "../../shell/context/ShellConfigContext";
import { resetSessionStore, sessionStore } from "../store/sessionStore";
import { SESSION_HEARTBEAT_INTERVAL_MS, useSessionHeartbeat } from "./useSessionHeartbeat";

const TEST_CONFIG: Readonly<WpReactUiConfig> = Object.freeze({
  adminUrl: "/wp-admin/",
  menu: [],
  restUrl: "/wp-json/wp-react-ui/v1",
  nonce: "test-nonce",
  siteName: "Site",
  branding: {
    siteName: "Site",
    logos: {
      lightUrl: null,
      darkUrl: null,
      longUrl: null,
      defaultUrl: "/logo.svg",
    },
    useLongLogo: false,
    primaryColor: "#4f46e5",
    fontPreset: "inter",
  },
  theme: "light",
  assetsUrl: "/",
  publicUrl: "/",
  navigation: {
    fullReloadPageParams: [],
    shellDisabledPagenow: [],
    breakoutPagenow: [],
    openInNewTabPatterns: [],
  },
  logoutUrl: "/wp-login.php?action=logout",
  user: {
    name: "Admin",
    role: "administrator",
  },
  shellRoutes: [],
  locale: "en_US",
});

function ShellWrapper({ children }: { children: ReactNode }) {
  return <ShellConfigProvider config={TEST_CONFIG}>{children}</ShellConfigProvider>;
}

function setDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: hidden,
  });
}

describe("useSessionHeartbeat", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resetSessionStore();
    setDocumentHidden(false);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    resetSessionStore();
    setDocumentHidden(false);
  });

  it("preserves the heartbeat interval and visibility lifecycle without immediate resume polling", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = renderHook(() => useSessionHeartbeat(), {
      wrapper: ShellWrapper,
    });

    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SESSION_HEARTBEAT_INTERVAL_MS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/wp-json/wp/v2/users/me", {
      headers: {
        "X-WP-Nonce": "test-nonce",
      },
    });

    setDocumentHidden(true);
    document.dispatchEvent(new Event("visibilitychange"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SESSION_HEARTBEAT_INTERVAL_MS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    setDocumentHidden(false);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SESSION_HEARTBEAT_INTERVAL_MS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    unmount();
  });

  it("marks the session expired on auth failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useSessionHeartbeat(), {
      wrapper: ShellWrapper,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SESSION_HEARTBEAT_INTERVAL_MS);
    });

    expect(sessionStore.getState().expired).toBe(true);
    expect(sessionStore.getState().checking).toBe(false);
  });

  it("does not expire the session on network errors", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useSessionHeartbeat(), {
      wrapper: ShellWrapper,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SESSION_HEARTBEAT_INTERVAL_MS);
    });

    expect(sessionStore.getState().expired).toBe(false);
    expect(sessionStore.getState().checking).toBe(false);
  });
});
