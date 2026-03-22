import { theme as antTheme, ConfigProvider } from "antd";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SidebarProvider } from "./context/SidebarContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import "./types/wp";
import "./index.css";
import { initSpaNavigation } from "./utils/spaNavigate";

function AntConfigProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === "dark" ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
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
      <AntConfigProvider>
        <SidebarProvider>{children}</SidebarProvider>
      </AntConfigProvider>
    </ThemeProvider>
  );
}

function setupDOM() {
  const wpwrap = document.getElementById("wpwrap");
  if (!wpwrap) return null;

  const initialTheme =
    document.body.getAttribute("data-theme") ?? window.wpReactUi?.theme ?? "light";
  const wpcontent = document.getElementById("wpcontent");

  document.getElementById("react-navbar-root")?.remove();
  document.getElementById("react-sidebar-root")?.remove();

  let shellRoot = document.getElementById("react-shell-root");
  if (!shellRoot) {
    shellRoot = document.createElement("div");
    shellRoot.id = "react-shell-root";
    wpcontent ? wpwrap.insertBefore(shellRoot, wpcontent) : wpwrap.appendChild(shellRoot);
  }

  shellRoot.setAttribute("data-theme", initialTheme);
  wpwrap.classList.add("has-react-shell");

  return shellRoot;
}

const host = setupDOM();

if (host) {
  createRoot(host).render(
    <React.StrictMode>
      <ErrorBoundary name="react-shell-root">
        <Providers>
          <App />
        </Providers>
      </ErrorBoundary>
    </React.StrictMode>
  );

  host.classList.add("mounted");
}

document.getElementById("wpwrap")?.classList.add("react-ready");
initSpaNavigation();
