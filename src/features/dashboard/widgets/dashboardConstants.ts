/**
 * Default order of KPI widgets inside KPI containers.
 *
 * Extracted to its own module to avoid circular dependencies:
 * widgetRegistry imports KpiContainer which imports edit mode stores,
 * and those stores need DEFAULT_KPI_CONTAINER_ORDER.
 */
export const DEFAULT_KPI_CONTAINER_ORDER = [
  "kpi-website",
  "kpi-visitors",
  "kpi-updates",
  "kpi-speed",
  "kpi-conversions",
];
