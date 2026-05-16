import { isRecord, readJson, writeJson } from './storage';

export type AppThemeMode = 'light' | 'dark';
export type AppAccentColor = 'teal' | 'indigo' | 'rose' | 'amber';

export interface AppSettings {
  themeMode: AppThemeMode;
  accentColor: AppAccentColor;
  maxTokens: number;
  temperature: number;
  webAccess: boolean;
  activeModelFile: string;
}

const APP_SETTINGS_KEY = 'ai-offline-base.settings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  themeMode: 'light',
  accentColor: 'rose',
  maxTokens: 1024,
  temperature: 0.7,
  webAccess: false,
  activeModelFile: '',
};

export const ACCENT_COLORS: Array<{ id: AppAccentColor; label: string; value: string; rgb: string }> = [
  { id: 'teal', label: 'Teal', value: '#0f766e', rgb: '15 118 110' },
  { id: 'indigo', label: 'Indigo', value: '#4f46e5', rgb: '79 70 229' },
  { id: 'rose', label: 'Rose', value: '#e11d48', rgb: '225 29 72' },
  { id: 'amber', label: 'Amber', value: '#d97706', rgb: '217 119 6' },
];

export function loadAppSettings(): AppSettings {
  return normalizeSettings(readJson<AppSettings>(APP_SETTINGS_KEY, DEFAULT_APP_SETTINGS, isAppSettings));
}

export function saveAppSettings(settings: AppSettings): void {
  writeJson(APP_SETTINGS_KEY, normalizeSettings(settings));
}

export function updateAppSettings(patch: Partial<AppSettings>): AppSettings {
  const settings = normalizeSettings({ ...loadAppSettings(), ...patch });
  saveAppSettings(settings);
  applyAppSettings(settings);
  window.dispatchEvent(new CustomEvent('app-settings-change', { detail: settings }));
  return settings;
}

export function applyAppSettings(settings = loadAppSettings()): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.toggle('dark', settings.themeMode === 'dark');
  root.dataset.theme = settings.themeMode;
  root.dataset.accent = settings.accentColor;

  const accent = ACCENT_COLORS.find((color) => color.id === settings.accentColor) ?? ACCENT_COLORS[0];
  root.style.setProperty('--color-primary', accent.value);
  root.style.setProperty('--color-primary-rgb', accent.rgb);
}

export function normalizeSettings(settings: AppSettings): AppSettings {
  return {
    themeMode: settings.themeMode === 'dark' ? 'dark' : 'light',
    accentColor: 'rose',
    maxTokens: clampNumber(settings.maxTokens, 128, 4096, DEFAULT_APP_SETTINGS.maxTokens),
    temperature: clampNumber(settings.temperature, 0, 1.5, DEFAULT_APP_SETTINGS.temperature),
    webAccess: Boolean(settings.webAccess),
    activeModelFile: typeof settings.activeModelFile === 'string' ? settings.activeModelFile : DEFAULT_APP_SETTINGS.activeModelFile,
  };
}

function isAppSettings(value: unknown): value is AppSettings {
  if (!isRecord(value)) return false;

  return (
    (value.themeMode === 'light' || value.themeMode === 'dark') &&
    ACCENT_COLORS.some((color) => color.id === value.accentColor) &&
    typeof value.maxTokens === 'number' &&
    typeof value.temperature === 'number' &&
    typeof value.webAccess === 'boolean' &&
    (typeof value.activeModelFile === 'string' || value.activeModelFile === undefined)
  );
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
