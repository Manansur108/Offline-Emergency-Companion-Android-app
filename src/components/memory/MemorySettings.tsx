import { useState } from 'react';
import { Check, Edit3, Plus, Save, Trash2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  APP_MEMORY_CATEGORIES,
  APP_MEMORY_MAX_CONTENT_LENGTH,
  APP_MEMORY_MAX_ENTRIES,
  addAppMemoryEntry,
  deleteAppMemoryEntry,
  loadAppMemoryEntries,
  toggleAppMemoryEntry,
  updateAppMemoryEntry,
  type AppMemoryCategory,
  type AppMemoryDraft,
  type AppMemoryEntry,
} from '../../services/appMemoryStore';

interface MemorySettingsProps {
  onChange?: () => void;
}

const EMPTY_DRAFT: AppMemoryDraft = {
  title: '',
  content: '',
  category: 'preference',
  enabled: true,
};

export function MemorySettings({ onChange }: MemorySettingsProps) {
  const [entries, setEntries] = useState<AppMemoryEntry[]>(() => loadAppMemoryEntries());
  const [draft, setDraft] = useState<AppMemoryDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<AppMemoryDraft>(EMPTY_DRAFT);

  function sync(nextEntries: AppMemoryEntry[]) {
    setEntries(nextEntries);
    onChange?.();
  }

  function addMemory() {
    sync(addAppMemoryEntry(draft));
    setDraft(EMPTY_DRAFT);
  }

  function startEditing(entry: AppMemoryEntry) {
    setEditingId(entry.id);
    setEditingDraft({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      enabled: entry.enabled,
    });
  }

  function saveEditing(id: string) {
    sync(updateAppMemoryEntry(id, editingDraft));
    setEditingId(null);
    setEditingDraft(EMPTY_DRAFT);
  }

  const canAdd = Boolean(draft.content.trim()) && entries.length < APP_MEMORY_MAX_ENTRIES;

  return (
    <div className="space-y-4">
      <MemoryForm
        draft={draft}
        onDraftChange={setDraft}
        actionLabel="Add memory"
        actionIcon={Plus}
        onSubmit={addMemory}
        disabled={!canAdd}
      />

      <div className="space-y-3">
        {entries.length ? (
          entries.map((entry) =>
            editingId === entry.id ? (
              <div key={entry.id} className="space-y-3 rounded-2xl bg-white/60 p-3">
                <MemoryForm
                  draft={editingDraft}
                  onDraftChange={setEditingDraft}
                  actionLabel="Save"
                  actionIcon={Save}
                  onSubmit={() => saveEditing(entry.id)}
                  disabled={!editingDraft.content.trim()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  rounded="2xl"
                  className="min-h-10 w-full gap-2"
                  onClick={() => setEditingId(null)}
                >
                  <X size={15} aria-hidden="true" />
                  Cancel
                </Button>
              </div>
            ) : (
              <MemoryRow
                key={entry.id}
                entry={entry}
                onToggle={() => sync(toggleAppMemoryEntry(entry.id))}
                onEdit={() => startEditing(entry)}
                onDelete={() => sync(deleteAppMemoryEntry(entry.id))}
              />
            ),
          )
        ) : (
          <p className="rounded-2xl bg-white/60 p-3 text-sm font-medium text-slate-500">No saved memories.</p>
        )}
      </div>
    </div>
  );
}

interface MemoryFormProps {
  draft: AppMemoryDraft;
  actionLabel: string;
  actionIcon: typeof Plus;
  disabled: boolean;
  onDraftChange: (draft: AppMemoryDraft) => void;
  onSubmit: () => void;
}

function MemoryForm({ draft, actionLabel, actionIcon: ActionIcon, disabled, onDraftChange, onSubmit }: MemoryFormProps) {
  return (
    <div className="space-y-3 rounded-2xl bg-white/60 p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          value={draft.title}
          onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
          placeholder="Title"
          className="min-h-11 rounded-xl border border-teal-900/10 bg-white/80 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-teal-700"
        />
        <select
          value={draft.category}
          onChange={(event) => onDraftChange({ ...draft, category: event.target.value as AppMemoryCategory })}
          className="min-h-11 rounded-xl border border-teal-900/10 bg-white/80 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-teal-700"
          aria-label="Memory category"
        >
          {APP_MEMORY_CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={draft.content}
        maxLength={APP_MEMORY_MAX_CONTENT_LENGTH}
        onChange={(event) => onDraftChange({ ...draft, content: event.target.value })}
        placeholder="Memory"
        rows={3}
        className="min-h-24 w-full resize-none rounded-xl border border-teal-900/10 bg-white/80 px-3 py-2 text-sm font-medium leading-6 text-slate-700 outline-none focus:border-teal-700"
      />
      <Button
        type="button"
        variant="primary"
        size="sm"
        rounded="2xl"
        onClick={onSubmit}
        disabled={disabled}
        className="min-h-11 w-full gap-2"
      >
        <ActionIcon size={16} aria-hidden="true" />
        {actionLabel}
      </Button>
    </div>
  );
}

function MemoryRow({
  entry,
  onToggle,
  onEdit,
  onDelete,
}: {
  entry: AppMemoryEntry;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const category = APP_MEMORY_CATEGORIES.find((item) => item.id === entry.category)?.label ?? 'Note';

  return (
    <div className="rounded-2xl bg-white/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-800">{entry.title}</p>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{category}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{entry.content}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={
            entry.enabled
              ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white'
              : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500'
          }
          aria-pressed={entry.enabled}
          aria-label={`${entry.title} ${entry.enabled ? 'enabled' : 'disabled'}`}
        >
          <Check size={15} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" variant="ghost" size="sm" rounded="2xl" className="min-h-10 gap-2" onClick={onEdit}>
          <Edit3 size={15} aria-hidden="true" />
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          rounded="2xl"
          className="min-h-10 gap-2 text-rose-600 hover:bg-rose-50"
          onClick={onDelete}
        >
          <Trash2 size={15} aria-hidden="true" />
          Delete
        </Button>
      </div>
    </div>
  );
}
