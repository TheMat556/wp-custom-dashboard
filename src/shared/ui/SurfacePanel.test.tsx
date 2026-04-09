import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SurfacePanel } from "./SurfacePanel";

describe("SurfacePanel", () => {
  it("renders the shared surface structure", () => {
    render(
      <SurfacePanel title="Panel Title" description="Panel description" icon={<span>i</span>}>
        <div>Body content</div>
      </SurfacePanel>
    );

    expect(screen.getByText("Panel Title")).toBeInTheDocument();
    expect(screen.getByText("Panel description")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
    expect(document.querySelector(".wp-react-ui-surface-panel")).not.toBeNull();
  });
});
