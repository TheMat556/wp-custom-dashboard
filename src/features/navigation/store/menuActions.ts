import { createMenuService, type MenuService } from "../services/menuApi";
import type { WpReactUiConfig } from "../../../types/wp";
import { menuStore } from "./menuStore";

let _service: MenuService | null = null;

export function initMenuService(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">,
  service?: MenuService,
) {
  _service = service ?? createMenuService(config);
}

export function clearMenuService() {
  _service = null;
}

export async function refreshMenu() {
  menuStore.setState({ loading: true });
  try {
    const items = _service ? await _service.fetchMenu() : menuStore.getState().items;
    menuStore.setState({ items, loading: false });
  } catch (error) {
    console.error("[WP React UI] Menu refresh failed:", error);
    menuStore.setState({ loading: false });
  }
}
