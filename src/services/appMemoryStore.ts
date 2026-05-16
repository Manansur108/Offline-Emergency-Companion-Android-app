import { isRecord, readJson, writeJson } from './storage';

export type AppMemoryCategory = 'preference' | 'profile' | 'project' | 'instruction' | 'note';

export interface AppMemoryEntry {
  id: string;
  title: string;
  content: string;
  category: AppMemoryCategory;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AppMemoryState {
  version: 1;
  entries: AppMemoryEntry[];
}

export interface AppMemoryDraft {
  title: string;
  content: string;
  category: AppMemoryCategory;
  enabled?: boolean;
}

export const APP_MEMORY_STORE_KEY = 'ai-offline-base.app-memory';
export const APP_MEMORY_MAX_ENTRIES = 50;
export const APP_MEMORY_MAX_TITLE_LENGTH = 80;
export const APP_MEMORY_MAX_CONTENT_LENGTH = 1000;

export const APP_MEMORY_CATEGORIES: Array<{ id: AppMemoryCategory; label: string }> = [
  { id: 'preference', label: 'Preference' },
  { id: 'profile', label: 'Profile' },
  { id: 'project', label: 'Project' },
  { id: 'instruction', label: 'Instruction' },
  { id: 'note', label: 'Note' },
];

const DEFAULT_APP_MEMORY_STATE: AppMemoryState = {
  version: 1,
  entries: [],
};

export function loadAppMemoryEntries(): AppMemoryEntry[] {
  return normalizeEntries(readMemoryState().entries);
}

export function addAppMemoryEntry(draft: AppMemoryDraft): AppMemoryEntry[] {
  const now = new Date().toISOString();
  const entry: AppMemoryEntry = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    title: cleanText(draft.title, APP_MEMORY_MAX_TITLE_LENGTH) || 'Untitled memory',
    content: cleanText(draft.content, APP_MEMORY_MAX_CONTENT_LENGTH),
    category: normalizeCategory(draft.category),
    enabled: draft.enabled ?? true,
    createdAt: now,
    updatedAt: now,
  };

  if (!entry.content) return loadAppMemoryEntries();

  return saveAppMemoryEntries([entry, ...loadAppMemoryEntries()]);
}

export function updateAppMemoryEntry(id: string, draft: AppMemoryDraft): AppMemoryEntry[] {
  const nextEntries = loadAppMemoryEntries().map((entry) => {
    if (entry.id !== id) return entry;

    return {
      ...entry,
      title: cleanText(draft.title, APP_MEMORY_MAX_TITLE_LENGTH) || 'Untitled memory',
      content: cleanText(draft.content, APP_MEMORY_MAX_CONTENT_LENGTH),
      category: normalizeCategory(draft.category),
      enabled: draft.enabled ?? entry.enabled,
      updatedAt: new Date().toISOString(),
    };
  });

  return saveAppMemoryEntries(nextEntries.filter((entry) => entry.content));
}

export function deleteAppMemoryEntry(id: string): AppMemoryEntry[] {
  return saveAppMemoryEntries(loadAppMemoryEntries().filter((entry) => entry.id !== id));
}

export function toggleAppMemoryEntry(id: string): AppMemoryEntry[] {
  return saveAppMemoryEntries(
    loadAppMemoryEntries().map((entry) =>
      entry.id === id ? { ...entry, enabled: !entry.enabled, updatedAt: new Date().toISOString() } : entry,
    ),
  );
}

export function buildAppMemoryPromptContext(limit = 8): string {
  const entries = loadAppMemoryEntries()
    .filter((entry) => entry.enabled)
    .slice(0, limit);

  if (!entries.length) return '';

  return [
    'Local app memory:',
    ...entries.map((entry) => `- [${entry.category}] ${entry.title}: ${entry.content}`),
    'Use these memories only when relevant to the user request.',
  ].join('\n');
}

function saveAppMemoryEntries(entries: AppMemoryEntry[]): AppMemoryEntry[] {
  const normalizedEntries = normalizeEntries(entries).slice(0, APP_MEMORY_MAX_ENTRIES);
  writeJson<AppMemoryState>(APP_MEMORY_STORE_KEY, {
    version: 1,
    entries: normalizedEntries,
  });
  dispatchMemoryChange(normalizedEntries);
  return normalizedEntries;
}

function readMemoryState(): AppMemoryState {
  return readJson<AppMemoryState>(APP_MEMORY_STORE_KEY, DEFAULT_APP_MEMORY_STATE, isAppMemoryState);
}

function normalizeEntries(entries: AppMemoryEntry[]): AppMemoryEntry[] {
  return entries
    .map((entry) => ({
      ...entry,
      title: cleanText(entry.title, APP_MEMORY_MAX_TITLE_LENGTH) || 'Untitled memory',
      content: cleanText(entry.content, APP_MEMORY_MAX_CONTENT_LENGTH),
      category: normalizeCategory(entry.category),
      enabled: Boolean(entry.enabled),
      createdAt: isIsoDate(entry.createdAt) ? entry.createdAt : new Date().toISOString(),
      updatedAt: isIsoDate(entry.updatedAt) ? entry.updatedAt : entry.createdAt,
    }))
    .filter((entry) => entry.content)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function dispatchMemoryChange(entries: AppMemoryEntry[]): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent('app-memory-change', { detail: entries }));
}

function isAppMemoryState(value: unknown): value is AppMemoryState {
  if (!isRecord(value)) return false;
  if (value.version !== 1 || !Array.isArray(value.entries)) return false;

  return value.entries.every(isAppMemoryEntry);
}

function isAppMemoryEntry(value: unknown): value is AppMemoryEntry {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.content === 'string' &&
    isAppMemoryCategory(value.category) &&
    typeof value.enabled === 'boolean' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isAppMemoryCategory(value: unknown): value is AppMemoryCategory {
  return APP_MEMORY_CATEGORIES.some((category) => category.id === value);
}

function normalizeCategory(value: AppMemoryCategory): AppMemoryCategory {
  return isAppMemoryCategory(value) ? value : 'note';
}

function cleanText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function isIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}
