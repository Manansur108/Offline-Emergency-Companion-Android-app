const WORKFLOW_HISTORY_KEY = 'ai-offline-base.workflow-history';
const MAX_WORKFLOW_RUNS = 100;

export type WorkflowRunValue = string | number | boolean | null | WorkflowRunObject | WorkflowRunValue[];

export interface WorkflowRunObject {
  [key: string]: WorkflowRunValue;
}

export interface WorkflowRunRecord {
  id: string;
  workflowId: string;
  workflowTitle?: string;
  input: WorkflowRunValue;
  options?: WorkflowRunObject;
  output: string;
  createdAt: string;
}

export interface AddWorkflowRunParams {
  workflowId: string;
  workflowTitle?: string;
  input: WorkflowRunValue;
  options?: WorkflowRunObject;
  output: string;
}

interface ListWorkflowRunsOptions {
  workflowId?: string;
  limit?: number;
}

export function listWorkflowRuns(options: ListWorkflowRunsOptions = {}): WorkflowRunRecord[] {
  const runs = readWorkflowRuns();
  const filteredRuns = options.workflowId
    ? runs.filter((run) => run.workflowId === options.workflowId)
    : runs;

  return typeof options.limit === 'number' ? filteredRuns.slice(0, Math.max(0, options.limit)) : filteredRuns;
}

export function addWorkflowRun(params: AddWorkflowRunParams): WorkflowRunRecord {
  const run: WorkflowRunRecord = {
    id: createWorkflowRunId(),
    workflowId: params.workflowId,
    workflowTitle: params.workflowTitle,
    input: params.input,
    options: params.options,
    output: params.output,
    createdAt: new Date().toISOString(),
  };

  writeWorkflowRuns([run, ...readWorkflowRuns()].slice(0, MAX_WORKFLOW_RUNS));
  return run;
}

export function deleteWorkflowRun(runId: string): void {
  writeWorkflowRuns(readWorkflowRuns().filter((run) => run.id !== runId));
}

export function clearWorkflowRuns(workflowId?: string): void {
  if (!workflowId) {
    writeWorkflowRuns([]);
    return;
  }

  writeWorkflowRuns(readWorkflowRuns().filter((run) => run.workflowId !== workflowId));
}

function readWorkflowRuns(): WorkflowRunRecord[] {
  const storage = getLocalStorage();
  if (!storage) return [];

  const parsed = parseWorkflowHistory(storage.getItem(WORKFLOW_HISTORY_KEY));
  return parsed
    .map(normalizeWorkflowRun)
    .filter((run): run is WorkflowRunRecord => Boolean(run))
    .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}

function writeWorkflowRuns(runs: WorkflowRunRecord[]): void {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    storage.setItem(WORKFLOW_HISTORY_KEY, JSON.stringify(runs));
  } catch {
    storage.removeItem(WORKFLOW_HISTORY_KEY);
  }
}

function parseWorkflowHistory(rawHistory: string | null): unknown[] {
  if (!rawHistory) return [];

  try {
    const parsed = JSON.parse(rawHistory);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeWorkflowRun(value: unknown): WorkflowRunRecord | null {
  if (!isWorkflowRunObject(value)) return null;

  const id = getString(value.id) ?? createWorkflowRunId();
  const workflowId = getString(value.workflowId);
  const output = getString(value.output);
  const createdAt = normalizeDate(value.createdAt);

  if (!workflowId || output === null) return null;

  return {
    id,
    workflowId,
    workflowTitle: getString(value.workflowTitle) ?? undefined,
    input: isWorkflowRunValue(value.input) ? value.input : '',
    options: isWorkflowRunObject(value.options) ? value.options : undefined,
    output,
    createdAt,
  };
}

function normalizeDate(value: unknown): string {
  const dateText = getString(value);
  const date = dateText ? new Date(dateText) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function getString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isWorkflowRunObject(value: unknown): value is WorkflowRunObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isWorkflowRunValue(value: unknown): value is WorkflowRunValue {
  if (value === null) return true;

  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') return true;

  if (Array.isArray(value)) {
    return value.every(isWorkflowRunValue);
  }

  if (isWorkflowRunObject(value)) {
    return Object.values(value).every(isWorkflowRunValue);
  }

  return false;
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createWorkflowRunId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
