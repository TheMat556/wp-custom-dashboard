import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useMenu", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = `<div id="react-shell-root"></div>`;
    window.wpReactUi = {
      ...window.wpReactUi,
      menu: [
        { label: "Dashboard", slug: "index.php" },
        { label: "Plugins", slug: "plugins.php" },
      ],
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shares menu state across multiple consumers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        menu: [
          { label: "Dashboard", slug: "index.php" },
          { label: "Users", slug: "users.php" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { useMenu } = await import("./useMenu");
    const { ShellConfigProvider } = await import("../context/ShellConfigContext");
    const { bootstrapMenuStore, resetMenuStore } = await import(
      "../features/navigation/store/menuStore"
    );
    const { normalizeWpReactUiConfig } = await import("../types/wp");
    resetMenuStore();
    bootstrapMenuStore({
      menu: window.wpReactUi?.menu ?? [],
      restUrl: "http://localhost/wp-json/wp-react-ui/v1",
      nonce: "test-nonce",
    });
    const config = normalizeWpReactUiConfig({
      menu: window.wpReactUi?.menu ?? [],
      locale: "en_US",
    });

    function NavbarConsumer() {
      const { menuItems } = useMenu();
      return <span data-testid="navbar-menu">{menuItems.map((item) => item.label).join(",")}</span>;
    }

    function SidebarConsumer() {
      const { menuItems, refresh } = useMenu();

      return (
        <>
          <span data-testid="sidebar-menu">{menuItems.map((item) => item.label).join(",")}</span>
          <button type="button" data-testid="refresh" onClick={() => void refresh()} />
        </>
      );
    }

    render(
      <ShellConfigProvider config={config}>
        <NavbarConsumer />
        <SidebarConsumer />
      </ShellConfigProvider>
    );

    expect(screen.getByTestId("navbar-menu")).toHaveTextContent("Dashboard,Plugins");
    expect(screen.getByTestId("sidebar-menu")).toHaveTextContent("Dashboard,Plugins");

    await act(async () => {
      fireEvent.click(screen.getByTestId("refresh"));
      await Promise.resolve();
    });

    expect(screen.getByTestId("navbar-menu")).toHaveTextContent("Dashboard,Users");
    expect(screen.getByTestId("sidebar-menu")).toHaveTextContent("Dashboard,Users");
    expect(window.wpReactUi?.menu?.[1]?.slug).toBe("plugins.php");
  });

  it("localizes the Brand Assets menu label from the active shell locale", async () => {
    window.wpReactUi = {
      ...window.wpReactUi,
      locale: "de_DE",
      menu: [{ label: "Branding", slug: "wp-react-ui-branding" }],
    };

    const { useMenu } = await import("./useMenu");
    const { ShellConfigProvider } = await import("../context/ShellConfigContext");
    const { bootstrapMenuStore, resetMenuStore } = await import(
      "../features/navigation/store/menuStore"
    );
    const { normalizeWpReactUiConfig } = await import("../types/wp");
    resetMenuStore();
    bootstrapMenuStore({
      menu: window.wpReactUi?.menu ?? [],
      restUrl: "http://localhost/wp-json/wp-react-ui/v1",
      nonce: "test-nonce",
    });
    const config = normalizeWpReactUiConfig({
      menu: window.wpReactUi?.menu ?? [],
      locale: "de_DE",
    });

    function Consumer() {
      const { menuItems } = useMenu();
      return <span data-testid="menu">{menuItems.map((item) => item.label).join(",")}</span>;
    }

    render(
      <ShellConfigProvider config={config}>
        <Consumer />
      </ShellConfigProvider>
    );

    expect(screen.getByTestId("menu")).toHaveTextContent("Markenassets");
  });
});
