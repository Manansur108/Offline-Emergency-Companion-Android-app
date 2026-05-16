import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowLeft, FileAudio, FileText, Mail, RotateCcw, Send, Sparkles, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { WorkflowHistory } from './WorkflowHistory';
import { WorkflowOutput } from './WorkflowOutput';
import { askOfflineModel } from '../../services/aiEngine';
import {
  addWorkflowRun,
  clearWorkflowRuns,
  deleteWorkflowRun,
  listWorkflowRuns,
  type WorkflowRunObject,
  type WorkflowRunRecord,
} from '../../services/workflowHistory';
import {
  clearWorkflowSession,
  loadWorkflowSession,
  saveWorkflowSession,
  type WorkflowSessionState,
} from '../../services/workflowSession';
import { cn } from '../../utils/cn';
import type { WorkflowTemplate } from '../../types/workflows';

type TranscriptTabId = 'summary' | 'action-items' | 'decisions' | 'client-email' | 'risks';

const TRANSCRIPT_TABS: Array<{ id: TranscriptTabId; label: string }> = [
  { id: 'summary', label: 'Summary' },
  { id: 'action-items', label: 'Action items' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'client-email', label: 'Client email' },
  { id: 'risks', label: 'Risks' },
];

const TAB_PROMPTS: Record<TranscriptTabId, string> = {
  summary:
    'Create a crisp meeting summary with context, key discussion points, decisions, open questions, and next steps.',
  'action-items':
    'Extract action items as a checklist. Include owner, due date, dependency, and confidence when the transcript supports it.',
  decisions:
    'Extract a decision log. Include the decision, rationale, owner or approver, date clues, and any unresolved follow-up.',
  'client-email':
    'Draft a polished client follow-up email. Keep it concise, specific, and ready to send. Include action commitments.',
  risks:
    'Identify risks, blockers, unclear commitments, missing owners, schedule concerns, and suggested mitigations.',
};

function createTranscriptFallback(workflow: WorkflowTemplate): WorkflowSessionState {
  return {
    fields: {
      transcript: '',
      audience: '',
    },
    options: {
      activeTab: 'summary',
      speakerCleanup: 'on',
      ...(workflow.options?.length
        ? Object.fromEntries(workflow.options.map((option) => [option.id, option.defaultValue]))
        : {}),
    },
    captureNotes: '',
    output: '',
    outputs: {},
  };
}

export function TranscriptWorkflow({ workflow }: { workflow: WorkflowTemplate }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState(() => normalizeTranscriptSession(loadWorkflowSession(workflow.id, createTranscriptFallback(workflow))));
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [, setHistoryVersion] = useState(0);

  const activeTab = getTranscriptTab(session.options.activeTab);
  const transcript = session.fields.transcript ?? '';
  const currentOutput = session.outputs?.[activeTab] ?? '';
  const historyRuns = listWorkflowRuns({ workflowId: workflow.id, limit: 5 });
  const canRun = transcript.trim().length > 0 && !isGenerating;

  const transcriptStats = useMemo(() => {
    const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
    const speakers = new Set(
      transcript
        .split('\n')
        .map((line) => line.match(/^\s*([A-Z][\w .'-]{1,32}):/)?.[1]?.trim())
        .filter(Boolean),
    );

    return { words, speakers: speakers.size };
  }, [transcript]);

  useEffect(() => {
    saveWorkflowSession(workflow.id, session);
  }, [session, workflow.id]);

  async function runTranscriptWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canRun) return;

    setError('');
    setIsGenerating(true);
    setSession((current) => ({
      ...current,
      output: '',
      outputs: { ...(current.outputs ?? {}), [activeTab]: '' },
    }));

    try {
      const prompt = buildTranscriptPrompt(session, activeTab);
      const result = await askOfflineModel(prompt);

      setSession((current) => ({
        ...current,
        output: result.text,
        outputs: { ...(current.outputs ?? {}), [activeTab]: result.text },
      }));
      addWorkflowRun({
        workflowId: workflow.id,
        workflowTitle: workflow.title,
        input: {
          transcript,
          audience: session.fields.audience ?? '',
          captureNotes: session.captureNotes,
        },
        options: {
          activeTab,
          speakerCleanup: session.options.speakerCleanup ?? 'on',
        },
        output: result.text,
      });
      setHistoryVersion((version) => version + 1);
    } catch (workflowError) {
      setError(
        workflowError instanceof Error
          ? workflowError.message
          : 'The offline model bridge could not transform this transcript.',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function restoreRun(run: WorkflowRunRecord) {
    const restoredFields = toStringRecord(run.input);
    const restoredOptions = toStringRecord(run.options);
    const restoredTab = getTranscriptTab(restoredOptions?.activeTab);

    setSession((current) => ({
      ...current,
      fields: restoredFields
        ? {
            ...current.fields,
            transcript: restoredFields.transcript ?? current.fields.transcript ?? '',
            audience: restoredFields.audience ?? current.fields.audience ?? '',
          }
        : current.fields,
      captureNotes: restoredFields?.captureNotes ?? current.captureNotes,
      options: {
        ...current.options,
        ...(restoredOptions ?? {}),
        activeTab: restoredTab,
      },
      output: run.output,
      outputs: { ...(current.outputs ?? {}), [restoredTab]: run.output },
    }));
    setError('');
  }

  function resetCurrentSession() {
    clearWorkflowSession(workflow.id);
    setSession(createTranscriptFallback(workflow));
    setError('');
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('audio/')) {
      setSession((current) => ({
        ...current,
        captureNotes: [`Audio placeholder: ${file.name}`, `Mime type: ${file.type || 'unknown'}`, `Size: ${file.size} bytes`].join(
          '\n',
        ),
      }));
      event.target.value = '';
      return;
    }

    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const text = await file.text();
      setSession((current) => ({
        ...current,
        fields: { ...current.fields, transcript: text },
        captureNotes: `Loaded text file: ${file.name}`,
      }));
    } else {
      setError('Upload a text transcript for now. Audio files are saved as placeholders until local audio transcription lands.');
    }

    event.target.value = '';
  }

  return (
    <div className="space-y-5 pt-4">
      <header className="space-y-3">
        <Link to="/workflows" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
          <ArrowLeft size={16} aria-hidden="true" />
          Workflows
        </Link>
        <div>
          <p className="text-sm font-semibold text-primary">{workflow.state}</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">{workflow.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{workflow.description}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          rounded="2xl"
          onClick={resetCurrentSession}
          className="min-h-10 gap-2 px-3 text-xs"
        >
          <RotateCcw size={15} aria-hidden="true" />
          Reset
        </Button>
      </header>

      <form onSubmit={runTranscriptWorkflow} className="space-y-4">
        <Card className="space-y-4 p-4 rounded-[1.25rem]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="text-base font-bold text-slate-950">Transcript source</h2>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,text/*,audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              rounded="2xl"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-10 gap-2 px-3 text-xs"
            >
              <Upload size={15} aria-hidden="true" />
              Upload
            </Button>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-800">Meeting transcript</span>
            <textarea
              value={transcript}
              onChange={(event) =>
                setSession((current) => ({
                  ...current,
                  fields: { ...current.fields, transcript: event.target.value },
                }))
              }
              rows={10}
              placeholder="Paste raw transcript, speaker notes, or meeting chat here."
              className="w-full resize-none rounded-2xl border border-teal-900/10 bg-white/80 px-4 py-3 text-base leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-700"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-800">Client or audience</span>
              <input
                value={session.fields.audience ?? ''}
                onChange={(event) =>
                  setSession((current) => ({
                    ...current,
                    fields: { ...current.fields, audience: event.target.value },
                  }))
                }
                placeholder="Optional name, project, or recipient"
                className="w-full rounded-2xl border border-teal-900/10 bg-white/80 px-4 py-3 text-base leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-700"
              />
            </label>

            <div className="rounded-2xl border border-teal-900/10 bg-white/70 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Source stats</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                  {transcriptStats.words} words
                </span>
                <span className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                  {transcriptStats.speakers} speakers
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setSession((current) => ({
                ...current,
                options: {
                  ...current.options,
                  speakerCleanup: current.options.speakerCleanup === 'off' ? 'on' : 'off',
                },
              }))
            }
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-teal-900/10 bg-white/70 px-4 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-bold text-slate-800">Speaker cleanup</span>
              <span className="mt-1 block text-xs font-medium text-slate-500">
                Normalize speaker labels and remove filler when generating outputs.
              </span>
            </span>
            <span
              className={cn(
                'inline-flex h-7 w-12 items-center rounded-full p-1 transition',
                session.options.speakerCleanup === 'off' ? 'bg-slate-200' : 'bg-primary',
              )}
            >
              <span
                className={cn(
                  'h-5 w-5 rounded-full bg-white transition',
                  session.options.speakerCleanup === 'off' ? 'translate-x-0' : 'translate-x-5',
                )}
              />
            </span>
          </button>

          {session.captureNotes ? (
            <div className="flex items-start gap-3 rounded-2xl bg-white/60 px-4 py-3 text-sm leading-6 text-slate-600">
              <FileAudio className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <pre className="whitespace-pre-wrap font-sans">{session.captureNotes}</pre>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="text-base font-bold text-slate-950">Output tabs</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {TRANSCRIPT_TABS.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setSession((current) => ({
                        ...current,
                        options: { ...current.options, activeTab: tab.id },
                      }))
                    }
                    className={cn(
                      'min-h-11 rounded-2xl px-3 py-2 text-sm font-bold transition',
                      isSelected
                        ? 'bg-slate-900 text-white'
                        : 'border border-teal-900/10 bg-white/70 text-slate-600 hover:text-primary',
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs font-medium text-slate-400">{historyRuns.length} saved runs</span>
            <Button type="submit" size="sm" disabled={!canRun} isLoading={isGenerating} className="min-h-11 gap-2">
              {activeTab === 'client-email' ? <Mail size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
              Generate
            </Button>
          </div>
        </Card>
      </form>

      {error ? (
        <Card className="p-4 rounded-[1.25rem] bg-rose-50">
          <p className="text-sm font-bold text-rose-700">Transcript error</p>
          <p className="mt-2 text-sm leading-6 text-rose-700">{error}</p>
        </Card>
      ) : null}

      <WorkflowOutput
        output={currentOutput}
        label={TRANSCRIPT_TABS.find((tab) => tab.id === activeTab)?.label ?? workflow.outputLabel}
        isLoading={isGenerating}
        emptyTitle="No tab output yet"
        emptyDescription="Choose a tab and generate a local transcript result."
      />

      <WorkflowHistory
        runs={historyRuns}
        onSelectRun={restoreRun}
        onDeleteRun={(runId) => {
          deleteWorkflowRun(runId);
          setHistoryVersion((version) => version + 1);
        }}
        onClearRuns={() => {
          clearWorkflowRuns(workflow.id);
          setHistoryVersion((version) => version + 1);
        }}
      />
    </div>
  );
}

function normalizeTranscriptSession(session: WorkflowSessionState): WorkflowSessionState {
  return {
    ...session,
    fields: {
      transcript: '',
      audience: '',
      ...session.fields,
    },
    options: {
      speakerCleanup: 'on',
      ...session.options,
      activeTab: getTranscriptTab(session.options.activeTab),
    },
    outputs: session.outputs ?? {},
  };
}

function buildTranscriptPrompt(session: WorkflowSessionState, activeTab: TranscriptTabId) {
  const transcript = session.fields.transcript ?? '';
  const audience = session.fields.audience?.trim();
  const speakerCleanup = session.options.speakerCleanup !== 'off';

  return [
    TAB_PROMPTS[activeTab],
    'Use concise natural language. Do not use Markdown headings, hash symbols, tables, code fences, or decorative formatting.',
    'Preserve names, dates, decisions, owners, and commitments when present.',
    speakerCleanup
      ? 'Clean up speaker labels, remove filler, and merge duplicate speakers when it is obvious.'
      : 'Preserve the speaker wording and labels as closely as possible.',
    audience ? `Audience/client context: ${audience}` : '',
    session.captureNotes ? `Source upload notes:\n${session.captureNotes}` : '',
    `Transcript:\n${transcript}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function getTranscriptTab(value: unknown): TranscriptTabId {
  return TRANSCRIPT_TABS.some((tab) => tab.id === value) ? (value as TranscriptTabId) : 'summary';
}

function toStringRecord(value: unknown): Record<string, string> | null {
  if (!isWorkflowRunObject(value)) return null;

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

function isWorkflowRunObject(value: unknown): value is WorkflowRunObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
