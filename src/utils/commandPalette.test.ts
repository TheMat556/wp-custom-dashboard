import { describe, expect, it } from "vitest";
import {
  buildNativeShellCommandDescriptors,
  buildMenuPaletteItems,
  buildRecentPaletteItems,
  dedupePaletteItems,
  searchPaletteItems,
  type RecentPageRecord,
} from "./commandPalette";
import type { MenuItem } from "../types/menu";

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    slug: "index.php",
  },
  {
    label: "Settings",
    slug: "options-general.php",
    children: [
      {
        label: "Brand Assets",
        slug: "wp-react-ui-branding",
      },
    ],
  },
];

describe("commandPalette utilities", () => {
  it("flattens top-level and child menu items into palette items", () => {
    const items = buildMenuPaletteItems(menuItems, "http://localhost/wp-admin/");

    expect(items.map((item) => item.label)).toEqual(["Dashboard", "Settings", "Brand Assets"]);
    expect(items[2]?.subtitle).toBe("Settings");
    expect(items[2]?.url).toBe(
      "http://localhost/wp-admin/admin.php?page=wp-react-ui-branding"
    );
  });

  it("maps recent pages back to matching menu items when possible", () => {
    const menuPaletteItems = buildMenuPaletteItems(menuItems, "http://localhost/wp-admin/");
    const recentPages: RecentPageRecord[] = [
      {
        pageUrl: "http://localhost/wp-admin/admin.php?page=wp-react-ui-branding",
        title: "Brand Assets",
        visitedAt: 10,
      },
    ];

    const recentItems = buildRecentPaletteItems(recentPages, menuPaletteItems);

    expect(recentItems[0]).toMatchObject({
      label: "Brand Assets",
      subtitle: "Recent / Settings",
      slug: "wp-react-ui-branding",
    });
  });

  it("deduplicates palette items by URL", () => {
    const items = dedupePaletteItems([
      {
        id: "a",
        label: "Dashboard",
        subtitle: "Menu item",
        url: "http://localhost/wp-admin/index.php",
        slug: "index.php",
        source: "menu",
      },
      {
        id: "b",
        label: "Dashboard",
        subtitle: "Recent page",
        url: "http://localhost/wp-admin/index.php",
        slug: "index.php",
        source: "recent",
      },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("a");
  });

  it("ranks label prefix matches above weaker matches", () => {
    const results = searchPaletteItems(
      buildMenuPaletteItems(menuItems, "http://localhost/wp-admin/"),
      "brand"
    );

    expect(results[0]?.label).toBe("Brand Assets");
  });

  it("builds native shell command descriptors for recent items and theme toggle", () => {
    const commands = buildNativeShellCommandDescriptors({
      menuItems,
      adminUrl: "http://localhost/wp-admin/",
      favorites: [],
      recentPages: [
        {
          pageUrl: "http://localhost/wp-admin/admin.php?page=wp-react-ui-branding",
          title: "Brand Assets",
          visitedAt: 1,
        },
      ],
      currentTheme: "dark",
    });

    expect(commands.some((command) => command.name === "wp-react-ui/toggle-theme")).toBe(true);
    expect(commands.some((command) => command.label === "Recent: Brand Assets")).toBe(true);
  });
});
