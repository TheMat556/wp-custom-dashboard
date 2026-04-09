import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { menuCountsStore } from "../../../navigation/store/menuCountsStore";
import { SidebarContent } from "./SidebarContent";
import type { MenuItem } from "../../../../types/menu";

vi.mock("./Logo", () => ({
  Logo: () => <div data-testid="sidebar-logo" />,
}));

vi.mock("./BottomActions", () => ({
  __esModule: true,
  default: () => <div data-testid="sidebar-footer" />,
}));

const baseProps = {
  collapsed: false,
  activeKey: undefined,
  openKeys: [] as string[],
  onOpenChange: vi.fn(),
  onMenuClick: vi.fn(),
  loading: false,
  onRefresh: vi.fn(),
  adminUrl: "http://localhost/wp-admin/",
};

afterEach(() => {
  menuCountsStore.setState({
    counts: {},
    previousCounts: {},
  });
});

describe("SidebarContent", () => {
  it("renders live menu counts from the existing count store", () => {
    const menuItems: MenuItem[] = [
      {
        label: "Posts",
        slug: "edit.php",
        icon: "dashicons-admin-post",
      },
    ];

    menuCountsStore.setState({
      counts: { "edit.php": 7 },
      previousCounts: { "edit.php": 3 },
    });

    render(<SidebarContent {...baseProps} menuItems={menuItems} />);

    expect(screen.getByText("Posts")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("does not render closed submenu items into the keyboard tab order", () => {
    const menuItems: MenuItem[] = [
      {
        label: "Settings",
        slug: "options-general.php",
        icon: "dashicons-admin-settings",
        children: [{ label: "Permalinks", slug: "options-permalink.php" }],
      },
    ];

    const { rerender } = render(<SidebarContent {...baseProps} menuItems={menuItems} />);

    expect(
      screen.queryByRole("button", {
        name: "Permalinks",
      }),
    ).not.toBeInTheDocument();

    rerender(
      <SidebarContent
        {...baseProps}
        menuItems={menuItems}
        openKeys={["options-general.php"]}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Permalinks",
      }),
    ).toBeInTheDocument();
  });
});
