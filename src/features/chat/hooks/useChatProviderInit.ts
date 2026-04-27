import { useMemo } from "react";
import { createChatConversationService } from "../services/chatConversationApi";

interface UseChatProviderInitOptions {
  restUrl: string;
  nonce: string;
}

/**
 * Initializes and memoizes the chat conversation service.
 *
 * Returns the same service instance across renders unless restUrl or nonce changes.
 */
export function useChatProviderInit({ restUrl, nonce }: UseChatProviderInitOptions) {
  return useMemo(() => createChatConversationService({ restUrl, nonce }), [restUrl, nonce]);
}
