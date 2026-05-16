export type ChatRole = 'user' | 'assistant';

export interface ChatDraftAttachment {
  id: string;
  name: string;
  type: string;
  sizeBytes: number;
  kind: 'image' | 'video' | 'audio' | 'text' | 'file';
  textPreview?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  attachments?: ChatDraftAttachment[];
}

export interface ChatSession {
  id: string;
  title: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  draft: string;
  attachments: ChatDraftAttachment[];
  messages: ChatMessage[];
}
