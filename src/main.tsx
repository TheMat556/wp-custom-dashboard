import Navbar from "./components/navbar";
import Sidebar from "./components/sidebar";
import { mountInShadow } from "./shadow-mount";
import { SidebarProvider } from "./context/SidebarContext";
import "./index.css";

function createShadowHost() {
  const shadowHost = document.createElement("div");
  shadowHost.className = "wp-react-ui-shadow-host";
  return shadowHost;
}

function getSidebarShell() {
  return window.wpReactUi?.sidebarShellHtml?.trim() ?? "";
}

function setupDOM() {
  const wpwrap = document.getElementById("wpwrap");
  if (!wpwrap) return;
  const initialTheme = window.wpReactUi?.theme ?? "light";

  if (!document.getElementById("react-navbar-root")) {
    const navbarRoot = document.createElement("div");
    navbarRoot.id = "react-navbar-root";
    navbarRoot.setAttribute("data-theme", initialTheme);
    navbarRoot.appendChild(createShadowHost());
    wpwrap.insertBefore(navbarRoot, wpwrap.firstChild);
  }

  if (!document.getElementById("react-sidebar-root")) {
    const sidebarRoot = document.createElement("div");
    sidebarRoot.id = "react-sidebar-root";
    sidebarRoot.setAttribute("data-theme", initialTheme);

    const sidebarShell = getSidebarShell();
    if (sidebarShell !== "") {
      const shell = document.createElement("div");
      shell.className = "wp-react-ui-sidebar-shell-wrapper";
      shell.innerHTML = sidebarShell;
      sidebarRoot.classList.add("has-server-shell");
      sidebarRoot.appendChild(shell);
    }

    sidebarRoot.appendChild(createShadowHost());
    const wpcontent = document.getElementById("wpcontent");
    wpcontent
      ? wpwrap.insertBefore(sidebarRoot, wpcontent)
      : wpwrap.appendChild(sidebarRoot);
  }
}

setupDOM();

// Both components wrapped in SidebarProvider
// Cross-shadow communication happens via window custom events
mountInShadow("react-navbar-root", () => (
  <SidebarProvider>
    <Navbar />
  </SidebarProvider>
));

mountInShadow("react-sidebar-root", () => (
  <SidebarProvider>
    <Sidebar />
  </SidebarProvider>
));
