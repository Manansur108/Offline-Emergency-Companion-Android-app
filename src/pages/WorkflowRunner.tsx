import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, RotateCcw, Send, Square } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CaptureInput } from '../components/workflows/CaptureInput';
import { DiscussionWorkflow } from '../components/workflows/DiscussionWorkflow';
import { TaskReminderWorkflow } from '../components/workflows/TaskReminderWorkflow';
import { TranscriptWorkflow } from '../components/workflows/TranscriptWorkflow';
import { WorkflowHistory } from '../components/workflows/WorkflowHistory';
import { WorkflowOutput } from '../components/workflows/WorkflowOutput';
import { getWorkflowTemplate } from '../data/workflowTemplates';
import { askOfflineModel } from '../services/aiEngine';
import {
  addWorkflowRun,
  clearWorkflowRuns,
  deleteWorkflowRun,
  listWorkflowRuns,
  type WorkflowRunObject,
  type WorkflowRunRecord,
} from '../services/workflowHistory';
import {
  clearWorkflowSession,
  loadWorkflowSession,
  saveWorkflowSession,
  type WorkflowSessionState,
} from '../services/workflowSession';
import type { WorkflowField, WorkflowTemplate } from '../types/workflows';

function createInitialFields(workflow: WorkflowTemplate) {
  return Object.fromEntries(workflow.fields.map((field) => [field.id, '']));
}

function createInitialOptions(workflow: WorkflowTemplate) {
  return Object.fromEntries((workflow.options ?? []).map((option) => [option.id, option.defaultValue]));
}

function createFallbackSession(workflow: WorkflowTemplate): WorkflowSessionState {
  return {
    fields: createInitialFields(workflow),
    options: createInitialOptions(workflow),
    captureNotes: '',
    output: '',
  };
}

export function WorkflowRunner() {
  const { workflowId } = useParams();
  const workflow = getWorkflowTemplate(workflowId);

  if (!workflow) {
    return (
      <div className="space-y-5 pt-4">
        <Link to="/workflows" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
          <ArrowLeft size={16} aria-hidden="true" />
          Workflows
        </Link>
        <Card className="p-4 rounded-[1.25rem]">
          <h1 className="text-xl font-bold text-slate-950">Workflow not found</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">This workflow is not in the local registry.</p>
          <Link className="mt-4 inline-flex text-sm font-bold text-primary" to="/workflows">
            Back to workflows
          </Link>
        </Card>
      </div>
    );
  }

  if (workflow.runnerType === 'task' || workflow.id === 'task-reminders') {
    return <TaskReminderWorkflow workflow={workflow} />;
  }

  if (workflow.runnerType === 'discussion' || workflow.id === 'discussion') {
    return <DiscussionWorkflow workflow={workflow} />;
  }

  if (workflow.runnerType === 'transcript' || workflow.id === 'transcript') {
    return <TranscriptWorkflow workflow={workflow} />;
  }

  return <WorkflowRunnerForm key={workflow.id} workflow={workflow} />;
}

function WorkflowRunnerForm({ workflow }: { workflow: WorkflowTemplate }) {
  const [session, setSession] = useState(() => loadWorkflowSession(workflow.id, createFallbackSession(workflow)));
  const { fields, options, captureNotes, output } = session;
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [, setHistoryVersion] = useState(0);

  const historyRuns = listWorkflowRuns({ workflowId: workflow.id, limit: 5 });

  const canRun = useMemo(
    () => workflow.fields.every((field) => !field.required || fields[field.id]?.trim()) && !isGenerating,
    [fields, isGenerating, workflow.fields],
  );

  const supportsCapture = workflow.capabilityRequirements.some((requirement) =>
    ['camera-capture', 'audio-capture', 'vision-model'].includes(requirement),
  );

  useEffect(() => {
    saveWorkflowSession(workflow.id, session);
  }, [session, workflow.id]);

  async function runWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canRun) return;

    setError('');
    setSession((current) => ({ ...current, output: '' }));
    setIsGenerating(true);

    try {
      const prompt = workflow.buildPrompt({
        fields: captureNotes ? { ...fields, captureNotes } : fields,
        options,
      });
      const result = await askOfflineModel(prompt);
      setSession((current) => ({ ...current, output: result.text }));
      addWorkflowRun({
        workflowId: workflow.id,
        workflowTitle: workflow.title,
        input: fields,
        options,
        output: result.text,
      });
      setHistoryVersion((version) => version + 1);
    } catch (workflowError) {
      setError(
        workflowError instanceof Error
          ? workflowError.message
          : 'The offline model bridge could not run this workflow.',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function restoreRun(run: WorkflowRunRecord) {
    const restoredFields = toStringRecord(run.input);
    const restoredOptions = toStringRecord(run.options);

    setSession((current) => ({
      ...current,
      fields: restoredFields ? { ...current.fields, ...restoredFields } : current.fields,
      options: restoredOptions ? { ...current.options, ...restoredOptions } : current.options,
      output: run.output,
    }));
    setError('');
  }

  function removeRun(runId: string) {
    deleteWorkflowRun(runId);
    setHistoryVersion((version) => version + 1);
  }

  function clearRuns() {
    clearWorkflowRuns(workflow.id);
    setHistoryVersion((version) => version + 1);
  }

  function resetCurrentSession() {
    clearWorkflowSession(workflow.id);
    setSession(createFallbackSession(workflow));
    setError('');
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

      {supportsCapture ? (
        <CaptureInput
          label="Local media placeholder"
          description="Choose an image or audio file now. Future Android builds can replace this with direct camera and microphone capture."
          onCapture={(media) => {
            const notes = [
              `Captured ${media.kind}: ${media.name}`,
              `Mime type: ${media.mimeType}`,
              `Size: ${media.sizeBytes} bytes`,
              media.kind === 'image' ? `Dimensions: ${media.width ?? 'unknown'} x ${media.height ?? 'unknown'}` : '',
              media.kind === 'audio' ? `Duration: ${media.durationSeconds ?? 'unknown'} seconds` : '',
            ]
              .filter(Boolean)
              .join('\n');
            setSession((current) => ({ ...current, captureNotes: notes }));
          }}
          onClear={() => setSession((current) => ({ ...current, captureNotes: '' }))}
        />
      ) : null}

      <form onSubmit={runWorkflow} className="space-y-4">
        <Card className="space-y-4 p-4 rounded-[1.25rem]">
          {workflow.fields.map((field) => (
            <WorkflowFieldControl
              key={field.id}
              field={field}
              value={fields[field.id] ?? ''}
              onChange={(value) =>
                setSession((current) => ({ ...current, fields: { ...current.fields, [field.id]: value } }))
              }
            />
          ))}

          {workflow.options?.map((option) => (
            <fieldset key={option.id} className="space-y-2">
              <legend className="text-sm font-bold text-slate-800">{option.label}</legend>
              <div className="flex flex-wrap gap-2">
                {option.choices.map((choice) => {
                  const isSelected = options[option.id] === choice.value;

                  return (
                    <button
                      key={choice.value}
                      type="button"
                      onClick={() =>
                        setSession((current) => ({
                          ...current,
                          options: { ...current.options, [option.id]: choice.value },
                        }))
                      }
                      className={
                        isSelected
                          ? 'rounded-2xl bg-slate-900 px-3 py-2 text-sm font-bold text-white'
                          : 'rounded-2xl border border-teal-900/10 bg-white/70 px-3 py-2 text-sm font-bold text-slate-600'
                      }
                    >
                      {choice.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs font-medium text-slate-400">{historyRuns.length} saved runs</span>
            <Button type="submit" size="sm" disabled={!canRun} isLoading={isGenerating} className="min-h-11 gap-2">
              <Send size={16} aria-hidden="true" />
              Run
            </Button>
          </div>
        </Card>
      </form>

      {isGenerating ? (
        <Card className="p-4 rounded-[1.25rem]">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
            <Square className="h-4 w-4 animate-pulse fill-primary text-primary" aria-hidden="true" />
            Running workflow locally
          </div>
        </Card>
      ) : null}

      {error ? (
        <Card className="p-4 rounded-[1.25rem] bg-rose-50">
          <p className="text-sm font-bold text-rose-700">Workflow error</p>
          <p className="mt-2 text-sm leading-6 text-rose-700">{error}</p>
        </Card>
      ) : null}

      <WorkflowOutput output={output} label={workflow.outputLabel} isLoading={isGenerating} />

      <WorkflowHistory
        runs={historyRuns}
        onSelectRun={restoreRun}
        onDeleteRun={removeRun}
        onClearRuns={clearRuns}
      />
    </div>
  );
}

function WorkflowFieldControl({
  field,
  value,
  onChange,
}: {
  field: WorkflowField;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputClass =
    'w-full rounded-2xl border border-teal-900/10 bg-white/80 px-4 py-3 text-base leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-700';

  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-slate-800">{field.label}</span>
      {field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={field.rows ?? 5}
          placeholder={field.placeholder}
          className={`${inputClass} resize-none`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className={inputClass}
        />
      )}
      {field.helperText ? <span className="block text-xs font-medium text-slate-500">{field.helperText}</span> : null}
    </label>
  );
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
