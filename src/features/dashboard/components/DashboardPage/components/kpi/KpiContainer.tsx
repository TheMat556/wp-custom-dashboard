import { AppstoreOutlined, CloseOutlined, HolderOutlined, PlusOutlined } from "@ant-design/icons";
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button, Flex, Segmented, Typography, theme } from "antd";
import { useCallback, useMemo } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { KpiContainerColumns } from "../../../../../../types/shellPreferences";
import { shellPreferencesStore } from "../../../../../shell/store/shellPreferencesStore";
import type { DashboardViewModel } from "../../../../dashboardViewModel";
import { dashboardEditModeStore } from "../../../../store/dashboardEditModeStore";
import type { DashboardWidgetMeta, WidgetRenderProps } from "../../../../widgets/widgetRegistry";
import {
  DASHBOARD_WIDGETS,
  KPI_WIDGET_KEYS,
  parseContainerInstanceKey,
} from "../../../../widgets/widgetRegistry";
import kpiStyles from "./KpiContainer.module.css";

const { Text } = Typography;

const COLUMN_OPTIONS: { value: KpiContainerColumns; label: string }[] = [
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
];

interface KpiContainerProps {
  instanceKey: string;
  viewModel: DashboardViewModel;
  config: { adminUrl: string };
  t: (key: string, vars?: Record<string, string | number>) => string;
  intlLocale: string;
  isEditing: boolean;
}

interface DraggableKpiTileProps {
  kpi: DashboardWidgetMeta;
  index: number;
  isEditing: boolean;
  handleRemoveKpi: (kpiKey: string) => void;
  revealDelayMs: number;
  viewModel: DashboardViewModel;
  config: { adminUrl: string };
  t: (key: string, vars?: Record<string, string | number>) => string;
  intlLocale: string;
}

function renderWidgetFromRegistry(
  widget: DashboardWidgetMeta,
  props: {
    viewModel: DashboardViewModel;
    config: { adminUrl: string };
    t: (key: string, vars?: Record<string, string | number>) => string;
    intlLocale: string;
  }
): React.ReactNode {
  return widget.render({
    config: props.config,
    viewModel: props.viewModel,
    t: props.t,
    intlLocale: props.intlLocale,
    isEditing: false,
    widgetKey: widget.key,
  } as WidgetRenderProps);
}

function DraggableKpiTile({
  kpi,
  index,
  isEditing,
  handleRemoveKpi,
  revealDelayMs,
  viewModel,
  config,
  t,
  intlLocale,
}: DraggableKpiTileProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    active: dndActive,
  } = useDraggable({
    id: kpi.key,
  });
  const { setNodeRef: setDropRef, isOver: isOverTile } = useDroppable({
    id: kpi.key,
  });

  const mergedRef = useCallback(
    (node: HTMLElement | null) => {
      setNodeRef(node);
      setDropRef(node);
    },
    [setNodeRef, setDropRef]
  );

  const isDragging = dndActive?.id === kpi.key;

  return (
    <div
      ref={mergedRef}
      className={`wp-react-ui-kpi-grid__item${isOverTile ? " wp-react-ui-kpi-grid__item--over" : ""}`}
      style={{
        position: "relative",
        minWidth: 0,
        opacity: isDragging ? 0.4 : 1,
        transform: isDragging ? CSS.Transform.toString(transform) : undefined,
        outline: isOverTile ? "2px solid var(--color-accent-primary)" : undefined,
        outlineOffset: 1,
        borderRadius: "var(--radius-lg)",
      }}
    >
      {/* Drag handle in edit mode */}
      {isEditing && !isDragging && (
        // biome-ignore lint/a11y/useFocusableInteractive: dnd-kit useDraggable provides keyboard/role via {...attributes}
        // biome-ignore lint/a11y/useSemanticElements: dnd-kit requires a non-semantic host element
        <span
          {...listeners}
          {...attributes}
          role="button"
          aria-label={t("Drag {label} to reorder", { label: kpi.label })}
          className={kpiStyles.dragHandle}
        >
          <HolderOutlined />
        </span>
      )}

      {/* Remove from container button in edit mode */}
      {isEditing && (
        <button
          type="button"
          onClick={() => handleRemoveKpi(kpi.key)}
          aria-label={t("Remove {label} from container", { label: kpi.label })}
          className={kpiStyles.removeBtn}
        >
          <CloseOutlined />
        </button>
      )}

      <div
        className="wp-react-ui-dashboard-reveal"
        style={
          {
            "--dashboard-reveal-delay": `${revealDelayMs + index * 30}ms`,
            minWidth: 0,
          } as React.CSSProperties
        }
      >
        {renderWidgetFromRegistry(kpi, { viewModel, config, t, intlLocale })}
      </div>
    </div>
  );
}

// ── KpiContainer ──

function addKpiViaEditMode(instanceId: string, kpiKey: string) {
  const state = dashboardEditModeStore.getState();
  const currentOrder = state.draft.kpiContainers[instanceId]?.order ?? [];
  if (currentOrder.includes(kpiKey)) return;
  state.setDraftKpiContainerConfig(instanceId, { order: [...currentOrder, kpiKey] });
  const filteredGrid = state.draft.order.filter((k) => k !== kpiKey);
  if (filteredGrid.length !== state.draft.order.length) {
    state.setDraftOrder(filteredGrid);
  }
}

function removeKpiViaEditMode(instanceId: string, instanceKey: string, kpiKey: string) {
  const state = dashboardEditModeStore.getState();
  const currentOrder = state.draft.kpiContainers[instanceId]?.order ?? [];
  const next = currentOrder.filter((k) => k !== kpiKey);
  state.setDraftKpiContainerConfig(instanceId, { order: next });
  const containerIdx = state.draft.order.indexOf(instanceKey);
  if (containerIdx !== -1) {
    const newOrder = [...state.draft.order];
    newOrder.splice(containerIdx + 1, 0, kpiKey);
    state.setDraftOrder(newOrder);
  }
}

function removeContainerViaEditMode(instanceId: string, instanceKey: string) {
  const state = dashboardEditModeStore.getState();
  const kpis = state.draft.kpiContainers[instanceId];
  const kpiOrderInStore = kpis?.order ?? [];
  const newOrder = state.draft.order.flatMap((k) =>
    k === instanceKey ? [...kpiOrderInStore] : [k]
  );
  state.setDraftOrder(newOrder);
  state.removeDraftKpiContainerInstance(instanceId);
}

export function KpiContainer({
  instanceKey,
  viewModel,
  config,
  t,
  intlLocale,
  isEditing,
}: KpiContainerProps) {
  const { token } = theme.useToken();
  const instanceId = parseContainerInstanceKey(instanceKey) ?? instanceKey;

  const editDraftKpiContainers = useStore(
    dashboardEditModeStore,
    useShallow((s) => s.draft.kpiContainers)
  );
  const setDraftKpiContainerConfig = useStore(
    dashboardEditModeStore,
    (s) => s.setDraftKpiContainerConfig
  );

  const persistedInstances = useStore(shellPreferencesStore, (s) => s.kpiContainerInstances);
  const setPersistedInstanceConfig = useStore(
    shellPreferencesStore,
    (s) => s.setKpiContainerInstanceConfig
  );

  const instances = isEditing ? editDraftKpiContainers : persistedInstances;
  const setInstanceConfig = isEditing ? setDraftKpiContainerConfig : setPersistedInstanceConfig;

  const instanceCfg = instances[instanceId];
  const kpiOrder = instanceCfg?.order ?? [];
  const kpiColumns = instanceCfg?.columns ?? 3;

  const kpiRegistry = useMemo(() => {
    const map = new Map<string, DashboardWidgetMeta>();
    for (const w of DASHBOARD_WIDGETS) {
      if (KPI_WIDGET_KEYS.includes(w.key)) {
        map.set(w.key, w);
      }
    }
    return map;
  }, []);

  const isKpiEligible = useCallback(
    (key: string) => {
      const widget = DASHBOARD_WIDGETS.find((w) => w.key === key);
      return widget ? widget.isEligible(viewModel) : false;
    },
    [viewModel]
  );

  // Resolve ordered KPIs (only show eligible ones)
  const visibleKpis = kpiOrder
    .map((key) => kpiRegistry.get(key))
    .filter((k): k is DashboardWidgetMeta => !!k && isKpiEligible(k.key));

  // Determine which KPIs are NOT in this container and are eligible (for the "add" picker)
  const kpiKeysInContainer = new Set(kpiOrder);
  const availableKpiKeys = KPI_WIDGET_KEYS.filter(
    (k) => !kpiKeysInContainer.has(k) && isKpiEligible(k)
  );

  // --- Internal DnD for reordering KPIs inside the container ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  const handleKpiDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeId = String(event.active.id);
      const overId = event.over ? String(event.over.id) : null;
      if (!overId || activeId === overId) return;

      const current = [...kpiOrder];
      const oldIndex = current.indexOf(activeId);
      const newIndex = current.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        current.splice(oldIndex, 1);
        current.splice(newIndex, 0, activeId);
        setInstanceConfig(instanceId, { order: current });
      }
    },
    [kpiOrder, setInstanceConfig, instanceId]
  );

  // --- Add a KPI to this container from the available picker ---
  const handleAddKpi = useCallback(
    (kpiKey: string) => {
      addKpiViaEditMode(instanceId, kpiKey);
    },
    [instanceId]
  );

  // --- Remove a KPI from this container (adds back to the grid) ---
  const handleRemoveKpi = useCallback(
    (kpiKey: string) => {
      removeKpiViaEditMode(instanceId, instanceKey, kpiKey);
    },
    [instanceId, instanceKey]
  );

  // --- Remove the entire container instance ---
  const handleRemoveContainer = useCallback(() => {
    removeContainerViaEditMode(instanceId, instanceKey);
  }, [instanceId, instanceKey]);

  const revealDelayMs = 100;

  // Content: KPI tiles or empty state
  const renderKpiContent = () => {
    if (visibleKpis.length === 0) {
      return (
        <Flex align="center" justify="center" className="wp-react-ui-kpi-container__empty">
          {isEditing
            ? t("This container is empty — pick a KPI above to add it.")
            : t("No KPIs inside this container")}
        </Flex>
      );
    }

    return (
      <div
        className="wp-react-ui-kpi-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${kpiColumns}, minmax(0, 1fr))`,
          gap: 12,
        }}
      >
        {visibleKpis.map((kpi, index) =>
          isEditing ? (
            <DraggableKpiTile
              key={kpi.key}
              kpi={kpi}
              index={index}
              isEditing={isEditing}
              handleRemoveKpi={handleRemoveKpi}
              revealDelayMs={revealDelayMs}
              viewModel={viewModel}
              config={config}
              t={t}
              intlLocale={intlLocale}
            />
          ) : (
            <div key={kpi.key} className="wp-react-ui-kpi-grid__item" style={{ minWidth: 0 }}>
              <div
                className="wp-react-ui-dashboard-reveal"
                style={
                  {
                    "--dashboard-reveal-delay": `${revealDelayMs + index * 30}ms`,
                    minWidth: 0,
                  } as React.CSSProperties
                }
              >
                {renderWidgetFromRegistry(kpi, { viewModel, config, t, intlLocale })}
              </div>
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <div
      className={`wp-react-ui-kpi-container${isEditing ? " wp-react-ui-kpi-container--editing" : ""}`}
    >
      {/* Chrome — only visible in edit mode */}
      {isEditing && (
        <Flex align="center" justify="space-between" style={{ marginBottom: 8 }}>
          <Flex align="center" gap={8}>
            <AppstoreOutlined style={{ fontSize: 16, color: token.colorTextSecondary }} />
            <Text strong style={{ fontSize: 14 }}>
              {t("KPI Container")}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              #{instanceId === "__default__" ? "1" : instanceId.replace(/^instance-/, "")}
            </Text>
          </Flex>
          <Flex align="center" gap={6}>
            <Segmented
              size="small"
              options={COLUMN_OPTIONS}
              value={kpiColumns}
              onChange={(val) =>
                setInstanceConfig(instanceId, { columns: val as KpiContainerColumns })
              }
              aria-label={t("Columns")}
            />
            <button
              type="button"
              className="wp-react-ui-kpi-container__remove"
              onClick={handleRemoveContainer}
              aria-label={t("Remove container")}
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: token.colorTextTertiary,
                flexShrink: 0,
              }}
            >
              <CloseOutlined style={{ fontSize: 12 }} />
            </button>
          </Flex>
        </Flex>
      )}

      {/* KPI picker — prominent panel of "Add KPI" buttons in edit mode */}
      {isEditing && availableKpiKeys.length > 0 && (
        <div className="wp-react-ui-kpi-picker">
          <Flex align="center" justify="space-between" gap={8} wrap>
            <Flex align="center" gap={6}>
              <PlusOutlined style={{ fontSize: 12, color: token.colorTextSecondary }} />
              <Text strong style={{ fontSize: 12 }}>
                {t("Add KPI cards to this container")}
              </Text>
            </Flex>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {t("{n} available", { n: availableKpiKeys.length })}
            </Text>
          </Flex>
          <Flex wrap="wrap" gap={6} style={{ marginTop: 10 }}>
            {availableKpiKeys.map((kpiKey) => {
              const kpi = kpiRegistry.get(kpiKey);
              if (!kpi) return null;
              return (
                <Button
                  key={kpiKey}
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => handleAddKpi(kpiKey)}
                  className="wp-react-ui-kpi-picker__btn"
                >
                  {kpi.label}
                </Button>
              );
            })}
          </Flex>
        </div>
      )}

      {/* Inner DnD for KPI reordering (only when editing and has KPIs) */}
      {isEditing && visibleKpis.length > 1 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleKpiDragEnd}
        >
          {renderKpiContent()}
        </DndContext>
      ) : (
        renderKpiContent()
      )}
    </div>
  );
}
