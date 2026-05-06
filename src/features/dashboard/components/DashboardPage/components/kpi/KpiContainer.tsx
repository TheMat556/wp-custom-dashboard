import { AppstoreOutlined, CloseOutlined, HolderOutlined, PlusOutlined } from "@ant-design/icons";
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button, Flex, Segmented, Typography, theme } from "antd";
import { useCallback, useState } from "react";
import { useStore } from "zustand";
import type { KpiContainerColumns } from "../../../../../../types/shellPreferences";
import { shellPreferencesStore } from "../../../../../shell/store/shellPreferencesStore";
import type { DashboardViewModel } from "../../../../dashboardViewModel";
import { KPI_WIDGET_KEYS } from "../../../../widgets/widgetRegistry";
import { KpiBackup } from "./KpiBackup";
import { KpiBookings } from "./KpiBookings";
import { KpiContent } from "./KpiContent";
import { KpiConversions } from "./KpiConversions";
import { KpiEmail } from "./KpiEmail";
import { KpiLegal } from "./KpiLegal";
import { KpiReadiness } from "./KpiReadiness";
import { KpiSeoScore } from "./KpiSeoScore";
import { KpiSpeed } from "./KpiSpeed";
import { KpiUpdates } from "./KpiUpdates";
import { KpiVisitors } from "./KpiVisitors";
import { KpiWebsite } from "./KpiWebsite";

const { Text } = Typography;

interface KpiDescriptor {
  key: string;
  label: string;
  render: (props: {
    viewModel: DashboardViewModel;
    config: { adminUrl: string };
    t: (key: string, vars?: Record<string, string | number>) => string;
    intlLocale: string;
  }) => React.ReactNode;
}

const ALL_KPIS: Record<string, KpiDescriptor> = {
  "kpi-website": {
    key: "kpi-website",
    label: "Website status",
    render: ({ viewModel, config, t }) => (
      <KpiWebsite
        isSiteDown={viewModel.isSiteDown}
        health={viewModel.health}
        speed={viewModel.speed}
        t={t}
        adminUrl={config.adminUrl}
      />
    ),
  },
  "kpi-visitors": {
    key: "kpi-visitors",
    label: "Visitors (30d)",
    render: ({ viewModel, t, intlLocale }) => (
      <KpiVisitors
        total30Views={viewModel.total30Views}
        viewTrend={viewModel.viewTrend}
        t={t}
        intlLocale={intlLocale}
      />
    ),
  },
  "kpi-updates": {
    key: "kpi-updates",
    label: "Updates",
    render: ({ viewModel, t, intlLocale, config }) => (
      <KpiUpdates
        updates={viewModel.updates}
        hasUpdates={viewModel.hasUpdates}
        t={t}
        intlLocale={intlLocale}
        adminUrl={config.adminUrl}
      />
    ),
  },
  "kpi-speed": {
    key: "kpi-speed",
    label: "Speed",
    render: ({ viewModel, t }) => (
      <KpiSpeed isSiteDown={viewModel.isSiteDown} speed={viewModel.speed} t={t} />
    ),
  },
  "kpi-conversions": {
    key: "kpi-conversions",
    label: "Conversions (30d)",
    render: ({ viewModel, t }) => (
      <KpiConversions submissionStats={viewModel.submissionStats} t={t} />
    ),
  },
  "kpi-backup": {
    key: "kpi-backup",
    label: "Backup",
    render: ({ viewModel, t }) => (
      <KpiBackup lastBackupDate={viewModel.stats?.lastBackupDate} t={t} />
    ),
  },
  "kpi-seo-score": {
    key: "kpi-seo-score",
    label: "SEO Score",
    render: ({ viewModel, t }) => (
      <KpiSeoScore seoBasics={viewModel.seoBasics} seo={viewModel.seo} t={t} />
    ),
  },
  "kpi-content": {
    key: "kpi-content",
    label: "Content",
    render: ({ viewModel, t }) => <KpiContent stats={viewModel.stats} t={t} />,
  },
  "kpi-legal": {
    key: "kpi-legal",
    label: "Legal",
    render: ({ viewModel, t }) => <KpiLegal legalData={viewModel.legalData} t={t} />,
  },
  "kpi-email": {
    key: "kpi-email",
    label: "Email",
    render: ({ viewModel, t }) => <KpiEmail bizData={viewModel.bizData} t={t} />,
  },
  "kpi-readiness": {
    key: "kpi-readiness",
    label: "Readiness",
    render: ({ viewModel, t }) => <KpiReadiness readiness={viewModel.readiness} t={t} />,
  },
  "kpi-bookings": {
    key: "kpi-bookings",
    label: "Today's Bookings",
    render: ({ viewModel, t }) => <KpiBookings calendar={viewModel.calendar} t={t} />,
  },
};

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

function parseInstanceId(instanceKey: string): string {
  const prefix = "kpi-container::";
  if (instanceKey.startsWith(prefix)) return instanceKey.slice(prefix.length);
  return instanceKey;
}

// ── DraggableKpiTile — extracted to module level to prevent DnD breakage ──

interface DraggableKpiTileProps {
  kpi: KpiDescriptor;
  index: number;
  isEditing: boolean;
  handleRemoveKpi: (kpiKey: string) => void;
  revealDelayMs: number;
  viewModel: DashboardViewModel;
  config: { adminUrl: string };
  t: (key: string, vars?: Record<string, string | number>) => string;
  intlLocale: string;
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
    disabled: !isEditing,
  });
  const { setNodeRef: setDropRef, isOver: isOverTile } = useDroppable({
    id: kpi.key,
    disabled: !isEditing,
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
          aria-label={`Drag ${kpi.label} to reorder`}
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            zIndex: 5,
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: "1px solid var(--color-border-subtle)",
            background: "var(--color-bg-surface)",
            cursor: "grab",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-muted)",
            fontSize: 11,
            touchAction: "none",
          }}
        >
          <HolderOutlined />
        </span>
      )}

      {/* Remove from container button in edit mode */}
      {isEditing && (
        <button
          type="button"
          onClick={() => handleRemoveKpi(kpi.key)}
          aria-label={`Remove ${kpi.label} from container`}
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            zIndex: 5,
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: "none",
            background: "var(--color-bg-elevated)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-tertiary)",
            boxShadow: "var(--shadow-tertiary)",
            fontSize: 11,
          }}
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
        {kpi.render({ viewModel, config, t, intlLocale })}
      </div>
    </div>
  );
}

// ── KpiContainer ──

export function KpiContainer({
  instanceKey,
  viewModel,
  config,
  t,
  intlLocale,
  isEditing,
}: KpiContainerProps) {
  const { token } = theme.useToken();
  const instanceId = parseInstanceId(instanceKey);

  const instances = useStore(shellPreferencesStore, (s) => s.kpiContainerInstances);
  const setInstanceConfig = useStore(shellPreferencesStore, (s) => s.setKpiContainerInstanceConfig);

  const instanceCfg = instances[instanceId];
  const kpiOrder = instanceCfg?.order ?? [];
  const kpiColumns = instanceCfg?.columns ?? 3;

  // Resolve ordered KPIs
  const visibleKpis = kpiOrder.map((key) => ALL_KPIS[key]).filter((k): k is KpiDescriptor => !!k);

  // Determine which KPIs are NOT in this container (for the "add" picker)
  const kpiKeysInContainer = new Set(kpiOrder);
  const availableKpiKeys = KPI_WIDGET_KEYS.filter((k) => !kpiKeysInContainer.has(k));

  // --- Internal DnD for reordering KPIs inside the container ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  // --- Inner DnD: handle drag start for KPI tiles ---
  const handleKpiDragStart = useCallback((event: DragStartEvent) => {
    setActiveKpiKey(String(event.active.id));
  }, []);

  const handleKpiDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveKpiKey(null);
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
      const state = shellPreferencesStore.getState();
      const current = state.kpiContainerInstances[instanceId];
      const currentOrder = current?.order ?? [];
      if (currentOrder.includes(kpiKey)) return;
      const next = [...currentOrder, kpiKey];
      state.setKpiContainerInstanceConfig(instanceId, { order: next });
      // Remove from grid order if present
      const filteredGrid = state.dashboardWidgetOrder.filter((k) => k !== kpiKey);
      if (filteredGrid.length !== state.dashboardWidgetOrder.length) {
        state.setDashboardWidgetOrder(filteredGrid);
      }
    },
    [instanceId]
  );

  // --- Remove a KPI from this container (adds back to the grid) ---
  const handleRemoveKpi = useCallback(
    (kpiKey: string) => {
      const state = shellPreferencesStore.getState();
      const current = state.kpiContainerInstances[instanceId];
      const currentOrder = current?.order ?? [];
      const next = currentOrder.filter((k) => k !== kpiKey);
      state.setKpiContainerInstanceConfig(instanceId, { order: next });
      // Add back to the grid order (after the container)
      const containerIdx = state.dashboardWidgetOrder.indexOf(instanceKey);
      if (containerIdx !== -1) {
        const newOrder = [...state.dashboardWidgetOrder];
        newOrder.splice(containerIdx + 1, 0, kpiKey);
        state.setDashboardWidgetOrder(newOrder);
      }
    },
    [instanceId, instanceKey]
  );

  // --- Remove the entire container instance ---
  const handleRemoveContainer = useCallback(() => {
    const state = shellPreferencesStore.getState();
    const kpis = state.kpiContainerInstances[instanceId];
    const kpiOrderInStore = kpis?.order ?? [];
    // Move all KPIs back to the grid before removing
    const newOrder = [...state.dashboardWidgetOrder];
    const containerIdx = newOrder.indexOf(instanceKey);
    if (containerIdx !== -1) {
      newOrder.splice(containerIdx, 1);
      // Insert all KPIs from the container right after where it was
      kpiOrderInStore.forEach((kpiKey: string, i: number) => {
        newOrder.splice(containerIdx + i, 0, kpiKey);
      });
      state.setDashboardWidgetOrder(newOrder);
    }
    state.removeKpiContainerInstance(instanceId);
  }, [instanceId, instanceKey]);

  const [, setActiveKpiKey] = useState<string | null>(null);

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
                {kpi.render({ viewModel, config, t, intlLocale })}
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
              #{instanceId === "__default__" ? "1" : instanceId.replace("inst_", "")}
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
              const kpi = ALL_KPIS[kpiKey];
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
          onDragStart={handleKpiDragStart}
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
