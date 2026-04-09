export interface AdminBarAction {
  id: string;
  title: string;
  html: string;
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

  const html = anchor.innerHTML.trim();
  if (!html) {
    return null;
  }

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
