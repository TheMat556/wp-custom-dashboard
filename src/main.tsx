import React from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, theme as antTheme } from "antd";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { SidebarProvider } from "./context/SidebarContext";
import Navbar from "./components/navbar";
import Sidebar from "./components/sidebar";
import "./types/wp";
import "./index.css";
import { initSpaNavigation } from "./utils/spaNavigate";

function ThemedApp({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm:
          theme === "dark"
            ? antTheme.darkAlgorithm
            : antTheme.defaultAlgorithm,
        token: {
          fontFamily:
            '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
          colorPrimary: "#4f46e5",
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <ThemedApp>{children}</ThemedApp>
      </SidebarProvider>
    </ThemeProvider>
  );
}

function setupDOM() {
  const wpwrap = document.getElementById("wpwrap");
  if (!wpwrap) return;

  const initialTheme = window.wpReactUi?.theme ?? "light";

  // Roots may already exist (created by the early-state DOMContentLoaded script).
  // Just ensure correct data-theme; don't create duplicates.
  if (!document.getElementById("react-navbar-root")) {
    const navbarRoot = document.createElement("div");
    navbarRoot.id = "react-navbar-root";
    navbarRoot.setAttribute("data-theme", initialTheme);
    wpwrap.insertBefore(navbarRoot, wpwrap.firstChild);
  }

  if (!document.getElementById("react-sidebar-root")) {
    const sidebarRoot = document.createElement("div");
    sidebarRoot.id = "react-sidebar-root";
    sidebarRoot.setAttribute("data-theme", initialTheme);
    const wpcontent = document.getElementById("wpcontent");
    wpcontent
      ? wpwrap.insertBefore(sidebarRoot, wpcontent)
      : wpwrap.appendChild(sidebarRoot);
  }

  // Mark shell as ready (may already be set by early-state script)
  wpwrap.classList.add("has-react-shell");
}

setupDOM();

function mount(hostId: string, Component: React.ComponentType) {
  const host = document.getElementById(hostId);
  if (!host) return;

  createRoot(host).render(
    <React.StrictMode>
      <ErrorBoundary name={hostId}>
        <Providers>
          <Component />
        </Providers>
      </ErrorBoundary>
    </React.StrictMode>
  );

  host.classList.add("mounted");
}

mount("react-navbar-root", Navbar);
mount("react-sidebar-root", Sidebar);

document.getElementById("wpwrap")?.classList.add("react-ready");
initSpaNavigation();
