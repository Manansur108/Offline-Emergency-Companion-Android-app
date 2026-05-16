import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { AttachmentIcon } from './attachmentUtils';
import { formatBytes } from './chatFormat';
import { MessageActions } from './MessageActions';
import { MessageText } from './MessageText';
import type { ChatMessage } from '../../types/chat';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onCopy: (message: ChatMessage) => void;
  onSpeak: (message: ChatMessage) => void;
  onImprove: (message: ChatMessage) => void;
  onSummarize: (message: ChatMessage) => void;
  onContinue: (message: ChatMessage) => void;
  onTurnIntoWorkflow: (message: ChatMessage) => void;
}

export function ChatMessageBubble({
  message,
  onCopy,
  onSpeak,
  onImprove,
  onSummarize,
  onContinue,
  onTurnIntoWorkflow,
}: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={isUser ? 'pl-8' : 'pr-8'}
    >
      <Card glass={!isUser} className={isUser ? 'rounded-[1.25rem] bg-slate-900 p-4 text-white' : 'rounded-[1.25rem] p-4'}>
        <div className="flex items-start gap-3">
          {!isUser ? <Sparkles className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : null}
          <div className="min-w-0 flex-1">
            <MessageText text={message.content} />
            {message.attachments?.length ? (
              <div className="mt-3 grid gap-2">
                {message.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs dark:bg-white/5"
                  >
                    <AttachmentIcon attachment={attachment} />
                    <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                    <span className="shrink-0 opacity-70">{formatBytes(attachment.sizeBytes)}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {!isUser ? (
              <MessageActions
                onCopy={() => onCopy(message)}
                onSpeak={() => onSpeak(message)}
                onImprove={() => onImprove(message)}
                onSummarize={() => onSummarize(message)}
                onContinue={() => onContinue(message)}
                onTurnIntoWorkflow={() => onTurnIntoWorkflow(message)}
              />
            ) : null}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
