import { useEffect, useMemo } from "react";
import { useStore } from "zustand";
import { useShellConfig } from "../context/ShellConfigContext";
import { useTheme } from "../context/ThemeContext";
import { useMenu } from "../hooks/useMenu";
import { navigationStore } from "../store/navigationStore";
import { shellPreferencesStore } from "../store/shellPreferencesStore";
import {
  hasNativeCommandPalette,
  registerNativeCommand,
  unregisterNativeCommand,
  type NativeCommand,
} from "../utils/nativeCommandPalette";
import { buildNativeShellCommandDescriptors } from "../utils/commandPalette";

export function NativeCommandPaletteEnhancer() {
  const { adminUrl } = useShellConfig();
  const { theme, toggle } = useTheme();
  const { menuItems } = useMenu();
  const favorites = useStore(shellPreferencesStore, (state) => state.favorites);
  const recentPages = useStore(shellPreferencesStore, (state) => state.recentPages);

  const commands = useMemo<NativeCommand[]>(() => {
    const descriptors = buildNativeShellCommandDescriptors({
      menuItems,
      adminUrl,
      favorites,
      recentPages,
      currentTheme: theme,
    });

    return descriptors.map((descriptor) => ({
      name: descriptor.name,
      label: descriptor.label,
      searchLabel: descriptor.searchLabel,
      keywords: descriptor.keywords,
      callback: ({ close } = {}) => {
        close?.();

        if (descriptor.action === "toggle-theme") {
          toggle();
          return;
        }

        if (descriptor.url) {
          navigationStore.getState().navigate(descriptor.url);
        }
      },
    }));
  }, [menuItems, adminUrl, favorites, recentPages, theme, toggle]);

  useEffect(() => {
    if (!hasNativeCommandPalette()) {
      return;
    }

    commands.forEach((command) => {
      registerNativeCommand(command);
    });

    return () => {
      commands.forEach((command) => {
        unregisterNativeCommand(command.name);
      });
    };
  }, [commands]);

  return null;
}
