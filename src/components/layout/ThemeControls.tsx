import { Moon, Palette, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ACCENT_COLORS,
  applyAppSettings,
  loadAppSettings,
  updateAppSettings,
  type AppSettings,
} from '../../services/appSettings';

export function ThemeControls() {
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());

  useEffect(() => {
    applyAppSettings(settings);

    function handleSettingsChange(event: Event) {
      const nextSettings = (event as CustomEvent<AppSettings>).detail ?? loadAppSettings();
      setSettings(nextSettings);
      applyAppSettings(nextSettings);
    }

    window.addEventListener('app-settings-change', handleSettingsChange);
    return () => window.removeEventListener('app-settings-change', handleSettingsChange);
  }, [settings]);

  function toggleTheme() {
    setSettings(updateAppSettings({ themeMode: settings.themeMode === 'dark' ? 'light' : 'dark' }));
  }

  function cycleAccent() {
    const currentIndex = ACCENT_COLORS.findIndex((color) => color.id === settings.accentColor);
    const nextAccent = ACCENT_COLORS[(currentIndex + 1) % ACCENT_COLORS.length];
    setSettings(updateAppSettings({ accentColor: nextAccent.id }));
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-900/10 bg-white/80 text-slate-600 shadow-sm backdrop-blur transition active:scale-95 dark:border-white/10 dark:bg-slate-900/85 dark:text-slate-100"
        aria-label={settings.themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        title={settings.themeMode === 'dark' ? 'Light theme' : 'Dark theme'}
      >
        {settings.themeMode === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      </button>
      <button
        type="button"
        onClick={cycleAccent}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-900/10 bg-white/80 text-primary shadow-sm backdrop-blur transition active:scale-95 dark:border-white/10 dark:bg-slate-900/85"
        aria-label="Change button color theme"
        title="Change color"
      >
        <Palette size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
