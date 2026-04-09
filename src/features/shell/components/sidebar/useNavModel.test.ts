import { describe, expect, it } from "vitest";
import type { MenuItem } from "../../../../types/menu";
import { buildNavModel } from "./useNavModel";

const menuItems: MenuItem[] = [
  { label: "Dashboard", slug: "index.php", icon: "dashicons-dashboard" },
  { label: "Posts", slug: "edit.php", icon: "dashicons-admin-post" },
  { label: "Bookings", slug: "admin.php?page=bookings", icon: "dashicons-cart" },
  {
    label: "Settings",
    slug: "options-general.php",
    icon: "dashicons-admin-settings",
    children: [{ label: "Permalinks", slug: "options-permalink.php" }],
  },
];

describe("buildNavModel", () => {
  it("groups items into stable editorial shell sections", () => {
    const model = buildNavModel(menuItems, "edit.php", {}, false, {});

    expect(model.map((section) => section.id)).toEqual([
      "overview",
      "publishing",
      "operations",
      "system",
    ]);
    expect(model[0]?.items[0]?.slug).toBe("index.php");
    expect(model[1]?.items[0]?.slug).toBe("edit.php");
    expect(model[2]?.items[0]?.slug).toBe("admin.php?page=bookings");
    expect(model[3]?.items[0]?.slug).toBe("options-general.php");
  });

  it("marks active branches and collapsed badge state from count data", () => {
    const model = buildNavModel(
      menuItems,
      "options-permalink.php",
      {
        "options-permalink.php": 3,
      },
      true,
      {
        "options-permalink.php": 1,
      }
    );

    const systemItem = model.find((section) => section.id === "system")?.items[0];
    const childItem = systemItem?.children[0];

    expect(systemItem?.isActiveBranch).toBe(true);
    expect(childItem?.isActive).toBe(true);
    expect(childItem?.count).toBe(3);
    expect(childItem?.countChanged).toBe(true);
    expect(systemItem?.showCollapsedBadge).toBe(true);
  });
});
