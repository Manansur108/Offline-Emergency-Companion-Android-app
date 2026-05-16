import { newMessage } from './aiEngine';
import { isRecord, readJson, removeStorageItem, writeJson } from './storage';
import type { ChatDraftAttachment, ChatMessage, ChatSession } from '../types/chat';

const CHAT_SESSIONS_KEY = 'ai-offline-base.chat-sessions';
const ACTIVE_CHAT_SESSION_KEY = 'ai-offline-base.active-chat-session';
const LEGACY_CHAT_HISTORY_KEY = 'ai-offline-base.chat-history';
const LEGACY_CHAT_DRAFT_KEY = 'ai-offline-base.chat-draft';
const LEGACY_CHAT_ATTACHMENTS_KEY = 'ai-offline-base.chat-attachments';
const MAX_MESSAGES_PER_SESSION = 120;

const welcomeContent =
  'Offline AI Base is ready. Add a task and the Android build will route it to the local Gemma LiteRT-LM model.';

export function createChatSession(title = 'New chat'): ChatSession {
  const now = new Date().toISOString();

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    pinned: false,
    createdAt: now,
    updatedAt: now,
    draft: '',
    attachments: [],
    messages: [newMessage('assistant', welcomeContent)],
  };
}

export function loadChatSessions(): ChatSession[] {
  const sessions = readJson<ChatSession[]>(CHAT_SESSIONS_KEY, [], isChatSessionArray);
  if (sessions.length > 0) {
    return sortSessions(sessions);
  }

  const migrated = migrateLegacyChat();
  saveChatSessions(migrated);
  return migrated;
}

export function saveChatSessions(sessions: ChatSession[]): void {
  writeJson(
    CHAT_SESSIONS_KEY,
    sortSessions(
      sessions.map((session) => ({
        ...session,
        messages: session.messages.slice(-MAX_MESSAGES_PER_SESSION),
        attachments: session.attachments.slice(0, 6),
      })),
    ),
  );
}

export function loadActiveChatSessionId(sessions: ChatSession[]): string {
  const activeId = readJson<string>(ACTIVE_CHAT_SESSION_KEY, '', (value): value is string => typeof value === 'string');
  return sessions.some((session) => session.id === activeId) ? activeId : sessions[0]?.id ?? '';
}

export function saveActiveChatSessionId(sessionId: string): void {
  writeJson(ACTIVE_CHAT_SESSION_KEY, sessionId);
}

export function clearAllChatSessions(): ChatSession[] {
  removeStorageItem(CHAT_SESSIONS_KEY);
  removeStorageItem(ACTIVE_CHAT_SESSION_KEY);
  removeStorageItem(LEGACY_CHAT_HISTORY_KEY);
  removeStorageItem(LEGACY_CHAT_DRAFT_KEY);
  removeStorageItem(LEGACY_CHAT_ATTACHMENTS_KEY);
  const session = createChatSession('Default chat');
  saveChatSessions([session]);
  saveActiveChatSessionId(session.id);
  return [session];
}

export function summarizeSessionTitle(input: string, fallback = 'New chat'): string {
  const title = input
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^attached\s+\w+:\s+/i, '');
  if (!title) return fallback;
  return title.length > 42 ? `${title.slice(0, 39)}...` : title;
}

export function sortSessions(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function migrateLegacyChat(): ChatSession[] {
  const messages = readJson<ChatMessage[]>(LEGACY_CHAT_HISTORY_KEY, [], isChatMessageArray);
  const draft = readJson<string>(LEGACY_CHAT_DRAFT_KEY, '', (value): value is string => typeof value === 'string');
  const attachments = readJson<ChatDraftAttachment[]>(
    LEGACY_CHAT_ATTACHMENTS_KEY,
    [],
    isChatDraftAttachmentArray,
  );
  const session = createChatSession('Default chat');

  return [
    {
      ...session,
      title: messages.find((message) => message.role === 'user')?.content
        ? summarizeSessionTitle(messages.find((message) => message.role === 'user')?.content ?? '', 'Default chat')
        : 'Default chat',
      draft,
      attachments,
      messages: messages.length > 0 ? messages : session.messages,
      updatedAt: messages.at(-1)?.createdAt ?? session.updatedAt,
    },
  ];
}

function isChatSessionArray(value: unknown): value is ChatSession[] {
  return Array.isArray(value) && value.every(isChatSession);
}

function isChatSession(value: unknown): value is ChatSession {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.pinned === 'boolean' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    typeof value.draft === 'string' &&
    isChatDraftAttachmentArray(value.attachments) &&
    isChatMessageArray(value.messages)
  );
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
    typeof value.createdAt === 'string' &&
    (typeof value.attachments === 'undefined' || isChatDraftAttachmentArray(value.attachments))
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
