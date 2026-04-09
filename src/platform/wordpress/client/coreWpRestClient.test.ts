import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCoreWpRestClient } from "./coreWpRestClient";

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    ...init,
  });
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

    expect(fetchMock).toHaveBeenCalledWith("/wp-json/wp/v2/users/me", {
      headers: {
        "X-WP-Nonce": "test-nonce",
      },
    });
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
  });
});
