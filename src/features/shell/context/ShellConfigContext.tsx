import { createContext, type ReactNode, useContext } from "react";
import type { WpReactUiConfig } from "../../../types/wp";

const ShellConfigContext = createContext<Readonly<WpReactUiConfig> | null>(null);

export function ShellConfigProvider({
  config,
  children,
}: {
  config: Readonly<WpReactUiConfig>;
  children: ReactNode;
}) {
  return <ShellConfigContext.Provider value={config}>{children}</ShellConfigContext.Provider>;
}

export function useShellConfig(): Readonly<WpReactUiConfig> {
  const config = useContext(ShellConfigContext);

  if (!config) {
    throw new Error("useShellConfig must be used inside ShellConfigProvider");
  }

  return config;
}
