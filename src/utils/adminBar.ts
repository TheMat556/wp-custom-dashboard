import DOMPurify from "dompurify";

export interface AdminBarAction {
  id: string;
  title: string;
  html: string;
}

const ALLOWED_TAGS = ["span", "svg", "path", "abbr"];
const ALLOWED_ATTR = [
  "class",
  "aria-label",
  "aria-hidden",
  "viewBox",
  "fill",
  "stroke",
  "d",
  "src",
  "alt",
  "title",
];
const FORBID_ATTR = ["style", "onload", "onerror"];

export function sanitizeAdminBarHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_ATTR,
  });
}

export function readAdminBarAction(
  id: string,
  rootDocument: Document | ParentNode | null = typeof document === "undefined" ? null : document
): AdminBarAction | null {
  if (!rootDocument) {
    return null;
  }

  const anchor = rootDocument.querySelector<HTMLAnchorElement>(`#${id} > a, #${id} a.ab-item`);
  if (!anchor) {
    return null;
  }

  const rawHtml = anchor.innerHTML.trim();
  if (!rawHtml) {
    return null;
  }

  const html = sanitizeAdminBarHtml(rawHtml);

  const title =
    anchor.getAttribute("title")?.trim() ||
    anchor.getAttribute("aria-label")?.trim() ||
    anchor.textContent?.trim() ||
    id;

  return {
    id,
    title,
    html,
  };
}

export function triggerAdminBarAction(id: string): boolean {
  return triggerAdminBarActionIn(id, typeof document === "undefined" ? null : document);
}

export function triggerAdminBarActionIn(
  id: string,
  rootDocument: Document | ParentNode | null
): boolean {
  if (!rootDocument) {
    return false;
  }

  const anchor = rootDocument.querySelector<HTMLAnchorElement>(`#${id} > a, #${id} a.ab-item`);
  if (!anchor) {
    return false;
  }

  anchor.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    })
  );

  return true;
}
