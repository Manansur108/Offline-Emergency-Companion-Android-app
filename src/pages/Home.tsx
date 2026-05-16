import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquareText, Square, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ChatComposer } from '../components/chat/ChatComposer';
import { ChatList } from '../components/chat/ChatList';
import { ChatMessageBubble } from '../components/chat/ChatMessageBubble';
import { askOfflineModel, newMessage } from '../services/aiEngine';
import { VoiceIO } from '../plugins/voiceIO';
import {
  clearAllChatSessions,
  createChatSession,
  loadActiveChatSessionId,
  loadChatSessions,
  saveActiveChatSessionId,
  saveChatSessions,
  sortSessions,
  summarizeSessionTitle,
} from '../services/chatSessions';
import type { ChatDraftAttachment, ChatMessage, ChatSession } from '../types/chat';

const starterPrompts = [
  'Turn these meeting notes into a concise action list.',
  'Draft a simple daily timesheet from this rough activity log.',
  'Explain what happened in this camera scene in plain language.',
];

export function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadChatSessions());
  const [activeSessionId, setActiveSessionId] = useState(() => loadActiveChatSessionId(loadChatSessions()));
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0],
    [activeSessionId, sessions],
  );
  const input = activeSession?.draft ?? '';
  const attachments = activeSession?.attachments ?? [];
  const messages = activeSession?.messages ?? [];

  useEffect(() => {
    saveChatSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) {
      saveActiveChatSessionId(activeSessionId);
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function updateActiveSession(updater: (session: ChatSession) => ChatSession) {
    setSessions((current) => sortSessions(current.map((session) => (session.id === activeSession?.id ? updater(session) : session))));
  }

  function setDraft(value: string) {
    updateActiveSession((session) => ({ ...session, draft: value, updatedAt: new Date().toISOString() }));
  }

  async function submitPrompt(promptText = input) {
    if (!activeSession) return;
    const query = promptText.trim();
    if ((!query && attachments.length === 0) || isGenerating) return;

    const now = new Date().toISOString();
    const promptWithAttachments = buildPromptWithAttachments(query, attachments);
    const visibleMessage = query || 'Analyze uploaded files';
    const userMessage = newMessage('user', visibleMessage, { attachments: attachments.length ? attachments : undefined });

    updateActiveSession((session) => ({
      ...session,
      title: session.messages.some((message) => message.role === 'user')
        ? session.title
        : summarizeSessionTitle(visibleMessage, session.title),
      draft: '',
      attachments: [],
      messages: [...session.messages, userMessage],
      updatedAt: now,
    }));
    setIsGenerating(true);

    try {
      const result = await askOfflineModel(promptWithAttachments);
      appendAssistantMessage(result.text);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'The offline model bridge could not generate a response.';
      appendAssistantMessage(message);
    } finally {
      setIsGenerating(false);
    }
  }

  function appendAssistantMessage(content: string) {
    updateActiveSession((session) => ({
      ...session,
      messages: [...session.messages, newMessage('assistant', content)],
      updatedAt: new Date().toISOString(),
    }));
  }

  function createSession() {
    const session = createChatSession(`Chat ${sessions.length + 1}`);
    setSessions((current) => sortSessions([session, ...current]));
    setActiveSessionId(session.id);
  }

  function renameSession(sessionId: string) {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return;

    const nextTitle = window.prompt('Rename chat', session.title)?.trim();
    if (!nextTitle) return;

    setSessions((current) =>
      sortSessions(
        current.map((item) =>
          item.id === sessionId ? { ...item, title: nextTitle.slice(0, 64), updatedAt: new Date().toISOString() } : item,
        ),
      ),
    );
  }

  function deleteSession(sessionId: string) {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return;
    if (!window.confirm(`Delete "${session.title}"? This only removes this local chat.`)) return;

    setSessions((current) => {
      const remaining = current.filter((item) => item.id !== sessionId);
      const next = remaining.length > 0 ? remaining : [createChatSession('Default chat')];
      if (sessionId === activeSessionId) {
        setActiveSessionId(next[0].id);
      }
      return sortSessions(next);
    });
  }

  function togglePin(sessionId: string) {
    setSessions((current) =>
      sortSessions(
        current.map((session) =>
          session.id === sessionId ? { ...session, pinned: !session.pinned, updatedAt: new Date().toISOString() } : session,
        ),
      ),
    );
  }

  function deleteAllHistory() {
    if (!window.confirm('Delete all local chat sessions? Workflows and settings are not affected.')) return;
    const next = clearAllChatSessions();
    setSessions(next);
    setActiveSessionId(next[0].id);
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;

    const nextAttachments = await Promise.all(Array.from(files).map(createAttachment));
    updateActiveSession((session) => ({
      ...session,
      attachments: [...session.attachments, ...nextAttachments].slice(0, 6),
      updatedAt: new Date().toISOString(),
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeAttachment(attachmentId: string) {
    updateActiveSession((session) => ({
      ...session,
      attachments: session.attachments.filter((attachment) => attachment.id !== attachmentId),
      updatedAt: new Date().toISOString(),
    }));
  }

  async function copyMessage(message: ChatMessage) {
    await navigator.clipboard?.writeText(message.content);
    setToast('Copied answer');
  }

  async function speakMessage(message: ChatMessage) {
    try {
      await VoiceIO.speak({ text: message.content });
      setToast('Speaking answer');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Text to speech is not available.');
    }
  }

  function runMessageAction(message: ChatMessage, instruction: string) {
    setDraft(`${instruction}\n\n${message.content}`);
  }

  return (
    <div className="flex min-h-full flex-col space-y-5">
      <header className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Local Gemma Shell</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">Offline AI</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={deleteAllHistory}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-white/70 hover:text-rose-600 active:scale-95 dark:text-slate-300 dark:hover:bg-white/10"
              aria-label="Delete all chat sessions"
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
            <div className="rounded-2xl bg-primary px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/30">
              No cloud
            </div>
          </div>
        </div>
      </header>

      <ChatList
        sessions={sessions}
        activeSessionId={activeSession?.id ?? ''}
        onSelect={setActiveSessionId}
        onCreate={createSession}
        onRename={renameSession}
        onDelete={deleteSession}
        onTogglePin={togglePin}
      />

      {messages.length <= 1 ? (
        <section className="space-y-3">
          {starterPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => submitPrompt(prompt)}
              className="min-h-12 w-full rounded-2xl border border-teal-900/10 bg-white/80 px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition active:scale-[0.99] dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200"
            >
              {prompt}
            </button>
          ))}
        </section>
      ) : null}

      <section className="flex-1 space-y-3">
        {messages.map((message) => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            onCopy={copyMessage}
            onSpeak={speakMessage}
            onImprove={(item) => runMessageAction(item, 'Improve this answer. Keep the useful detail and make it clearer:')}
            onSummarize={(item) => runMessageAction(item, 'Summarize this answer into concise action bullets:')}
            onContinue={(item) => runMessageAction(item, 'Continue this answer with the next practical steps:')}
            onTurnIntoWorkflow={(item) =>
              runMessageAction(item, 'Turn this into a reusable workflow template with inputs, steps, and output format:')
            }
          />
        ))}

        {isGenerating ? (
          <Card className="rounded-[1.25rem] p-4">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Square className="h-4 w-4 animate-pulse fill-primary text-primary" aria-hidden="true" />
              Thinking locally
            </div>
          </Card>
        ) : null}
      </section>

      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-xl">
          <MessageSquareText size={16} aria-hidden="true" />
          {toast}
        </div>
      ) : null}

      <ChatComposer
        input={input}
        attachments={attachments}
        isGenerating={isGenerating}
        fileInputRef={fileInputRef}
        onInputChange={setDraft}
        onFiles={handleFiles}
        onRemoveAttachment={removeAttachment}
        onSubmit={() => submitPrompt()}
      />
    </div>
  );
}

async function createAttachment(file: File): Promise<ChatDraftAttachment> {
  const kind = getAttachmentKind(file);
  const textPreview = kind === 'text' ? await readTextPreview(file) : undefined;

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: file.name,
    type: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    kind,
    textPreview,
  };
}

function getAttachmentKind(file: File): ChatDraftAttachment['kind'] {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';

  const lowerName = file.name.toLowerCase();
  const textExtensions = ['.txt', '.md', '.csv', '.json', '.log', '.xml', '.html', '.css', '.js', '.ts', '.tsx'];
  if (file.type.startsWith('text/') || textExtensions.some((extension) => lowerName.endsWith(extension))) {
    return 'text';
  }

  return 'file';
}

async function readTextPreview(file: File): Promise<string> {
  const text = await file.text();
  return text.slice(0, 12000);
}

function buildPromptWithAttachments(query: string, attachments: ChatDraftAttachment[]): string {
  if (attachments.length === 0) return query;

  return [
    query || 'Analyze the uploaded file inputs.',
    '',
    'Uploaded local files:',
    ...attachments.map((attachment) =>
      [
        `File: ${attachment.name}`,
        `Kind: ${attachment.kind}`,
        `Mime type: ${attachment.type}`,
        `Size: ${attachment.sizeBytes} bytes`,
        attachment.textPreview
          ? `Text preview:\n${attachment.textPreview}`
          : 'Binary/media content is attached as local metadata in this build.',
      ].join('\n'),
    ),
  ].join('\n');
}
