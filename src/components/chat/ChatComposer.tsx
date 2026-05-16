import { Plus, Send, X } from 'lucide-react';
import type { RefObject } from 'react';
import { Button } from '../ui/Button';
import { AttachmentIcon } from './attachmentUtils';
import { formatBytes } from './chatFormat';
import type { ChatDraftAttachment } from '../../types/chat';

interface ChatComposerProps {
  input: string;
  attachments: ChatDraftAttachment[];
  isGenerating: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onInputChange: (value: string) => void;
  onFiles: (files: FileList | null) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onSubmit: () => void;
}

export function ChatComposer({
  input,
  attachments,
  isGenerating,
  fileInputRef,
  onInputChange,
  onFiles,
  onRemoveAttachment,
  onSubmit,
}: ChatComposerProps) {
  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isGenerating;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="sticky bottom-24 z-30 rounded-[1.5rem] border border-teal-900/10 bg-white/90 p-3 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90"
    >
      {attachments.length > 0 ? (
        <div className="mb-3 grid gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 rounded-2xl bg-white/70 px-3 py-2 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-200"
            >
              <AttachmentIcon attachment={attachment} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{attachment.name}</p>
                <p className="text-xs text-slate-400">
                  {attachment.kind} - {formatBytes(attachment.sizeBytes)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveAttachment(attachment.id)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Remove ${attachment.name}`}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <label className="sr-only" htmlFor="chat-input">
        Message
      </label>
      <div className="flex items-start gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.txt,.md,.csv,.json,.log,.xml,.html,.css,.js,.ts,.tsx,.pdf,.doc,.docx,*/*"
          onChange={(event) => onFiles(event.target.files)}
          className="hidden"
          aria-label="Upload files for model input"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-primary shadow-sm transition active:scale-95 dark:bg-white/10"
          aria-label="Add file input"
        >
          <Plus size={20} aria-hidden="true" />
        </button>
        <textarea
          id="chat-input"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          rows={3}
          className="min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-base leading-6 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          placeholder="Ask the offline model..."
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-400">
          {input.trim().length} chars - {attachments.length} files
        </span>
        <Button type="submit" size="sm" disabled={!canSend} isLoading={isGenerating} className="min-h-11 gap-2">
          <Send size={16} aria-hidden="true" />
          Send
        </Button>
      </div>
    </form>
  );
}
