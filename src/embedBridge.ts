import {
  EMBED_MESSAGE_SOURCE,
  EMBED_MESSAGE_VERSION,
  type EmbedMessage,
} from "./types/embedMessages";

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
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin || !parsed.pathname.startsWith("/wp-admin")) {
      return url;
    }

    parsed.searchParams.set("wp_shell_embed", "1");
    return parsed.toString();
  } catch {
    return url;
  }
}

function patchLinks(root: ParentNode) {
  root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
    anchor.href = addEmbedParam(anchor.href);
  });

  root.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
    form.action = addEmbedParam(form.action || window.location.href);
  });
}

sendPageReady();
patchLinks(document);

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
