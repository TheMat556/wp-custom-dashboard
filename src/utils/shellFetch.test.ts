/**
 * Tests for src/utils/shellFetch.ts
 *
 * jsdom URL: "http://localhost/wp-admin/admin.php" (set in vitest.config.ts)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SHELL_MANAGED_HEADER, shellFetch } from "./shellFetch";

function mockFetch(status: number, body = "{}"): ReturnType<typeof vi.fn> {
  const response = new Response(body, { status });
  const mock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("shellFetch", () => {
  let dispatchEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.unstubAllGlobals();
    dispatchEventSpy = vi.spyOn(window, "dispatchEvent") as unknown as ReturnType<typeof vi.spyOn>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Header tagging ───────────────────────────────────────────────────────────

  it("adds X-WP-Shell-Managed: 1 to every request", async () => {
    const fetchMock = mockFetch(200);
    await shellFetch("https://example.com/api/data");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get(SHELL_MANAGED_HEADER)).toBe("1");
  });

  it("preserves existing headers alongside the shell-managed marker", async () => {
    const fetchMock = mockFetch(200);
    await shellFetch("/wp-json/wp/v2/users/me", {
      headers: { "X-WP-Nonce": "abc123" },
    });

    const headers = new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers);
    expect(headers.get("X-WP-Nonce")).toBe("abc123");
    expect(headers.get(SHELL_MANAGED_HEADER)).toBe("1");
  });

  it("does not mutate the original init object", async () => {
    mockFetch(200);
    const init: RequestInit = { headers: { "X-Custom": "original" } };
    await shellFetch("/some-url", init);

    // The original init.headers should not have been modified.
    expect(new Headers(init.headers).has(SHELL_MANAGED_HEADER)).toBe(false);
  });

  // ── Response pass-through ────────────────────────────────────────────────────

  it("returns the response unchanged for 2xx status codes", async () => {
    mockFetch(200, JSON.stringify({ ok: true }));
    const response = await shellFetch("/api/data");
    expect(response.status).toBe(200);
  });

  it("returns the response unchanged for non-auth error codes", async () => {
    mockFetch(500);
    const response = await shellFetch("/api/data");
    expect(response.status).toBe(500);
    expect(dispatchEventSpy).not.toHaveBeenCalled();
  });

  // ── 401 / 403 → shell:auth-required ─────────────────────────────────────────

  it("dispatches shell:auth-required CustomEvent when response is 401", async () => {
    mockFetch(401);
    await shellFetch("/wp-json/wp/v2/users/me");

    expect(dispatchEventSpy).toHaveBeenCalledOnce();
    const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe("shell:auth-required");
    expect(event.detail.status).toBe(401);
  });

  it("dispatches shell:auth-required CustomEvent when response is 403", async () => {
    mockFetch(403);
    await shellFetch("/wp-json/wp-react-ui/v1/settings");

    expect(dispatchEventSpy).toHaveBeenCalledOnce();
    const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe("shell:auth-required");
    expect(event.detail.status).toBe(403);
  });

  it("still returns the 401 response after posting the auth message", async () => {
    mockFetch(401);
    const response = await shellFetch("/api/data");
    expect(response.status).toBe(401);
  });

  it("still returns the 403 response after posting the auth message", async () => {
    mockFetch(403);
    const response = await shellFetch("/api/data");
    expect(response.status).toBe(403);
  });

  it("does NOT dispatch shell:auth-required for 404 responses", async () => {
    mockFetch(404);
    await shellFetch("/api/missing");
    expect(dispatchEventSpy).not.toHaveBeenCalled();
  });
});
