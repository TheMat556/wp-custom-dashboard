import { describe, expect, it } from "vitest";
import { readAdminBarAction, sanitizeAdminBarHtml, triggerAdminBarAction } from "./adminBar";

describe("adminBar utilities", () => {
  it("reads an admin bar action from the DOM", () => {
    document.body.innerHTML = `
      <ul id="wp-admin-bar-root-default">
        <li id="wp-admin-bar-snn-ai-chat">
          <a class="ab-item" href="#" title="Open AI Assistant">
            <span style="font-size: 25px;">✦</span>
          </a>
        </li>
      </ul>
    `;

    expect(readAdminBarAction("wp-admin-bar-snn-ai-chat")).toEqual({
      id: "wp-admin-bar-snn-ai-chat",
      title: "Open AI Assistant",
      html: "<span>✦</span>",
    });
  });

  it("dispatches a click on the original admin bar anchor", () => {
    document.body.innerHTML = `
      <li id="wp-admin-bar-snn-ai-chat">
        <a class="ab-item" href="#" title="Open AI Assistant">
          <span>✦</span>
        </a>
      </li>
    `;

    let clicked = false;
    document.querySelector("#wp-admin-bar-snn-ai-chat a")?.addEventListener("click", (event) => {
      event.preventDefault();
      clicked = true;
    });

    expect(triggerAdminBarAction("wp-admin-bar-snn-ai-chat")).toBe(true);
    expect(clicked).toBe(true);
  });
});

describe("sanitizeAdminBarHtml", () => {
  it("strips script tags", () => {
    const malicious = '<span>OK</span><script>alert("xss")</script>';
    expect(sanitizeAdminBarHtml(malicious)).toBe("<span>OK</span>");
  });

  it("strips event handler attributes", () => {
    const malicious = '<span onmouseover="alert(1)" class="icon">hover</span>';
    const result = sanitizeAdminBarHtml(malicious);
    expect(result).not.toContain("onmouseover");
    expect(result).toContain('class="icon"');
  });

  it("strips style attributes", () => {
    const html = '<span style="font-size:25px">✦</span>';
    expect(sanitizeAdminBarHtml(html)).toBe("<span>✦</span>");
  });

  it("preserves allowed SVG markup", () => {
    const svg = '<svg viewBox="0 0 24 24"><path d="M12 2L2 22h20z" fill="none"></path></svg>';
    const result = sanitizeAdminBarHtml(svg);
    expect(result).toContain("<svg");
    expect(result).toContain("<path");
    expect(result).toContain('viewBox="0 0 24 24"');
  });

  it("strips iframe tags", () => {
    const malicious = '<iframe src="https://evil.com"></iframe><span>ok</span>';
    expect(sanitizeAdminBarHtml(malicious)).toBe("<span>ok</span>");
  });
});
