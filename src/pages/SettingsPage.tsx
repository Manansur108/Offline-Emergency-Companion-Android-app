import { useState } from 'react';
import { Database, Gauge, Globe2, Lock, Paintbrush, Smartphone, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MemorySettings } from '../components/memory/MemorySettings';
import { NativeFeatureSettings } from '../components/settings/NativeFeatureSettings';
import { clearAllAppMemory, getAppMemorySummary } from '../services/appMemory';
import {
  ACCENT_COLORS,
  DEFAULT_APP_SETTINGS,
  applyAppSettings,
  loadAppSettings,
  updateAppSettings,
  type AppSettings,
} from '../services/appSettings';

export function SettingsPage() {
  const [memorySummary, setMemorySummary] = useState(() => getAppMemorySummary());
  const [memoryRefreshKey, setMemoryRefreshKey] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const settingsSummary = [
    { icon: Gauge, label: 'Max tokens', value: `${settings.maxTokens}` },
    { icon: SlidersHorizontal, label: 'Temperature', value: settings.temperature.toFixed(1) },
    { icon: Lock, label: 'Web access', value: settings.webAccess ? 'On' : 'Off' },
  ];

  function deleteAllHistory() {
    clearAllAppMemory();
    applyAppSettings(DEFAULT_APP_SETTINGS);
    setSettings(DEFAULT_APP_SETTINGS);
    setMemorySummary(getAppMemorySummary());
    setMemoryRefreshKey((key) => key + 1);
  }

  function updateSetting(patch: Partial<AppSettings>) {
    const nextSettings = updateAppSettings(patch);
    setSettings(nextSettings);
  }

  return (
    <div className="space-y-5 pt-4">
      <header>
        <p className="text-sm font-semibold text-primary">Foundation defaults</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Settings</h1>
      </header>

      <section className="grid gap-3">
        {settingsSummary.map((item) => (
          <Card key={item.label} className="p-4 rounded-[1.25rem]">
            <div className="flex min-h-12 items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <item.icon size={19} aria-hidden="true" />
                </div>
                <span className="text-sm font-bold text-slate-800">{item.label}</span>
              </div>
              <span className="text-right text-sm font-semibold text-slate-500">{item.value}</span>
            </div>
          </Card>
        ))}
      </section>

      <Card className="space-y-5 p-4 rounded-[1.25rem]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <SlidersHorizontal size={19} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Model controls</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Saved defaults used by chat and workflows.</p>
          </div>
        </div>

        <SettingRange
          id="max-tokens"
          label="Max tokens"
          value={settings.maxTokens}
          min={128}
          max={4096}
          step={128}
          displayValue={`${settings.maxTokens}`}
          onChange={(value) => updateSetting({ maxTokens: value })}
        />

        <SettingRange
          id="temperature"
          label="Temperature"
          value={settings.temperature}
          min={0}
          max={1.5}
          step={0.1}
          displayValue={settings.temperature.toFixed(1)}
          onChange={(value) => updateSetting({ temperature: Number(value.toFixed(1)) })}
        />

        <ToggleRow
          icon={Globe2}
          label="Web access"
          description="When enabled, the app can fetch a small web context for latest-information prompts before local generation."
          checked={settings.webAccess}
          onChange={(checked) => updateSetting({ webAccess: checked })}
        />
      </Card>

      <Card className="space-y-4 p-4 rounded-[1.25rem]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Paintbrush size={19} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Color theme</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Changes buttons, active nav, and accent controls.</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {ACCENT_COLORS.map((color) => {
            const isSelected = color.id === settings.accentColor;

            return (
              <button
                key={color.id}
                type="button"
                onClick={() => updateSetting({ accentColor: color.id })}
                className={
                  isSelected
                    ? 'min-h-12 rounded-2xl border-2 border-slate-950 bg-white/80 p-1 dark:border-white'
                    : 'min-h-12 rounded-2xl border border-teal-900/10 bg-white/70 p-1'
                }
                aria-label={`Use ${color.label} color theme`}
              >
                <span className="block h-full rounded-xl" style={{ backgroundColor: color.value }} />
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-4 p-4 rounded-[1.25rem]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Smartphone size={19} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Native phone features</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Test notifications, camera capture, biometric unlock, and haptics from one place.
            </p>
          </div>
        </div>
        <NativeFeatureSettings />
      </Card>

      <Card className="space-y-4 p-4 rounded-[1.25rem]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Database size={19} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-800">Local memory</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {memorySummary.itemCount} saved areas, about {formatBytes(memorySummary.sizeBytes)} on this device.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          rounded="2xl"
          onClick={deleteAllHistory}
          className="min-h-11 w-full gap-2 text-rose-600 hover:bg-rose-50"
        >
          <Trash2 size={16} aria-hidden="true" />
          Delete all saved history
        </Button>

        <MemorySettings key={memoryRefreshKey} onChange={() => setMemorySummary(getAppMemorySummary())} />
      </Card>
    </div>
  );
}

interface SettingRangeProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
}

function SettingRange({ id, label, value, min, max, step, displayValue, onChange }: SettingRangeProps) {
  return (
    <div className="block space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-bold text-slate-800" htmlFor={id}>
          {label}
        </label>
        <input
          aria-label={`${label} value`}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-10 w-24 rounded-xl border border-teal-900/10 bg-white/70 px-3 text-right text-sm font-bold text-slate-700 outline-none focus:border-teal-700"
        />
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--color-primary)]"
      />
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: typeof Globe2;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/60 p-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon size={18} aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={
          checked
            ? 'relative h-8 w-14 shrink-0 rounded-full bg-primary transition'
            : 'relative h-8 w-14 shrink-0 rounded-full bg-slate-300 transition dark:bg-slate-700'
        }
        aria-pressed={checked}
        aria-label={`${label} ${checked ? 'on' : 'off'}`}
      >
        <span
          className={
            checked
              ? 'absolute right-1 top-1 h-6 w-6 rounded-full bg-white shadow transition'
              : 'absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition'
          }
        />
      </button>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round(bytes / 1024)} KB`;
}
