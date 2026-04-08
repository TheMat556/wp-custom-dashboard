function getWpWindow(): Record<string, unknown> | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window as unknown as Record<string, unknown>;
}

export interface NativeCommand {
  name: string;
  label: string;
  searchLabel?: string;
  keywords?: string[];
  callback: (payload?: { close?: () => void }) => void;
}

interface NativeCommandDispatcher {
  open?: () => void;
  registerCommand?: (command: NativeCommand) => void;
  unregisterCommand?: (name: string) => void;
}

interface NativeCommandSelector {
  isOpen?: () => boolean;
}

function getNativeCommandDispatcher(): NativeCommandDispatcher | null {
  const wpWindow = getWpWindow();
  if (!wpWindow) {
    return null;
  }

  const wp = wpWindow.wp as
    | {
        data?: {
          dispatch?: (storeName: string) => NativeCommandDispatcher | undefined;
        };
      }
    | undefined;

  try {
    return wp?.data?.dispatch?.("core/commands") ?? null;
  } catch {
    return null;
  }
}

function getNativeCommandSelector(): NativeCommandSelector | null {
  const wpWindow = getWpWindow();
  if (!wpWindow) {
    return null;
  }

  const wp = wpWindow.wp as
    | {
        data?: {
          select?: (storeName: string) => NativeCommandSelector | undefined;
        };
      }
    | undefined;

  try {
    return wp?.data?.select?.("core/commands") ?? null;
  } catch {
    return null;
  }
}

export function hasNativeCommandPalette(): boolean {
  const wpWindow = getWpWindow();
  const dispatcher = getNativeCommandDispatcher();
  const selector = getNativeCommandSelector();

  if (!wpWindow || !dispatcher || !selector) {
    return false;
  }

  const wp = wpWindow.wp as Record<string, unknown> | undefined;
  if (!wp?.commands) {
    return false;
  }

  try {
    return typeof dispatcher?.open === "function" && typeof selector?.isOpen === "function";
  } catch {
    return false;
  }
}

export function openNativeCommandPalette(): boolean {
  if (!hasNativeCommandPalette()) {
    return false;
  }

  try {
    getNativeCommandDispatcher()?.open?.();
    return true;
  } catch {
    return false;
  }
}

export function registerNativeCommand(command: NativeCommand): boolean {
  if (!hasNativeCommandPalette()) {
    return false;
  }

  try {
    getNativeCommandDispatcher()?.registerCommand?.(command);
    return true;
  } catch {
    return false;
  }
}

export function unregisterNativeCommand(name: string): boolean {
  if (!hasNativeCommandPalette()) {
    return false;
  }

  try {
    getNativeCommandDispatcher()?.unregisterCommand?.(name);
    return true;
  } catch {
    return false;
  }
}
