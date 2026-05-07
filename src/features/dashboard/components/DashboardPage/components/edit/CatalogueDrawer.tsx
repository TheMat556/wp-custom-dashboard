import { useDroppable } from "@dnd-kit/core";
import { Drawer, Empty, Grid, Input } from "antd";
import { useMemo, useState } from "react";
import type { DashboardViewModel } from "../../../../dashboardViewModel";
import {
  DASHBOARD_WIDGETS,
  type DashboardWidgetMeta,
  KPI_WIDGET_KEYS,
  mergeWidgetOrder,
} from "../../../../widgets/widgetRegistry";
import type { TFunc } from "../../types";
import { CatalogueItem, type CatalogueItemStatus } from "./CatalogueItem";

export const CATALOGUE_DROPZONE_ID = "catalogue:dropzone";

interface CatalogueDrawerProps {
  open: boolean;
  onClose: () => void;
  viewModel: DashboardViewModel;
  onAdd: (key: string) => void;
  /** Widget order to use for sorting (pass draft during editing). */
  order?: string[];
  /** Hidden widget keys (pass draft during editing). */
  hiddenKeys?: string[];
  t: TFunc;
}

interface CatalogueRow {
  widget: DashboardWidgetMeta;
  status: CatalogueItemStatus;
  ineligibleReason?: string;
}

function classify(
  widget: DashboardWidgetMeta,
  vm: DashboardViewModel,
  hiddenSet: Set<string>
): CatalogueItemStatus {
  // kpi-container is a multi-instance widget — always show "Add"
  if (widget.key === "kpi-container") return "hidden";
  if (!widget.isEligible(vm)) return "ineligible";
  if (hiddenSet.has(widget.key) && widget.hidableByUser) return "hidden";
  return "visible";
}

function buildRows(
  vm: DashboardViewModel,
  hiddenKeys: string[],
  order: string[],
  search: string
): CatalogueRow[] {
  const merged = mergeWidgetOrder(order);
  const orderIndex = new Map(merged.map((k, i) => [k, i]));
  const hiddenSet = new Set(hiddenKeys);
  const lower = search.trim().toLowerCase();

  return (
    DASHBOARD_WIDGETS.filter((w) => w.hidableByUser)
      // Individual KPIs are managed inside the KPI Container, not from the sidebar
      .filter((w) => !KPI_WIDGET_KEYS.includes(w.key))
      .filter((w) => !lower || w.label.toLowerCase().includes(lower))
      .map((widget) => ({
        widget,
        status: classify(widget, vm, hiddenSet),
      }))
      .sort((a, b) => {
        const ai = orderIndex.get(a.widget.key) ?? 999;
        const bi = orderIndex.get(b.widget.key) ?? 999;
        return ai - bi;
      })
  );
}

export function CatalogueDrawer({
  open,
  onClose,
  viewModel,
  onAdd,
  order: orderProp,
  hiddenKeys: hiddenKeysProp,
  t,
}: CatalogueDrawerProps) {
  const screens = Grid.useBreakpoint();
  const isMd = !!screens.md;
  const [search, setSearch] = useState("");
  const dropzone = useDroppable({ id: CATALOGUE_DROPZONE_ID });

  const rows = useMemo(
    () => buildRows(viewModel, hiddenKeysProp ?? [], orderProp ?? [], search),
    [viewModel, hiddenKeysProp, orderProp, search]
  );

  return (
    <Drawer
      title={t("Add widgets")}
      open={open}
      onClose={onClose}
      placement={isMd ? "right" : "bottom"}
      width={isMd ? 320 : undefined}
      height={isMd ? undefined : "60vh"}
      mask={false}
      keyboard
      destroyOnHidden={false}
      classNames={{ body: "wp-react-ui-catalogue-body" }}
    >
      <Input.Search
        placeholder={t("Search widgets")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        allowClear
        style={{ marginBottom: 12 }}
      />
      <div
        ref={dropzone.setNodeRef}
        className={`wp-react-ui-catalogue-list${dropzone.isOver ? " wp-react-ui-catalogue-list--over" : ""}`}
        data-testid="catalogue-list"
      >
        {rows.length === 0 ? (
          <Empty description={t("No widgets match that name.")} />
        ) : (
          rows.map(({ widget, status, ineligibleReason }) => (
            <CatalogueItem
              key={widget.key}
              widget={widget}
              status={status}
              ineligibleReason={ineligibleReason}
              onAdd={onAdd}
            />
          ))
        )}
      </div>
    </Drawer>
  );
}
