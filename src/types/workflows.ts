export type WorkflowFieldType = 'text' | 'textarea';

export interface WorkflowField {
  id: string;
  label: string;
  type: WorkflowFieldType;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  rows?: number;
}

export interface WorkflowOptionChoice {
  label: string;
  value: string;
}

export interface WorkflowOption {
  id: string;
  label: string;
  choices: WorkflowOptionChoice[];
  defaultValue: string;
}

export interface WorkflowPromptContext {
  fields: Record<string, string>;
  options: Record<string, string>;
}

export interface WorkflowHistoryMetadata {
  storageKey: string;
  summaryFieldId?: string;
}

export interface WorkflowTemplate {
  id: string;
  title: string;
  description: string;
  state: string;
  runnerType?: 'generic' | 'timesheet' | 'transcript' | 'task' | 'discussion' | 'vision';
  icon: 'camera' | 'checkSquare' | 'clock' | 'fileText' | 'messageCircle' | 'mic';
  fields: WorkflowField[];
  options?: WorkflowOption[];
  outputLabel: string;
  capabilityRequirements: string[];
  history: WorkflowHistoryMetadata;
  buildPrompt: (context: WorkflowPromptContext) => string;
}
