import { act, renderHook } from "@testing-library/react";
import { message } from "antd";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WpReactUiConfig } from "../../../types/wp";
import { ShellConfigProvider } from "../../shell/context/ShellConfigContext";
import { useQuickDraft } from "./useQuickDraft";

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

describe("useQuickDraft", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.spyOn(message, "success").mockImplementation(() => undefined as never);
    vi.spyOn(message, "error").mockImplementation(() => undefined as never);
  });

  it("preserves quick draft submit behavior through the posts gateway", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    const onSuccess = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useQuickDraft({ onSuccess }), {
      wrapper: ShellWrapper,
    });

    await act(async () => {
      await result.current.handleSubmit({
        title: "  Draft title  ",
        content: "  Draft content  ",
      });
    });

    expect(fetchMock).toHaveBeenCalledWith("/wp-json/wp/v2/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WP-Nonce": "test-nonce",
      },
      body: JSON.stringify({
        title: "Draft title",
        content: "Draft content",
        status: "draft",
      }),
    });
    expect(message.success).toHaveBeenCalledWith("Draft saved");
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.saving).toBe(false);
  });

  it("does not submit blank draft titles", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useQuickDraft(), {
      wrapper: ShellWrapper,
    });

    await act(async () => {
      await result.current.handleSubmit({
        title: "   ",
        content: "Ignored",
      });
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
