import { describe, expect, it } from "vitest";
import { readAdminBarAction, triggerAdminBarAction } from "./adminBar";

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
      html: '<span style="font-size: 25px;">✦</span>',
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
