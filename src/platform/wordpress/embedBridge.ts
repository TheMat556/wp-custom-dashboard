import {
  EMBED_MESSAGE_SOURCE,
  EMBED_MESSAGE_VERSION,
  type EmbedMessage,
} from "../../types/embedMessages";
import { fromEmbedUrl, isShellRouteUrl } from "../../utils/embedUrl";
import {
  matchesOpenInNewTabPattern,
  shouldOpenOutsideAdminInNewTab,
} from "../../utils/openInNewTab";

declare global {
  interface Window {
    wpReactUiEmbed?: {
      openInNewTabPatterns?: string[];
      shellRouteSlugs?: string[];
      selfPluginBasename?: string;
    };
  }
}

function postToParent(message: EmbedMessage) {
  if (window.parent === window) {
    return;
  }

  window.parent.postMessage(message, window.location.origin);
}

function sendPageReady() {
  postToParent({
    source: EMBED_MESSAGE_SOURCE,
    version: EMBED_MESSAGE_VERSION,
    type: "page-ready",
    url: window.location.href,
    title: document.title,
  });
}

function breakoutToParent(url: string) {
  postToParent({
    source: EMBED_MESSAGE_SOURCE,
    version: EMBED_MESSAGE_VERSION,
    type: "breakout",
    url,
  });
}

function sendTitleChange() {
  postToParent({
    source: EMBED_MESSAGE_SOURCE,
    version: EMBED_MESSAGE_VERSION,
    type: "title-change",
    title: document.title,
  });
}

function addEmbedParam(url: string) {
  try {
    const parsed = new URL(url, window.location.href);
    const adminPathMatch = window.location.pathname.match(/^(.*\/wp-admin)(?:\/|$)/);
    const adminPathPrefix = adminPathMatch ? adminPathMatch[1] : "/wp-admin";

    if (
      parsed.origin !== window.location.origin ||
      (parsed.pathname !== adminPathPrefix && !parsed.pathname.startsWith(`${adminPathPrefix}/`))
    ) {
      return url;
    }

    parsed.searchParams.set("wp_shell_embed", "1");
    return parsed.toString();
  } catch {
    return url;
  }
}

function isBricksBuilderUrl(url: string) {
  try {
    const parsed = new URL(url, window.location.href);
    const combined = `${parsed.pathname}?${parsed.search}`.toLowerCase();

    if (parsed.searchParams.get("page")?.toLowerCase() === "bricks") {
      return true;
    }

    if (parsed.searchParams.get("bricks")?.toLowerCase() === "run") {
      return true;
    }

    if (parsed.searchParams.get("builder")?.toLowerCase() === "bricks") {
      return true;
    }

    return (
      combined.includes("edit_with_bricks") ||
      combined.includes("edit-with-bricks") ||
      combined.includes("action=bricks") ||
      combined.includes("bricks=run") ||
      combined.includes("/bricks/")
    );
  } catch {
    return false;
  }
}

function isSelfDeactivateUrl(url: string) {
  const pluginBasename = window.wpReactUiEmbed?.selfPluginBasename;
  if (!pluginBasename) {
    return false;
  }

  try {
    const parsed = new URL(url, window.location.href);
    return (
      parsed.origin === window.location.origin &&
      parsed.searchParams.get("action") === "deactivate" &&
      parsed.searchParams.get("plugin") === pluginBasename
    );
  } catch {
    return false;
  }
}

function shouldOpenInNewTab(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");
  const label = (anchor.textContent ?? "").trim().toLowerCase();

  if (!href) {
    return false;
  }

  if (isBricksBuilderUrl(href)) {
    return true;
  }

  if (shouldOpenOutsideAdminInNewTab(href)) {
    return true;
  }

  if (matchesOpenInNewTabPattern(href, window.wpReactUiEmbed?.openInNewTabPatterns)) {
    return true;
  }

  return label.includes("edit with bricks");
}

function patchLinks(root: ParentNode) {
  root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
    if (isSelfDeactivateUrl(anchor.href)) {
      return;
    }

    if (shouldOpenInNewTab(anchor)) {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      return;
    }

    anchor.href = addEmbedParam(anchor.href);
  });

  root.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
    const rawAction = form.getAttribute("action");
    form.setAttribute("action", addEmbedParam(rawAction || window.location.href));
  });
}

document.addEventListener(
  "click",
  (event) => {
    const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!(target instanceof HTMLAnchorElement)) {
      return;
    }

    if (isSelfDeactivateUrl(target.href)) {
      event.preventDefault();
      breakoutToParent(fromEmbedUrl(target.href));
      return;
    }

    if (!shouldOpenInNewTab(target)) {
      return;
    }

    event.preventDefault();
    window.open(target.href, "_blank", "noopener,noreferrer");
  },
  true
);

if (isShellRouteUrl(window.location.href, window.wpReactUiEmbed?.shellRouteSlugs)) {
  breakoutToParent(fromEmbedUrl(window.location.href));
} else {
  sendPageReady();
  patchLinks(document);
}

if (!isShellRouteUrl(window.location.href, window.wpReactUiEmbed?.shellRouteSlugs)) {
  try {
    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.nodeName === "TITLE") {
          sendTitleChange();
        }
      });
    }).observe(document.head, {
      subtree: true,
      characterData: true,
      childList: true,
    });
  } catch {
    // Ignore document head mutation failures.
  }

  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          patchLinks(node as ParentNode);
        }
      });
    });
  }).observe(document.body, {
    childList: true,
    subtree: true,
  });
}
