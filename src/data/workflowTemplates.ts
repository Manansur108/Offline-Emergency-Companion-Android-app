import type { WorkflowTemplate } from '../types/workflows';

function section(title: string, value: string) {
  return `${title}\n${value.trim() || '(not provided)'}`;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'task-reminders',
    title: 'Task Reminder Checklist',
    description: 'Keep a persistent checklist and ask the local model for a plan beside each task.',
    state: 'Interactive',
    icon: 'checkSquare',
    outputLabel: 'Task insight',
    capabilityRequirements: ['text-generation', 'local-storage'],
    history: {
      storageKey: 'workflow-runs:task-reminders',
      summaryFieldId: 'task',
    },
    fields: [],
    buildPrompt: ({ fields }) =>
      [
        'Create a short practical plan for this reminder task.',
        'Include first step, likely blockers, and a simple completion checklist.',
        section('Task:', fields.task),
      ].join('\n'),
  },
  {
    id: 'discussion',
    title: 'Saved AI Discussion',
    description: 'Talk back and forth with the offline model, save the conversation, and generate useful insights.',
    state: 'Interactive',
    icon: 'messageCircle',
    outputLabel: 'Discussion insights',
    capabilityRequirements: ['text-generation', 'local-storage'],
    history: {
      storageKey: 'workflow-runs:discussion',
      summaryFieldId: 'topic',
    },
    fields: [],
    buildPrompt: ({ fields }) =>
      [
        'Summarize this saved AI discussion in natural language.',
        'Use simple labels if useful: Key questions, Useful answers, Decisions, Open items, Next actions.',
        'Do not use Markdown headings, hash symbols, or tables.',
        section('Discussion:', fields.discussion),
      ].join('\n'),
  },
  {
    id: 'timesheet',
    title: 'AI Timesheet Maker',
    description: 'Convert rough work notes into clean time blocks, summaries, and missing-time questions.',
    state: 'Ready prompt',
    icon: 'clock',
    outputLabel: 'Timesheet draft',
    capabilityRequirements: ['text-generation'],
    history: {
      storageKey: 'workflow-runs:timesheet',
      summaryFieldId: 'activityLog',
    },
    fields: [
      {
        id: 'activityLog',
        label: 'Rough daily activity log',
        type: 'textarea',
        rows: 8,
        required: true,
        placeholder: '8:15 emails, 9 standup, 10-12 PLC review, lunch, 1:30 client call...',
        helperText: 'Paste messy notes, chat fragments, or a quick end-of-day brain dump.',
      },
    ],
    buildPrompt: ({ fields }) =>
      [
        'Turn the rough daily activity log into a practical timesheet.',
        'Write in plain natural language without Markdown headings or tables.',
        'Include time blocks with inferred start and end times.',
        'Then include a short project or task summary.',
        'Then ask any missing-time questions.',
        'End with a polished daily note.',
        section('Rough activity log:', fields.activityLog),
      ].join('\n'),
  },
  {
    id: 'transcript',
    title: 'Transcript Transformer',
    description: 'Turn meeting text into briefs, action plans, client notes, or creative summaries.',
    state: 'Ready prompt',
    runnerType: 'transcript',
    icon: 'mic',
    outputLabel: 'Transcript result',
    capabilityRequirements: ['text-generation'],
    history: {
      storageKey: 'workflow-runs:transcript',
      summaryFieldId: 'transcript',
    },
    fields: [
      {
        id: 'transcript',
        label: 'Meeting transcript',
        type: 'textarea',
        rows: 9,
        required: true,
        placeholder: 'Paste the transcript or raw meeting notes here.',
      },
    ],
    options: [
      {
        id: 'mode',
        label: 'Transform into',
        defaultValue: 'summary',
        choices: [
          { label: 'Summary', value: 'summary' },
          { label: 'Action items', value: 'action-items' },
          { label: 'Client email', value: 'client-email' },
          { label: 'Risks', value: 'risks' },
          { label: 'Creative rewrite', value: 'creative-rewrite' },
          { label: 'Decision log', value: 'decision-log' },
        ],
      },
    ],
    buildPrompt: ({ fields, options }) =>
      [
        `Transform this transcript into: ${options.mode}.`,
        'Use concise natural language. Do not use Markdown headings, hash symbols, tables, or code blocks.',
        'Preserve names, decisions, dates, and commitments when present.',
        section('Transcript:', fields.transcript),
      ].join('\n'),
  },
  {
    id: 'draft',
    title: 'Local Draft Studio',
    description: 'Reusable single-shot prompt workspace for app ideas you want to spin into separate products.',
    state: 'Ready prompt',
    icon: 'fileText',
    outputLabel: 'Draft',
    capabilityRequirements: ['text-generation'],
    history: {
      storageKey: 'workflow-runs:draft',
      summaryFieldId: 'brief',
    },
    fields: [
      {
        id: 'brief',
        label: 'Brief',
        type: 'textarea',
        rows: 8,
        required: true,
        placeholder: 'Describe the thing you want drafted, who it is for, and any must-include details.',
      },
    ],
    options: [
      {
        id: 'tone',
        label: 'Tone',
        defaultValue: 'clear',
        choices: [
          { label: 'Clear', value: 'clear' },
          { label: 'Warm', value: 'warm' },
          { label: 'Direct', value: 'direct' },
          { label: 'Polished', value: 'polished' },
        ],
      },
      {
        id: 'format',
        label: 'Format',
        defaultValue: 'short-draft',
        choices: [
          { label: 'Short draft', value: 'short-draft' },
          { label: 'Email', value: 'email' },
          { label: 'App concept', value: 'app-concept' },
          { label: 'Checklist', value: 'checklist' },
        ],
      },
    ],
    buildPrompt: ({ fields, options }) =>
      [
        `Create a ${options.format} in a ${options.tone} tone.`,
        'Make it immediately usable, structured, and offline-friendly.',
        'Use natural language without Markdown headings unless the user asks for a special format.',
        section('Brief:', fields.brief),
      ].join('\n'),
  },
  {
    id: 'vision',
    title: 'Vision Event Loop',
    description: 'Foundation tile for future camera snapshots every x minutes with local narration.',
    state: 'Needs vision model',
    icon: 'camera',
    outputLabel: 'Vision prompt preview',
    capabilityRequirements: ['vision-model', 'camera-capture'],
    history: {
      storageKey: 'workflow-runs:vision',
      summaryFieldId: 'sceneNotes',
    },
    fields: [
      {
        id: 'sceneNotes',
        label: 'Scene notes placeholder',
        type: 'textarea',
        rows: 6,
        required: true,
        placeholder: 'Describe a camera snapshot or paste future capture metadata here.',
        helperText: 'This is a text-only placeholder until camera capture and multimodal requests land.',
      },
    ],
    options: [
      {
        id: 'cadence',
        label: 'Capture cadence',
        defaultValue: '5-minutes',
        choices: [
          { label: '1 minute', value: '1-minute' },
          { label: '5 minutes', value: '5-minutes' },
          { label: '15 minutes', value: '15-minutes' },
        ],
      },
    ],
    buildPrompt: ({ fields, options }) =>
      [
        'Draft a local vision event narration from the placeholder scene notes.',
        `Assume future snapshots arrive every ${options.cadence}.`,
        'Describe observed events, uncertainty, and what the next capture should check.',
        'Use natural language without Markdown headings or tables.',
        section('Scene notes:', fields.sceneNotes),
        fields.captureNotes ? section('Captured media metadata:', fields.captureNotes) : '',
      ].join('\n'),
  },
];

export const WORKFLOW_REGISTRY = Object.fromEntries(
  WORKFLOW_TEMPLATES.map((workflow) => [workflow.id, workflow]),
) as Record<string, WorkflowTemplate>;

export function getWorkflowTemplate(workflowId: string | undefined) {
  return workflowId ? WORKFLOW_REGISTRY[workflowId] : undefined;
}
