import { Clock3, RotateCcw, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { WorkflowRunRecord, WorkflowRunValue } from '../../services/workflowHistory';

interface WorkflowHistoryProps {
  runs: WorkflowRunRecord[];
  title?: string;
  emptyMessage?: string;
  className?: string;
  onSelectRun?: (run: WorkflowRunRecord) => void;
  onDeleteRun?: (runId: string) => void;
  onClearRuns?: () => void;
}

export function WorkflowHistory({
  runs,
  title = 'Recent runs',
  emptyMessage = 'Saved runs will appear here after a workflow finishes.',
  className,
  onSelectRun,
  onDeleteRun,
  onClearRuns,
}: WorkflowHistoryProps) {
  return (
    <Card className={cn('p-4 rounded-[1.25rem]', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
        </div>
        {runs.length > 0 && onClearRuns ? (
          <Button type="button" variant="ghost" size="sm" rounded="2xl" onClick={onClearRuns} className="min-h-10 px-3 text-xs">
            Clear
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2">
        {runs.length === 0 ? (
          <p className="rounded-2xl bg-white/60 px-4 py-5 text-sm leading-6 text-slate-500">{emptyMessage}</p>
        ) : (
          runs.map((run) => (
            <article key={run.id} className="rounded-2xl border border-teal-900/10 bg-white/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelectRun?.(run)}
                  className="min-w-0 flex-1 text-left"
                  disabled={!onSelectRun}
                >
                  <h3 className="truncate text-sm font-bold text-slate-950">{run.workflowTitle ?? run.workflowId}</h3>
                  <p className="mt-1 text-xs font-medium text-slate-400">{formatRunDate(run.createdAt)}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{summarizeRunValue(run.input)}</p>
                </button>

                <div className="flex shrink-0 gap-1">
                  {onSelectRun ? (
                    <button
                      type="button"
                      onClick={() => onSelectRun(run)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-primary/10 hover:text-primary"
                      aria-label="Load workflow run"
                    >
                      <RotateCcw size={16} aria-hidden="true" />
                    </button>
                  ) : null}
                  {onDeleteRun ? (
                    <button
                      type="button"
                      onClick={() => onDeleteRun(run.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Delete workflow run"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </Card>
  );
}

function summarizeRunValue(value: WorkflowRunValue): string {
  if (typeof value === 'string') return value || 'Empty input';
  if (value === null) return 'Empty input';

  if (Array.isArray(value)) {
    return value.map(summarizeRunValue).join(', ');
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, entryValue]) => `${key}: ${summarizeRunValue(entryValue)}`)
      .join(' | ');
  }

  return String(value);
}

function formatRunDate(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'Unknown time';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
