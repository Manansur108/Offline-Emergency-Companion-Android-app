import { Check, Clipboard, Download, Share2, Sparkles } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Card } from '../ui/Card';
import { cn } from '../../utils/cn';
import { ShareExport } from '../../plugins/shareExport';

interface WorkflowOutputProps {
  output?: string | null;
  label?: string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function WorkflowOutput({
  output,
  label = 'Workflow output',
  isLoading = false,
  emptyTitle = 'No output yet',
  emptyDescription = 'Run the workflow to generate a local result.',
  className,
}: WorkflowOutputProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [shareState, setShareState] = useState<'idle' | 'shared'>('idle');
  const hasOutput = Boolean(output?.trim());

  async function copyOutput() {
    if (!output || !navigator.clipboard) return;

    await navigator.clipboard.writeText(output);
    setCopyState('copied');
    window.setTimeout(() => setCopyState('idle'), 1400);
  }

  async function shareOutput() {
    if (!output) return;

    await ShareExport.shareText({ title: label, text: output });
    setShareState('shared');
    window.setTimeout(() => setShareState('idle'), 1400);
  }

  async function exportOutput() {
    if (!output) return;

    await ShareExport.exportTextFile({
      title: label,
      text: output,
      fileName: `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'workflow-output'}.md`,
      mimeType: 'text/markdown',
    });
  }

  return (
    <Card className={cn('p-4 rounded-[1.25rem]', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-950">{label}</h2>
        </div>
        {hasOutput ? (
          <div className="flex shrink-0 items-center gap-1">
            <OutputButton label="Copy workflow output" onClick={copyOutput}>
              {copyState === 'copied' ? <Check size={18} aria-hidden="true" /> : <Clipboard size={18} aria-hidden="true" />}
            </OutputButton>
            <OutputButton label="Share workflow output" onClick={shareOutput}>
              {shareState === 'shared' ? <Check size={18} aria-hidden="true" /> : <Share2 size={18} aria-hidden="true" />}
            </OutputButton>
            <OutputButton label="Export workflow output" onClick={exportOutput}>
              <Download size={18} aria-hidden="true" />
            </OutputButton>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="flex min-h-28 items-center justify-center rounded-2xl bg-white/60 text-sm font-semibold text-slate-500">
            Thinking locally
          </div>
        ) : hasOutput ? (
          <RenderedWorkflowText text={output ?? ''} />
        ) : (
          <div className="rounded-2xl bg-white/60 px-4 py-5">
            <p className="text-sm font-bold text-slate-700">{emptyTitle}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{emptyDescription}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

function OutputButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-white/70 hover:text-primary"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function RenderedWorkflowText({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-2 rounded-2xl bg-white/60 px-4 py-4 text-sm leading-6 text-slate-700">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={index} className="h-2" />;
        }

        const heading = trimmed.match(/^(#{1,3})\s+(.+)/);
        if (heading) {
          const headingSize = heading[1].length === 1 ? 'text-lg' : 'text-base';
          return (
            <h3 key={index} className={cn('pt-2 font-bold text-slate-950', headingSize)}>
              {heading[2]}
            </h3>
          );
        }

        const bullet = trimmed.match(/^[-*]\s+(.+)/);
        if (bullet) {
          return (
            <div key={index} className="flex gap-2">
              <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{bullet[1]}</span>
            </div>
          );
        }

        const numbered = trimmed.match(/^\d+[.)]\s+(.+)/);
        if (numbered) {
          return (
            <div key={index} className="flex gap-2">
              <span className="font-bold text-primary">{trimmed.split(/[.)]/)[0]}.</span>
              <span>{numbered[1]}</span>
            </div>
          );
        }

        return <p key={index}>{trimmed}</p>;
      })}
    </div>
  );
}
