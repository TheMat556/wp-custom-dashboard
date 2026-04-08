import { beforeEach, describe, expect, it } from "vitest";
import {
  bootstrapShellPreferencesStore,
  resetShellPreferencesStore,
  shellPreferencesStore,
} from "./shellPreferencesStore";

describe("shellPreferencesStore", () => {
  beforeEach(() => {
    localStorage.clear();
    resetShellPreferencesStore();
  });

  it("loads persisted favorites and recent pages on bootstrap", () => {
    localStorage.setItem(
      "wp-react-ui-shell-preferences",
      JSON.stringify({
        favorites: ["plugins.php"],
        recentPages: [
          {
            pageUrl: "http://localhost/wp-admin/plugins.php",
            title: "Plugins",
            visitedAt: 1,
          },
        ],
      })
    );

    bootstrapShellPreferencesStore();

    const state = shellPreferencesStore.getState();
    expect(state.favorites).toEqual(["plugins.php"]);
    expect(state.recentPages).toHaveLength(1);
  });

  it("toggles favorites and persists them", () => {
    bootstrapShellPreferencesStore();
    shellPreferencesStore.getState().toggleFavorite("plugins.php");

    expect(shellPreferencesStore.getState().favorites).toEqual(["plugins.php"]);
    expect(JSON.parse(localStorage.getItem("wp-react-ui-shell-preferences") ?? "{}")).toMatchObject(
      {
        favorites: ["plugins.php"],
      }
    );
  });

  it("records visits, deduplicates by URL, and keeps the newest first", () => {
    bootstrapShellPreferencesStore();

    shellPreferencesStore
      .getState()
      .recordVisit("http://localhost/wp-admin/plugins.php", "Plugins");
    shellPreferencesStore
      .getState()
      .recordVisit("http://localhost/wp-admin/themes.php", "Themes");
    shellPreferencesStore
      .getState()
      .recordVisit("http://localhost/wp-admin/plugins.php", "Plugins");

    expect(shellPreferencesStore.getState().recentPages.map((item) => item.pageUrl)).toEqual([
      "http://localhost/wp-admin/plugins.php",
      "http://localhost/wp-admin/themes.php",
    ]);
  });
});
