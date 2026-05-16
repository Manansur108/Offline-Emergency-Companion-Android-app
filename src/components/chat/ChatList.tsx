import { Edit3, MessageSquarePlus, Pin, PinOff, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ChatSession } from '../../types/chat';

interface ChatListProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelect: (sessionId: string) => void;
  onCreate: () => void;
  onRename: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onTogglePin: (sessionId: string) => void;
}

export function ChatList({
  sessions,
  activeSessionId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onTogglePin,
}: ChatListProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Saved chats</p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{sessions.length} local sessions</p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/30 active:scale-95"
        >
          <MessageSquarePlus size={17} aria-hidden="true" />
          New
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const lastMessage = [...session.messages].reverse().find((message) => message.role === 'user') ?? session.messages.at(-1);

          return (
            <article
              key={session.id}
              className={`min-w-[15rem] rounded-2xl border p-3 shadow-sm transition ${
                isActive
                  ? 'border-primary bg-primary/10'
                  : 'border-teal-900/10 bg-white/80 dark:border-white/10 dark:bg-slate-900/70'
              }`}
            >
              <button type="button" onClick={() => onSelect(session.id)} className="block w-full text-left">
                <div className="flex items-center gap-2">
                  {session.pinned ? <Pin size={13} className="shrink-0 text-primary" aria-hidden="true" /> : null}
                  <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">{session.title}</h2>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {lastMessage?.content ?? 'No messages yet'}
                </p>
              </button>
              <div className="mt-3 flex items-center justify-between gap-1">
                <span className="text-[11px] font-medium text-slate-400">{formatSessionDate(session.updatedAt)}</span>
                <div className="flex items-center gap-1">
                  <IconButton label={session.pinned ? 'Unpin chat' : 'Pin chat'} onClick={() => onTogglePin(session.id)}>
                    {session.pinned ? <PinOff size={14} aria-hidden="true" /> : <Pin size={14} aria-hidden="true" />}
                  </IconButton>
                  <IconButton label="Rename chat" onClick={() => onRename(session.id)}>
                    <Edit3 size={14} aria-hidden="true" />
                  </IconButton>
                  <IconButton label="Delete chat" onClick={() => onDelete(session.id)} danger>
                    <Trash2 size={14} aria-hidden="true" />
                  </IconButton>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-xl transition active:scale-95 ${
        danger ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-400 hover:bg-primary/10 hover:text-primary'
      }`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function formatSessionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
