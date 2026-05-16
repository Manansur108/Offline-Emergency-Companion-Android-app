export type WorkflowKind = 'timesheet' | 'transcript' | 'vision' | 'draft';

export interface WorkflowTemplate {
  id: string;
  kind: WorkflowKind;
  title: string;
  prompt: string;
}
