import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, CalendarClock, CheckSquare2, Plus, Sparkles, Square, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { WorkflowOutput } from './WorkflowOutput';
import { askOfflineModel } from '../../services/aiEngine';
import { NativeReminders } from '../../plugins/nativeReminders';
import { HapticsBridge } from '../../plugins/haptics';
import { isRecord, readJson, removeStorageItem, writeJson } from '../../services/storage';
import type { WorkflowTemplate } from '../../types/workflows';

interface ReminderTask {
  id: string;
  text: string;
  done: boolean;
  insight?: string;
  dueAt?: string;
  reminderId?: number;
  createdAt: string;
}

interface TaskReminderState {
  tasks: ReminderTask[];
  draft: string;
  dueAt: string;
  selectedTaskId?: string;
}

const TASK_REMINDER_KEY = 'ai-offline-base.task-reminders';

export function TaskReminderWorkflow({ workflow }: { workflow: WorkflowTemplate }) {
  const [state, setState] = useState<TaskReminderState>(() => loadTaskReminderState());
  const [isGeneratingFor, setIsGeneratingFor] = useState<string | null>(null);
  const selectedTask = state.tasks.find((task) => task.id === state.selectedTaskId);
  const completedCount = useMemo(() => state.tasks.filter((task) => task.done).length, [state.tasks]);

  useEffect(() => {
    saveTaskReminderState(state);
  }, [state]);

  function updateDraft(draft: string) {
    setState((current) => ({ ...current, draft }));
  }

  function updateDueAt(dueAt: string) {
    setState((current) => ({ ...current, dueAt }));
  }

  function addTask() {
    const text = state.draft.trim();
    if (!text) return;

    const task: ReminderTask = {
      id: createId(),
      text,
      done: false,
      dueAt: state.dueAt ? new Date(state.dueAt).toISOString() : undefined,
      createdAt: new Date().toISOString(),
    };

    setState((current) => ({
      tasks: [task, ...current.tasks],
      draft: '',
      dueAt: '',
      selectedTaskId: task.id,
    }));
    HapticsBridge.impact({ style: 'light' });
  }

  function toggleTask(taskId: string) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
    }));
    HapticsBridge.impact({ style: 'light' });
  }

  function deleteTask(taskId: string) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
      selectedTaskId: current.selectedTaskId === taskId ? undefined : current.selectedTaskId,
    }));
  }

  function clearAll() {
    removeStorageItem(TASK_REMINDER_KEY);
    setState({ tasks: [], draft: '', dueAt: '' });
  }

  async function generateInsight(task: ReminderTask) {
    if (isGeneratingFor) return;

    setIsGeneratingFor(task.id);
    setState((current) => ({ ...current, selectedTaskId: task.id }));

    try {
      const result = await askOfflineModel(
        workflow.buildPrompt({
          fields: { task: task.text },
          options: {},
        }),
      );

      setState((current) => ({
        ...current,
        selectedTaskId: task.id,
        tasks: current.tasks.map((entry) => (entry.id === task.id ? { ...entry, insight: result.text } : entry)),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The offline model could not create a task plan.';
      setState((current) => ({
        ...current,
        selectedTaskId: task.id,
        tasks: current.tasks.map((entry) => (entry.id === task.id ? { ...entry, insight: message } : entry)),
      }));
    } finally {
      setIsGeneratingFor(null);
    }
  }

  async function scheduleReminder(task: ReminderTask) {
    if (!task.dueAt) return;

    await NativeReminders.requestPermissions();
    const result = await NativeReminders.schedule({
      id: task.reminderId ?? Date.now(),
      title: 'Offline AI task reminder',
      body: task.text,
      at: task.dueAt,
    });

    setState((current) => ({
      ...current,
      selectedTaskId: task.id,
      tasks: current.tasks.map((entry) =>
        entry.id === task.id ? { ...entry, reminderId: result.id, insight: `Reminder scheduled for ${formatDate(result.scheduledAt)}.` } : entry,
      ),
    }));
    HapticsBridge.impact({ style: 'medium' });
  }

  return (
    <div className="space-y-5 pt-4">
      <header className="space-y-3">
        <Link to="/workflows" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
          <ArrowLeft size={16} aria-hidden="true" />
          Workflows
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">{workflow.state}</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">{workflow.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{workflow.description}</p>
          </div>
          {state.tasks.length > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-white/70 hover:text-rose-600"
              aria-label="Delete checklist history"
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </header>

      <Card className="space-y-4 p-4 rounded-[1.25rem]">
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-800">New reminder task</span>
          <textarea
            value={state.draft}
            onChange={(event) => updateDraft(event.target.value)}
            rows={3}
            placeholder="Example: Prepare Monday timesheet, check missing hours, send final note."
            className="w-full resize-none rounded-2xl border border-teal-900/10 bg-white/80 px-4 py-3 text-base leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-700"
          />
        </label>
        <label className="block space-y-2">
          <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <CalendarClock size={16} aria-hidden="true" />
            Due date reminder
          </span>
          <input
            type="datetime-local"
            value={state.dueAt ?? ''}
            onChange={(event) => updateDueAt(event.target.value)}
            className="min-h-11 w-full rounded-2xl border border-teal-900/10 bg-white/80 px-4 py-3 text-base leading-6 text-slate-900 outline-none focus:border-teal-700"
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-400">
            {completedCount}/{state.tasks.length} complete
          </span>
          <Button type="button" size="sm" disabled={!state.draft.trim()} onClick={addTask} className="min-h-11 gap-2">
            <Plus size={16} aria-hidden="true" />
            Add
          </Button>
        </div>
      </Card>

      <Card className="p-4 rounded-[1.25rem]">
        <div className="flex items-center gap-2">
          <CheckSquare2 className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-950">Reminder checklist</h2>
        </div>

        <div className="mt-4 grid gap-2">
          {state.tasks.length === 0 ? (
            <p className="rounded-2xl bg-white/60 px-4 py-5 text-sm leading-6 text-slate-500">
              Add tasks here. They stay on device and remain when you move between tabs.
            </p>
          ) : (
            state.tasks.map((task) => (
              <article key={task.id} className="rounded-2xl border border-teal-900/10 bg-white/70 p-3">
                <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    className={
                      task.done
                        ? 'mt-1 flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white'
                        : 'mt-1 flex h-8 w-8 items-center justify-center rounded-xl border border-teal-900/20 text-slate-400'
                    }
                    aria-label={task.done ? 'Mark task incomplete' : 'Mark task complete'}
                  >
                    {task.done ? <CheckSquare2 size={17} aria-hidden="true" /> : <Square size={17} aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setState((current) => ({ ...current, selectedTaskId: task.id }))}
                    className="min-w-0 text-left"
                  >
                    <p className={task.done ? 'text-sm leading-6 text-slate-400 line-through' : 'text-sm leading-6 text-slate-800'}>
                      {task.text}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-400">{formatDate(task.createdAt)}</p>
                    {task.dueAt ? (
                      <p className="mt-1 text-xs font-bold text-primary">Due {formatDate(task.dueAt)}</p>
                    ) : null}
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => scheduleReminder(task)}
                      disabled={!task.dueAt}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-primary transition hover:bg-primary/10 disabled:text-slate-300"
                      aria-label="Schedule task reminder notification"
                    >
                      <Bell size={17} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => generateInsight(task)}
                      disabled={Boolean(isGeneratingFor)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-primary transition hover:bg-primary/10 disabled:opacity-50"
                      aria-label="Ask AI for task insight"
                    >
                      <Sparkles size={17} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Delete task"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </Card>

      <WorkflowOutput
        output={selectedTask?.insight}
        label={selectedTask ? `AI plan: ${selectedTask.text}` : workflow.outputLabel}
        isLoading={Boolean(selectedTask && isGeneratingFor === selectedTask.id)}
        emptyTitle="No task insight yet"
        emptyDescription="Tap the AI button beside any task to generate a practical local plan."
      />
    </div>
  );
}

function loadTaskReminderState(): TaskReminderState {
  return readJson<TaskReminderState>(TASK_REMINDER_KEY, { tasks: [], draft: '', dueAt: '' }, isTaskReminderState);
}

function saveTaskReminderState(state: TaskReminderState): void {
  writeJson(TASK_REMINDER_KEY, state);
}

function isTaskReminderState(value: unknown): value is TaskReminderState {
  return (
    isRecord(value) &&
    Array.isArray(value.tasks) &&
    value.tasks.every(isReminderTask) &&
    typeof value.draft === 'string' &&
    (typeof value.dueAt === 'string' || typeof value.dueAt === 'undefined') &&
    (typeof value.selectedTaskId === 'string' || typeof value.selectedTaskId === 'undefined')
  );
}

function isReminderTask(value: unknown): value is ReminderTask {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.text === 'string' &&
    typeof value.done === 'boolean' &&
    typeof value.createdAt === 'string' &&
    (typeof value.dueAt === 'string' || typeof value.dueAt === 'undefined') &&
    (typeof value.reminderId === 'number' || typeof value.reminderId === 'undefined') &&
    (typeof value.insight === 'string' || typeof value.insight === 'undefined')
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Saved locally';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
