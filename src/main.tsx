import "./index.css";
import "./types/wp";
import { bootstrapShell } from "./bootstrapShell";
import { normalizeWpReactUiConfig } from "./types/wp";

function setupDOM(initialTheme: string) {
  const wpwrap = document.getElementById("wpwrap");
  if (!wpwrap) return null;

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

const config = normalizeWpReactUiConfig(window.wpReactUi);
const host = setupDOM(document.body.getAttribute("data-theme") ?? config.theme);

if (host) {
  window.__wpReactUiTeardown?.();
  window.__wpReactUiTeardown = bootstrapShell(host, config);
}
