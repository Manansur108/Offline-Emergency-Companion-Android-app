import { newMessage, type ChatMessage } from './aiEngine';
import { isRecord, readJson, removeStorageItem, writeJson } from './storage';

const CHAT_HISTORY_KEY = 'ai-offline-base.chat-history';
const CHAT_DRAFT_KEY = 'ai-offline-base.chat-draft';
const CHAT_ATTACHMENTS_KEY = 'ai-offline-base.chat-attachments';
const MAX_CHAT_MESSAGES = 80;

const welcomeMessage = newMessage(
  'assistant',
  'Offline AI Base is ready. Add a task and the Android build will route it to the local Gemma LiteRT-LM model.',
);

export function loadChatMessages(): ChatMessage[] {
  const messages = readJson<ChatMessage[]>(CHAT_HISTORY_KEY, [], isChatMessageArray);
  return messages.length > 0 ? messages : [welcomeMessage];
}

export function saveChatMessages(messages: ChatMessage[]): void {
  writeJson(CHAT_HISTORY_KEY, messages.slice(-MAX_CHAT_MESSAGES));
}

export function clearChatMessages(): ChatMessage[] {
  removeStorageItem(CHAT_HISTORY_KEY);
  removeStorageItem(CHAT_DRAFT_KEY);
  removeStorageItem(CHAT_ATTACHMENTS_KEY);
  return [newMessage('assistant', welcomeMessage.content)];
}

export function loadChatDraft(): string {
  return readJson<string>(CHAT_DRAFT_KEY, '', (value): value is string => typeof value === 'string');
}

export function saveChatDraft(value: string): void {
  writeJson(CHAT_DRAFT_KEY, value);
}

export function clearChatDraft(): void {
  removeStorageItem(CHAT_DRAFT_KEY);
  removeStorageItem(CHAT_ATTACHMENTS_KEY);
}

export interface ChatDraftAttachment {
  id: string;
  name: string;
  type: string;
  sizeBytes: number;
  kind: 'image' | 'video' | 'audio' | 'text' | 'file';
  textPreview?: string;
}

export function loadChatAttachments(): ChatDraftAttachment[] {
  return readJson<ChatDraftAttachment[]>(CHAT_ATTACHMENTS_KEY, [], isChatDraftAttachmentArray);
}

export function saveChatAttachments(attachments: ChatDraftAttachment[]): void {
  writeJson(CHAT_ATTACHMENTS_KEY, attachments);
}

function isChatMessageArray(value: unknown): value is ChatMessage[] {
  return Array.isArray(value) && value.every(isChatMessage);
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    (value.role === 'user' || value.role === 'assistant') &&
    typeof value.content === 'string' &&
    typeof value.createdAt === 'string'
  );
}

function isChatDraftAttachmentArray(value: unknown): value is ChatDraftAttachment[] {
  return Array.isArray(value) && value.every(isChatDraftAttachment);
}

function isChatDraftAttachment(value: unknown): value is ChatDraftAttachment {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.type === 'string' &&
    typeof value.sizeBytes === 'number' &&
    ['image', 'video', 'audio', 'text', 'file'].includes(String(value.kind)) &&
    (typeof value.textPreview === 'string' || typeof value.textPreview === 'undefined')
  );
}
