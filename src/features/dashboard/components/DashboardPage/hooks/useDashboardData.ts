import { useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { createT, localeToIntl } from "../../../../../utils/i18n";
import { useShellConfig } from "../../../../shell/context/ShellConfigContext";
import { createDashboardViewModel } from "../../../dashboardViewModel";
import { loadDashboard } from "../../../store/dashboardActions";
import { dashboardStore } from "../../../store/dashboardStore";

const CHECKLIST_CLOSED_KEY = "wp-react-ui-checklist-closed";

export function useDashboardData() {
  const config = useShellConfig();
  const data = useStore(dashboardStore, (s) => s.data);
  const loading = useStore(dashboardStore, (s) => s.loading);
  const intlLocale = useMemo(() => localeToIntl(config.locale ?? "en_US"), [config.locale]);
  const t = useMemo(() => createT(config.locale ?? "en_US"), [config.locale]);

  const [checklistClosed, setChecklistClosed] = useState(
    () => localStorage.getItem(CHECKLIST_CLOSED_KEY) === "1"
  );

  useEffect(() => {
    void loadDashboard();
  }, []);

  const closeChecklist = () => {
    localStorage.setItem(CHECKLIST_CLOSED_KEY, "1");
    setChecklistClosed(true);
  };

  const viewModel = useMemo(
    () => createDashboardViewModel(data, checklistClosed),
    [checklistClosed, data]
  );

  return {
    config,
    t,
    intlLocale,
    loading,
    data,
    ...viewModel,
    closeChecklist,
  };
}
