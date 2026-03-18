import Navbar from "./components/navbar";
import Sidebar from "./components/Sidebar";
import { mountInShadow } from "./shadow-mount";
import { SidebarProvider } from "./context/SidebarContext";
import "./index.css";

function setupDOM() {
  const wpwrap = document.getElementById("wpwrap");
  if (!wpwrap) return;

  if (!document.getElementById("react-navbar-root")) {
    const navbarRoot = document.createElement("div");
    navbarRoot.id = "react-navbar-root";
    wpwrap.insertBefore(navbarRoot, wpwrap.firstChild);
  }

  if (!document.getElementById("react-sidebar-root")) {
    const sidebarRoot = document.createElement("div");
    sidebarRoot.id = "react-sidebar-root";
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