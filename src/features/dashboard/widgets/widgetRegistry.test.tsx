import { describe, expect, it } from "vitest";
import type { DashboardViewModel } from "../dashboardViewModel";
import {
  DASHBOARD_WIDGETS,
  DEFAULT_WIDGET_ORDER,
  getHiddenWidgets,
  getVisibleWidgets,
  KPI_CONTAINER_INSTANCE_PREFIX,
  KPI_WIDGET_KEYS,
  LEGACY_WIDGET_REPLACEMENTS,
  mergeWidgetOrder,
  TEMPLATE_REWRITES,
} from "./widgetRegistry";

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

describe("widgetRegistry", () => {
  describe("DASHBOARD_WIDGETS", () => {
    it("has all required fields for each widget", () => {
      for (const widget of DASHBOARD_WIDGETS) {
        expect(widget.key).toBeTruthy();
        expect(widget.label).toBeTruthy();
        expect(widget.defaultSize).toMatch(/^(1x|2x|half|full)$/);
        expect(widget.allowedSizes.length).toBeGreaterThan(0);
        expect(typeof widget.hidableByUser).toBe("boolean");
        expect(typeof widget.isEligible).toBe("function");
        expect(typeof widget.render).toBe("function");
      }
    });

    it("has unique keys", () => {
      const keys = DASHBOARD_WIDGETS.map((w) => w.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it("has valid allowedSizes", () => {
      for (const widget of DASHBOARD_WIDGETS) {
        for (const size of widget.allowedSizes) {
          expect(["1x", "2x", "half", "full"]).toContain(size);
        }
      }
    });

    it("includes both the KPI container and individual KPI widgets", () => {
      const container = DASHBOARD_WIDGETS.find((x) => x.key === "kpi-container");
      expect(container).toBeDefined();
      expect(container?.defaultSize).toBe("full");
      expect(container?.allowedSizes).toEqual(["full"]);
      // Individual KPIs should ALSO exist as top-level widgets
      const kpiKeys = [
        "kpi-website",
        "kpi-visitors",
        "kpi-updates",
        "kpi-speed",
        "kpi-conversions",
      ];
      for (const key of kpiKeys) {
        const w = DASHBOARD_WIDGETS.find((x) => x.key === key);
        expect(w).toBeDefined();
        expect(w?.defaultSize).toBe("1x");
        expect(w?.allowedSizes).toEqual(["1x", "2x"]);
      }
    });

    it("does not contain the legacy summary-tiles key", () => {
      expect(DASHBOARD_WIDGETS.find((w) => w.key === "summary-tiles")).toBeUndefined();
    });

    it("kpi-container is always eligible", () => {
      const container = DASHBOARD_WIDGETS.find((x) => x.key === "kpi-container");
      expect(container).toBeDefined();
      expect(container?.isEligible(emptyVm)).toBe(true);
    });

    it("kpi-conversions is only eligible when submissionStats is present", () => {
      const w = DASHBOARD_WIDGETS.find((x) => x.key === "kpi-conversions");
      expect(w).toBeDefined();
      expect(w?.isEligible({ ...emptyVm, submissionStats: null })).toBe(false);
      expect(
        w?.isEligible({
          ...emptyVm,
          submissionStats: {
            formSubmissions30d: 5,
            bookings30d: 0,
            formPlugin: "wpforms",
          } as DashboardViewModel["submissionStats"],
        })
      ).toBe(true);
    });

    it("always includes defaultSize in allowedSizes", () => {
      for (const widget of DASHBOARD_WIDGETS) {
        expect(widget.allowedSizes).toContain(widget.defaultSize);
      }
    });

    it("hero and offline-alert are full-only", () => {
      const hero = DASHBOARD_WIDGETS.find((w) => w.key === "hero");
      expect(hero).toBeDefined();
      expect(hero?.allowedSizes).toEqual(["full"]);
      expect(hero?.defaultSize).toBe("full");

      const offline = DASHBOARD_WIDGETS.find((w) => w.key === "offline-alert");
      expect(offline).toBeDefined();
      expect(offline?.allowedSizes).toEqual(["full"]);
      expect(offline?.defaultSize).toBe("full");
    });

    it("hero is not hidable by user", () => {
      const hero = DASHBOARD_WIDGETS.find((w) => w.key === "hero");
      expect(hero).toBeDefined();
      expect(hero?.hidableByUser).toBe(false);
    });

    it("offline-alert is not hidable by user", () => {
      const offline = DASHBOARD_WIDGETS.find((w) => w.key === "offline-alert");
      expect(offline).toBeDefined();
      expect(offline?.hidableByUser).toBe(false);
    });
  });

  describe("DEFAULT_WIDGET_ORDER", () => {
    it("excludes the bare kpi-container template key and individual KPI keys (KPIs live inside the container)", () => {
      const nonKpiNonContainerWidgets = DASHBOARD_WIDGETS.filter(
        (w) => w.key !== "kpi-container" && !KPI_WIDGET_KEYS.includes(w.key)
      );
      // +1 because the default container instance key is added in place of the template
      expect(DEFAULT_WIDGET_ORDER.length).toBe(nonKpiNonContainerWidgets.length + 1);
      for (const widget of nonKpiNonContainerWidgets) {
        expect(DEFAULT_WIDGET_ORDER).toContain(widget.key);
      }
      expect(DEFAULT_WIDGET_ORDER).not.toContain("kpi-container");
      for (const kpiKey of KPI_WIDGET_KEYS) {
        expect(DEFAULT_WIDGET_ORDER).not.toContain(kpiKey);
      }
    });

    it("includes the default KPI container instance key so the container renders for fresh users", () => {
      expect(DEFAULT_WIDGET_ORDER).toContain(`${KPI_CONTAINER_INSTANCE_PREFIX}__default__`);
    });
  });

  describe("mergeWidgetOrder", () => {
    it("returns default order when persisted is empty", () => {
      expect(mergeWidgetOrder([])).toEqual(DEFAULT_WIDGET_ORDER);
    });

    it("keeps valid persisted keys and appends missing default keys", () => {
      const result = mergeWidgetOrder(["traffic", "hero"]);
      expect(result[0]).toBe("traffic");
      expect(result[1]).toBe("hero");
      // All default keys should be present
      for (const key of DEFAULT_WIDGET_ORDER) {
        expect(result).toContain(key);
      }
    });

    it("filters out stale keys", () => {
      const result = mergeWidgetOrder(["non-existent", "hero"]);
      expect(result).not.toContain("non-existent");
      expect(result[0]).toBe("hero");
    });
  });

  describe("getVisibleWidgets", () => {
    it("filters out hidden widgets", () => {
      const visible = getVisibleWidgets(emptyVm, ["traffic"], DEFAULT_WIDGET_ORDER);
      expect(visible.find((w) => w.key === "traffic")).toBeUndefined();
    });

    it("does not hide non-hidable widgets even if in hidden list", () => {
      const visible = getVisibleWidgets(emptyVm, ["hero", "offline-alert"], DEFAULT_WIDGET_ORDER);
      // hero is not hidable — should remain visible even when in hidden list
      expect(visible.find((w) => w.key === "hero")).toBeDefined();
      // offline-alert is not hidable but also not eligible for empty vm — won't appear
      expect(visible.find((w) => w.key === "offline-alert")).toBeUndefined();
    });

    it("only returns eligible widgets", () => {
      const visible = getVisibleWidgets(emptyVm, [], DEFAULT_WIDGET_ORDER);
      // With empty viewModel, only always-eligible widgets should appear
      for (const widget of visible) {
        expect(widget.isEligible(emptyVm)).toBe(true);
      }
    });
  });

  describe("LEGACY_WIDGET_REPLACEMENTS", () => {
    it("maps summary-tiles to individual KPI keys", () => {
      expect(LEGACY_WIDGET_REPLACEMENTS["summary-tiles"]).toEqual([
        "kpi-website",
        "kpi-visitors",
        "kpi-updates",
        "kpi-speed",
        "kpi-conversions",
      ]);
    });

    it("TEMPLATE_REWRITES maps kpi-container to default instance", () => {
      expect(TEMPLATE_REWRITES["kpi-container"]).toBe("kpi-container::__default__");
    });
  });

  describe("KPI registry parity", () => {
    it("all KPI_WIDGET_KEYS have corresponding entries in DASHBOARD_WIDGETS", () => {
      const registryKeys = new Set(DASHBOARD_WIDGETS.map((w) => w.key));
      for (const key of KPI_WIDGET_KEYS) {
        expect(registryKeys.has(key)).toBe(true);
      }
    });

    it("all KPI widgets have isEligible function", () => {
      for (const key of KPI_WIDGET_KEYS) {
        const widget = DASHBOARD_WIDGETS.find((w) => w.key === key);
        expect(widget).toBeDefined();
        expect(typeof widget?.isEligible).toBe("function");
      }
    });
  });

  describe("getHiddenWidgets", () => {
    it("returns widgets that are in the hidden list and hidable", () => {
      const hidden = getHiddenWidgets(["traffic", "action-center"], DEFAULT_WIDGET_ORDER);
      expect(hidden.find((w) => w.key === "traffic")).toBeDefined();
      expect(hidden.find((w) => w.key === "action-center")).toBeDefined();
    });

    it("does not return non-hidable widgets (hero, offline-alert)", () => {
      const hidden = getHiddenWidgets(["hero", "offline-alert"], DEFAULT_WIDGET_ORDER);
      expect(hidden.find((w) => w.key === "hero")).toBeUndefined();
      expect(hidden.find((w) => w.key === "offline-alert")).toBeUndefined();
    });

    it("returns empty array when nothing is hidden", () => {
      expect(getHiddenWidgets([], DEFAULT_WIDGET_ORDER)).toEqual([]);
    });
  });
});
