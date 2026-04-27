import { z } from "zod";
import type {
  ChatBootstrapResponse,
  ChatPollResponse,
  ChatSendResponse,
} from "../../../generated/contracts/dto";

const ChatThreadSchema = z.object({
  id: z.number(),
  domain: z.string(),
  customerName: z.string().nullable(),
  customerEmail: z.string().nullable(),
  status: z.enum(["open", "closed"]),
  lastMessagePreview: z.string().nullable(),
  lastMessageAt: z.string(),
  createdAt: z.string(),
});

const ChatMessageSchema = z.object({
  id: z.number(),
  authorRole: z.enum(["owner", "customer", "system"]),
  authorName: z.string(),
  message: z.string(),
  createdAt: z.string(),
});

export const ChatBootstrapResponseSchema = z.object({
  role: z.enum(["owner", "customer"]),
  threads: z.array(ChatThreadSchema),
  selectedThreadId: z.number().nullable(),
  messages: z.array(ChatMessageSchema),
  pollIntervalSeconds: z.number(),
});

export const ChatPollResponseSchema = z.object({
  role: z.enum(["owner", "customer"]),
  threads: z.array(ChatThreadSchema),
  selectedThreadId: z.number(),
  messages: z.array(ChatMessageSchema),
  pollIntervalSeconds: z.number(),
});

export const ChatSendResponseSchema = z.object({
  role: z.enum(["owner", "customer"]),
  thread: ChatThreadSchema,
  message: ChatMessageSchema,
});

// Compile-time structural compatibility checks
type _BootstrapCheck =
  z.infer<typeof ChatBootstrapResponseSchema> extends ChatBootstrapResponse ? true : never;
const _bootstrapCheck: _BootstrapCheck = true;
void _bootstrapCheck;

type _PollCheck = z.infer<typeof ChatPollResponseSchema> extends ChatPollResponse ? true : never;
const _pollCheck: _PollCheck = true;
void _pollCheck;

type _SendCheck = z.infer<typeof ChatSendResponseSchema> extends ChatSendResponse ? true : never;
const _sendCheck: _SendCheck = true;
void _sendCheck;
