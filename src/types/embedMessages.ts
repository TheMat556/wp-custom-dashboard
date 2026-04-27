export const EMBED_MESSAGE_SOURCE = "wp-shell-embed";
export const EMBED_MESSAGE_VERSION = 1 as const;

interface EmbedMessageBase {
  source: typeof EMBED_MESSAGE_SOURCE;
  version: typeof EMBED_MESSAGE_VERSION;
}

export interface EmbedPageReadyMessage extends EmbedMessageBase {
  type: "page-ready";
  url: string;
  title: string;
}

export interface EmbedTitleChangeMessage extends EmbedMessageBase {
  type: "title-change";
  title: string;
}

export interface EmbedBreakoutMessage extends EmbedMessageBase {
  type: "breakout";
  url: string;
}

export interface EmbedSessionExpiredMessage extends EmbedMessageBase {
  type: "session-expired";
}

export interface EmbedOverlayStateMessage extends EmbedMessageBase {
  type: "overlay-state";
  active: boolean;
}

export type EmbedMessage =
  | EmbedPageReadyMessage
  | EmbedTitleChangeMessage
  | EmbedBreakoutMessage
  | EmbedSessionExpiredMessage
  | EmbedOverlayStateMessage;

/**
 * Compile-time exhaustiveness sentinel. Pass to the `default` branch of a
 * switch over `EmbedMessage` so TypeScript reports an error when a new
 * message type is added without a corresponding handler.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled EmbedMessage type: ${(value as { type: string }).type}`);
}

export function isEmbedMessage(value: unknown): value is EmbedMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Record<string, unknown>;

  if (
    message.source !== EMBED_MESSAGE_SOURCE ||
    message.version !== EMBED_MESSAGE_VERSION ||
    typeof message.type !== "string"
  ) {
    return false;
  }

  switch (message.type) {
    case "page-ready":
      return typeof message.url === "string" && typeof message.title === "string";
    case "title-change":
      return typeof message.title === "string";
    case "breakout":
      return typeof message.url === "string";
    case "session-expired":
      return true;
    case "overlay-state":
      return typeof message.active === "boolean";
    default:
      return false;
  }
}
