// Activity feature public API
// NOTE: ActivityLogPanel is intentionally NOT re-exported here so the
// `lazy(() => import(".../ActivityLogPanel"))` in the navbar stays in its
// own chunk. Re-exporting would force it into the main chunk.
export type { ActivityState } from "./store/activityStore";
export { activityStore, bootstrapActivityStore, resetActivityStore } from "./store/activityStore";
