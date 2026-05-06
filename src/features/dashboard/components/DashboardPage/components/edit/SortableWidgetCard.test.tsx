import { DndContext } from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardWidgetMeta } from "../../../../widgets/widgetRegistry";
import { SortableWidgetCard } from "./SortableWidgetCard";

// Mock the shellPreferencesStore with stable snapshot references
const mockToggleVisibility = vi.fn();
const mockSetSize = vi.fn();
const mockSetOrder = vi.fn();

const mockState = {
  dashboardWidgetSizes: {},
  hiddenWidgets: [],
  dashboardWidgetOrder: ["test-widget"],
  toggleWidgetVisibility: mockToggleVisibility,
  setDashboardWidgetSize: mockSetSize,
  setDashboardWidgetOrder: mockSetOrder,
};

vi.mock("../../../../../shell/store/shellPreferencesStore", () => ({
  shellPreferencesStore: {
    getState: () => mockState,
    getInitialState: () => mockState,
    subscribe: () => () => {},
    setState: () => {},
  },
}));

const mockWidget: DashboardWidgetMeta = {
  key: "test-widget",
  label: "Test Widget",
  defaultSize: "full",
  allowedSizes: ["full", "half"],
  hidableByUser: true,
  isEligible: () => true,
  render: () => <div>Test content</div>,
};

describe("SortableWidgetCard", () => {
  beforeEach(() => {
    mockToggleVisibility.mockClear();
    mockSetSize.mockClear();
    mockSetOrder.mockClear();
  });

  it("renders children", () => {
    render(
      <DndContext>
        <SortableContext items={["test-widget"]} strategy={rectSortingStrategy}>
          <SortableWidgetCard widget={mockWidget}>
            <div>Child content</div>
          </SortableWidgetCard>
        </SortableContext>
      </DndContext>
    );

    expect(screen.getByText("Child content")).toBeDefined();
  });

  it("renders drag handle with aria-label", () => {
    render(
      <DndContext>
        <SortableContext items={["test-widget"]} strategy={rectSortingStrategy}>
          <SortableWidgetCard widget={mockWidget}>
            <div>Content</div>
          </SortableWidgetCard>
        </SortableContext>
      </DndContext>
    );

    expect(screen.getByLabelText("Drag to reorder")).toBeDefined();
  });
});
