import { createStore } from "zustand/vanilla";
import type { WpReactUiConfig } from "../../../types/wp";

export interface SessionState {
  expired: boolean;
  checking: boolean;
  markExpired: () => void;
  dismiss: () => void;
  setChecking: (checking: boolean) => void;
}

export const sessionStore = createStore<SessionState>((set, get) => ({
  expired: false,
  checking: false,

  markExpired() {
    if (!get().expired) {
      set({ expired: true });
    }
  },

  dismiss() {
    set({ expired: false });
  },

  setChecking(checking) {
    set({ checking });
  },
}));

export function bootstrapSessionStore(_config: Pick<WpReactUiConfig, "nonce">) {
  resetSessionStore();
  return () => {};
}

export function resetSessionStore() {
  sessionStore.setState({ expired: false, checking: false });
}
