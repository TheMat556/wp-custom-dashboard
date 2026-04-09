import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageCanvas } from "./PageCanvas";

describe("PageCanvas", () => {
  it("renders the shared outer page scaffold", () => {
    const { container } = render(
      <PageCanvas>
        <div>Content</div>
      </PageCanvas>
    );

    const main = screen.getByRole("main");
    expect(main).toHaveClass("wp-react-ui-page-canvas");
    expect(container.querySelector(".wp-react-ui-page-canvas__inner")).not.toBeNull();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("supports centered loading layouts", () => {
    render(
      <PageCanvas centered data-testid="page-canvas">
        <span>Loading</span>
      </PageCanvas>
    );

    expect(screen.getByTestId("page-canvas")).toHaveClass(
      "wp-react-ui-page-canvas",
      "wp-react-ui-page-canvas--centered"
    );
  });
});
