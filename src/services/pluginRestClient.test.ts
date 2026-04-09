import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetNotificationStore } from "../store/notificationStore";
import { createActivityService } from "./activityApi";
import { createBrandingService } from "./brandingApi";
import { createPreferencesService } from "./preferencesApi";
import { createPluginRestClient } from "../shared/services/pluginRestClient";

const TEST_CONFIG = {
  restUrl: "http://localhost/wp-json/wp-react-ui/v1",
  nonce: "test-nonce",
} as const;

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    ...init,
  });
}

describe("plugin REST transport", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetNotificationStore();
  });

  it("centralizes nonce headers for plugin GET requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ menu: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createPluginRestClient(TEST_CONFIG);
    await client.get("/menu");

    expect(fetchMock).toHaveBeenCalledWith("http://localhost/wp-json/wp-react-ui/v1/menu", {
      headers: {
        "X-WP-Nonce": "test-nonce",
      },
    });
  });

  it("preserves activity query-string construction through the shared client", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        entries: [],
        total: 0,
        page: 2,
        perPage: 20,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const service = createActivityService(TEST_CONFIG);
    await service.fetchActivity({
      page: 2,
      perPage: 20,
      userId: 7,
      action: "updated",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/wp-json/wp-react-ui/v1/activity?page=2&perPage=20&userId=7&action=updated",
      {
        headers: {
          "X-WP-Nonce": "test-nonce",
        },
      }
    );
  });

  it("keeps preferences fetch fallback behavior unchanged on failed responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const service = createPreferencesService(TEST_CONFIG);

    await expect(service.fetchPreferences()).resolves.toEqual({});
  });

  it("keeps branding save behavior and payload shape unchanged", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        lightLogoId: 1,
        lightLogoUrl: "https://example.com/light.svg",
        darkLogoId: 2,
        darkLogoUrl: "https://example.com/dark.svg",
        longLogoId: 3,
        longLogoUrl: "https://example.com/long.svg",
        useLongLogo: true,
        primaryColor: "#123456",
        fontPreset: "inter",
        openInNewTabPatterns: ["plugins.php"],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const service = createBrandingService(TEST_CONFIG);
    const payload = {
      lightLogoId: 1,
      darkLogoId: 2,
      longLogoId: 3,
      useLongLogo: true,
      primaryColor: "#123456",
      fontPreset: "inter",
      openInNewTabPatterns: ["plugins.php"],
    };

    await expect(service.saveBranding(payload)).resolves.toEqual({
      lightLogoId: 1,
      lightLogoUrl: "https://example.com/light.svg",
      darkLogoId: 2,
      darkLogoUrl: "https://example.com/dark.svg",
      longLogoId: 3,
      longLogoUrl: "https://example.com/long.svg",
      useLongLogo: true,
      primaryColor: "#123456",
      fontPreset: "inter",
      openInNewTabPatterns: ["plugins.php"],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/wp-json/wp-react-ui/v1/branding",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": "test-nonce",
        },
        body: JSON.stringify(payload),
      }
    );
  });
});
