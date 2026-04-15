import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCoreWpRestClient } from "./coreWpRestClient";

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    ...init,
  });
}

function getCalledHeaders(fetchMock: ReturnType<typeof vi.fn>): Headers {
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  return new Headers(init.headers);
}

describe("core WP REST transport", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("centralizes nonce headers for core GET requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createCoreWpRestClient({ nonce: "test-nonce" });
    await client.get("/wp/v2/users/me");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("/wp-json/wp/v2/users/me");

    const headers = getCalledHeaders(fetchMock);
    expect(headers.get("X-WP-Nonce")).toBe("test-nonce");
    expect(headers.get("X-WP-Shell-Managed")).toBe("1");
  });

  it("tags shell-managed requests with X-WP-Shell-Managed: 1", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createCoreWpRestClient({ nonce: "any-nonce" });
    await client.get("/wp/v2/users/me");

    expect(getCalledHeaders(fetchMock).get("X-WP-Shell-Managed")).toBe("1");
  });

  it("keeps quick draft payload shape unchanged for core POST requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 10 }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createCoreWpRestClient({ nonce: "test-nonce" });
    await client.post("/wp/v2/posts", {
      title: "Draft title",
      content: "Draft content",
      status: "draft",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe("/wp-json/wp/v2/posts");
    expect(calledInit.method).toBe("POST");
    expect(calledInit.body).toBe(
      JSON.stringify({ title: "Draft title", content: "Draft content", status: "draft" })
    );

    const headers = new Headers(calledInit.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-WP-Nonce")).toBe("test-nonce");
    expect(headers.get("X-WP-Shell-Managed")).toBe("1");
  });
});
