import { Clipboard, FilePlus2, MessageSquarePlus, Sparkles, StepForward, Volume2 } from 'lucide-react';

interface MessageActionsProps {
  onCopy: () => void;
  onSpeak: () => void;
  onImprove: () => void;
  onSummarize: () => void;
  onContinue: () => void;
  onTurnIntoWorkflow: () => void;
}

export function MessageActions({
  onCopy,
  onSpeak,
  onImprove,
  onSummarize,
  onContinue,
  onTurnIntoWorkflow,
}: MessageActionsProps) {
  const actions = [
    { label: 'Copy answer', icon: Clipboard, onClick: onCopy },
    { label: 'Speak answer', icon: Volume2, onClick: onSpeak },
    { label: 'Improve answer', icon: Sparkles, onClick: onImprove },
    { label: 'Summarize answer', icon: MessageSquarePlus, onClick: onSummarize },
    { label: 'Continue answer', icon: StepForward, onClick: onContinue },
    { label: 'Turn into workflow', icon: FilePlus2, onClick: onTurnIntoWorkflow },
  ];

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-primary/10 hover:text-primary active:scale-95 dark:text-slate-300"
            aria-label={action.label}
            title={action.label}
          >
            <Icon size={15} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
