import { DndContext } from "@dnd-kit/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DashboardViewModel } from "../../../../dashboardViewModel";
import { CatalogueDrawer } from "./CatalogueDrawer";

const emptyVm = {
  health: null,
  updates: null,
  trend: [],
  countries: [],
  speed: null,
  seo: null,
  seoBasics: null,
  legalData: null,
  bizData: null,
  stats: null,
  checklist: [],
  readiness: null,
  calendar: null,
  submissionStats: null,
  total30Views: 0,
  sparkline: [],
  viewTrend: 0,
  actions: [],
  criticalActions: [],
  warningActions: [],
  infoActions: [],
  hasUpdates: false,
  isSiteDown: false,
  checklistDone: 0,
  showChecklist: false,
} as DashboardViewModel;

function renderDrawer(onAdd = vi.fn(), onClose = vi.fn(), options?: { hiddenKeys?: string[] }) {
  return render(
    <DndContext>
      <CatalogueDrawer
        open={true}
        viewModel={emptyVm}
        onAdd={onAdd}
        onClose={onClose}
        hiddenKeys={options?.hiddenKeys}
      />
    </DndContext>
  );
}

describe("CatalogueDrawer", () => {
  it("renders the catalogue title", () => {
    renderDrawer();
    expect(screen.getByText("Add widgets")).toBeDefined();
  });

  it("lists hidable widgets (non-hidable like Hero Banner excluded)", () => {
    renderDrawer();
    expect(screen.getByText("Page Views")).toBeDefined();
    expect(screen.getByText("Action Center")).toBeDefined();
    expect(screen.queryByText("Hero Banner")).toBeNull();
  });

  it("filters items by search query", () => {
    renderDrawer();
    const search = screen.getByPlaceholderText("Search widgets") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "Page" } });
    expect(screen.getByText("Page Views")).toBeDefined();
    expect(screen.queryByText("Hero Banner")).toBeNull();
  });

  it("shows empty state when no widgets match", () => {
    renderDrawer();
    const search = screen.getByPlaceholderText("Search widgets") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "ZzzNoSuchThing" } });
    expect(screen.getByText("No widgets match that name.")).toBeDefined();
  });

  it("invokes onAdd when the Add button is clicked on a hidden widget", () => {
    const onAdd = vi.fn();
    renderDrawer(onAdd, undefined, { hiddenKeys: ["traffic"] });

    const addButton = screen.getByLabelText("Add Page Views");
    fireEvent.click(addButton);
    expect(onAdd).toHaveBeenCalledWith("traffic");
  });
});
