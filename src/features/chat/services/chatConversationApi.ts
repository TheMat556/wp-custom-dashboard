import type {
  ChatBootstrapRequest,
  ChatBootstrapResponse,
  ChatPollRequest,
  ChatPollResponse,
  ChatSendRequest,
  ChatSendResponse,
} from "../../../generated/contracts/dto";
import {
  type ChatLongPollPayload,
  createPluginRouteApi,
} from "../../../shared/services/pluginRouteApi";
import { notifyApiErrorWithBody } from "../../../store/notificationStore";
import type { WpReactUiConfig } from "../../../types/wp";
import { logger } from "../../../utils/logger";
import {
  ChatBootstrapResponseSchema,
  ChatPollResponseSchema,
  ChatSendResponseSchema,
} from "./chatSchema";

export type ChatBootstrapInput = ChatBootstrapRequest;
export type ChatBootstrapData = ChatBootstrapResponse;
export type ChatPollInput = ChatPollRequest;
export type ChatPollData = ChatPollResponse;
export type ChatLongPollInput = ChatLongPollPayload & { signal?: AbortSignal };
export type ChatSendInput = ChatSendRequest;
export type ChatSendData = ChatSendResponse;

export interface ChatConversationService {
  fetchBootstrap(data: ChatBootstrapInput): Promise<ChatBootstrapData>;
  fetchPoll(data: ChatPollInput): Promise<ChatPollData>;
  longPoll(data: ChatLongPollInput): Promise<ChatPollData>;
  sendMessage(data: ChatSendInput): Promise<ChatSendData>;
}

export function createChatConversationService(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
): ChatConversationService {
  const api = createPluginRouteApi(config);

  return {
    async fetchBootstrap(data) {
      const res = await api.fetchChatBootstrap(data);

      if (!res.ok) {
        throw new Error(await notifyApiErrorWithBody(res, "Chat bootstrap"));
      }

      const raw = await res.json();
      const result = ChatBootstrapResponseSchema.safeParse(raw);
      if (!result.success) {
        logger.error("[chat-bootstrap] Unexpected API shape:", result.error.flatten());
        throw new Error("Unexpected response from chat bootstrap API");
      }
      return result.data;
    },

    async fetchPoll(data) {
      const res = await api.fetchChatPoll(data);

      if (!res.ok) {
        throw new Error(await notifyApiErrorWithBody(res, "Chat polling"));
      }

      const raw = await res.json();
      const result = ChatPollResponseSchema.safeParse(raw);
      if (!result.success) {
        logger.error("[chat-poll] Unexpected API shape:", result.error.flatten());
        throw new Error("Unexpected response from chat poll API");
      }
      return result.data;
    },

    async longPoll({ signal, ...data }) {
      const res = await api.longPollChat(data, signal);

      if (!res.ok) {
        throw new Error(await notifyApiErrorWithBody(res, "Chat long-poll"));
      }

      const raw = await res.json();
      const result = ChatPollResponseSchema.safeParse(raw);
      if (!result.success) {
        logger.error("[chat-long-poll] Unexpected API shape:", result.error.flatten());
        throw new Error("Unexpected response from chat long-poll API");
      }
      return result.data;
    },

    async sendMessage(data) {
      const res = await api.sendChatMessage(data);

      if (!res.ok) {
        throw new Error(await notifyApiErrorWithBody(res, "Chat send"));
      }

      const raw = await res.json();
      const result = ChatSendResponseSchema.safeParse(raw);
      if (!result.success) {
        logger.error("[chat-send] Unexpected API shape:", result.error.flatten());
        throw new Error("Unexpected response from chat send API");
      }
      return result.data;
    },
  };
}
