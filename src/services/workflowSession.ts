import { isRecord, readJson, removeStorageItem, writeJson } from './storage';

export interface WorkflowSessionState {
  fields: Record<string, string>;
  options: Record<string, string>;
  captureNotes: string;
  output: string;
  outputs?: Record<string, string>;
}

export function loadWorkflowSession(workflowId: string, fallback: WorkflowSessionState): WorkflowSessionState {
  return readJson<WorkflowSessionState>(getWorkflowSessionKey(workflowId), fallback, isWorkflowSessionState);
}

export function saveWorkflowSession(workflowId: string, state: WorkflowSessionState): void {
  writeJson(getWorkflowSessionKey(workflowId), state);
}

export function clearWorkflowSession(workflowId: string): void {
  removeStorageItem(getWorkflowSessionKey(workflowId));
}

function getWorkflowSessionKey(workflowId: string) {
  return `ai-offline-base.workflow-session:${workflowId}`;
}

function isWorkflowSessionState(value: unknown): value is WorkflowSessionState {
  if (!isRecord(value)) return false;

  return (
    isStringRecord(value.fields) &&
    isStringRecord(value.options) &&
    typeof value.captureNotes === 'string' &&
    typeof value.output === 'string' &&
    (value.outputs === undefined || isStringRecord(value.outputs))
  );
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
}
