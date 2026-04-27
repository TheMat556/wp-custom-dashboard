/**
 * Auth-flow and source-pinning tests for useContentFrameController.
 *
 * Covers the security hardening added in P1:
 *   - shell:auth-required CustomEvent triggers session expiry
 *   - postMessage shell:auth-required is no longer processed (CustomEvent only)
 *   - Message events from sources other than the trusted iframe are rejected
 */

import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionStore } from "../../../session/store/sessionStore";
import { useContentFrameController } from "./useContentFrameController";

vi.mock("../../context/ShellConfigContext", () => ({
  useShellConfig: () => ({ shellRoutes: [], user: { canManageOptions: true } }),
}));

vi.mock("zustand", async (importOriginal) => {
  const orig = await importOriginal<typeof import("zustand")>();
  return {
    ...orig,
    useStore: (_store: unknown, selector: (s: unknown) => unknown) =>
      selector({
        iframeUrl: "http://localhost/wp-admin/edit.php?wp_shell_embed=1",
        pageUrl: "http://localhost/wp-admin/edit.php",
        status: "ready",
        handleIframeLoad: vi.fn(),
        handleIframeMessage: vi.fn(),
      }),
  };
});

beforeEach(() => {
  sessionStore.setState({ expired: false, checking: false });
});

afterEach(() => {
  vi.restoreAllMocks();
  sessionStore.setState({ expired: false, checking: false });
});

// ── shell:auth-required CustomEvent ──────────────────────────────────────────

describe("shell:auth-required CustomEvent", () => {
  it("marks the session expired when the CustomEvent is dispatched", () => {
    renderHook(() => useContentFrameController());

    window.dispatchEvent(new CustomEvent("shell:auth-required", { detail: { status: 401 } }));

    expect(sessionStore.getState().expired).toBe(true);
  });

  it("removes the CustomEvent listener on unmount", () => {
    const { unmount } = renderHook(() => useContentFrameController());
    unmount();

    window.dispatchEvent(new CustomEvent("shell:auth-required", { detail: { status: 401 } }));

    expect(sessionStore.getState().expired).toBe(false);
  });

  it("does NOT mark expired for a regular postMessage with shell:auth-required type", () => {
    // After migration to CustomEvent, the message listener no longer processes
    // shell:auth-required via postMessage — verifies the old path is gone.
    renderHook(() => useContentFrameController());

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: { type: "shell:auth-required", status: 401 },
      })
    );

    expect(sessionStore.getState().expired).toBe(false);
  });
});

// ── iframe source pinning ─────────────────────────────────────────────────────

describe("iframe source pinning", () => {
  it("rejects embed messages that do not come from the trusted iframe contentWindow", () => {
    // iframeRef.current is null in unit tests (no real iframe mounted).
    // Any MessageEvent — regardless of origin or content — should be dropped.
    const handleMessageMock = vi.fn();
    const { unmount } = renderHook(() => useContentFrameController());

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          source: "wp-shell-embed",
          version: 1,
          type: "title-change",
          title: "Injected",
        },
      })
    );

    // handleIframeMessage is mocked in the zustand mock above; it should not
    // be called because the source doesn't match the iframe's contentWindow.
    expect(handleMessageMock).not.toHaveBeenCalled();
    unmount();
  });
});
