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

export type EmbedMessage =
  | EmbedPageReadyMessage
  | EmbedTitleChangeMessage
  | EmbedBreakoutMessage;

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
    default:
      return false;
  }
}
