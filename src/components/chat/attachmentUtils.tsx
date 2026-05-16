import { FileText, Image, Music, Video } from 'lucide-react';
import type { ChatDraftAttachment } from '../../types/chat';

export function AttachmentIcon({ attachment }: { attachment: ChatDraftAttachment }) {
  if (attachment.kind === 'image') return <Image className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />;
  if (attachment.kind === 'video') return <Video className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />;
  if (attachment.kind === 'audio') return <Music className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />;
  return <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />;
}
