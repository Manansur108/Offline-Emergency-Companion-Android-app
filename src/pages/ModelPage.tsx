import { useEffect, useState } from 'react';
import { CheckCircle2, Cpu, FolderOpen, Image, Mic, RefreshCw, XCircle, Zap } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { MODEL_CATALOG, PREFERRED_MODEL, type ModelCatalogEntry } from '../data/modelCatalog';
import { OfflineModel, type OfflineModelStatus } from '../plugins/offlineModel';
import { loadAppSettings, updateAppSettings, type AppSettings } from '../services/appSettings';

interface ModelCandidate {
  name: string;
  modelFile: string;
  runtimeType: string;
  exists: boolean;
  ready: boolean;
  sizeBytes?: number;
  capabilities: string[];
  description?: string;
}

export function ModelPage() {
  const [status, setStatus] = useState<OfflineModelStatus | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshStatus() {
    setIsLoading(true);
    setError(null);
    try {
      setStatus(await OfflineModel.getStatus());
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Could not read model status.');
    } finally {
      setIsLoading(false);
    }
  }

  function selectModel(modelFile: string) {
    setSettings(updateAppSettings({ activeModelFile: modelFile }));
  }

  useEffect(() => {
    let isMounted = true;

    OfflineModel.getStatus()
      .then((nextStatus) => {
        if (isMounted) {
          setStatus(nextStatus);
        }
      })
      .catch((statusError) => {
        if (isMounted) {
          setError(statusError instanceof Error ? statusError.message : 'Could not read model status.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const isReady = Boolean(status?.modelExists && status?.nativeReady);
  const activeModelFile = settings.activeModelFile || status?.modelFileName || PREFERRED_MODEL.modelFile;
  const activeCatalogModel = MODEL_CATALOG.find((model) => model.modelFile === activeModelFile);
  const activeModelName = activeCatalogModel?.name ?? status?.selectedModelName ?? PREFERRED_MODEL.name;
  const foundModels = getModelCandidates(status);

  return (
    <div className="space-y-5 pt-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Local runtime</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Model</h1>
        </div>
        <Button size="icon" variant="ghost" rounded="2xl" onClick={refreshStatus} isLoading={isLoading} aria-label="Refresh model status">
          <RefreshCw size={20} aria-hidden="true" />
        </Button>
      </header>

      <Card className="p-5 rounded-[1.25rem]">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Cpu size={22} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-950">{activeModelName}</h2>
            <p className="mt-1 break-words text-sm text-slate-500">
              Active file: {activeModelFile}
            </p>
            <p className="mt-1 text-sm text-slate-500">{activeCatalogModel?.runtimeType ?? status?.runtimeType ?? PREFERRED_MODEL.runtimeType} on {status?.platform ?? 'checking'}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <StatusRow label="Model file" value={status?.modelExists ? 'Found' : 'Missing'} ok={Boolean(status?.modelExists)} />
          <StatusRow label="Runtime engine" value={status?.nativeReady ? 'Ready' : 'Not ready'} ok={Boolean(status?.nativeReady)} />
          <StatusRow label="Ready to answer" value={isReady ? 'Yes' : 'Not yet'} ok={isReady} />
        </div>

      </Card>

      {error ? (
        <Card className="border border-rose-200 bg-rose-50 p-4 rounded-[1.25rem]">
          <p className="text-sm font-bold text-rose-700">Model status error</p>
          <p className="mt-2 text-sm leading-6 text-rose-600">{error}</p>
        </Card>
      ) : null}

      <section className="grid gap-3">
        {foundModels.map((model) => {
          const catalog = MODEL_CATALOG.find((entry) => entry.modelFile === model.modelFile);
          const isActive = model.modelFile === activeModelFile;
          return (
            <Card key={model.modelFile} className="p-4 rounded-[1.25rem]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-950">{model.name}</h2>
                    {isActive ? (
                      <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white">active</span>
                    ) : null}
                  </div>
                  <p className="mt-1 break-words text-xs font-medium text-slate-500">{model.modelFile}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{model.description ?? catalog?.description ?? 'Local model reported by the runtime.'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                      {model.runtimeType}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                      {formatBytes(model.sizeBytes)}
                    </span>
                    {model.capabilities.map((capability) => (
                      <CapabilityPill key={capability} label={capability} />
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-3">
                  {model.exists || model.ready ? (
                    <CheckCircle2 className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
                  ) : (
                    <XCircle className="mt-1 h-5 w-5 text-rose-500" aria-hidden="true" />
                  )}
                  <Button
                    type="button"
                    variant={isActive ? 'ghost' : 'outline'}
                    size="sm"
                    rounded="2xl"
                    onClick={() => selectModel(model.modelFile)}
                    disabled={isActive}
                  >
                    {isActive ? 'Selected' : 'Select'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <Card className="p-5 rounded-[1.25rem]">
        <div className="flex items-start gap-3">
          <FolderOpen className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-950">Model placement</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Copy the Edge Gallery `.litertlm` file into this app-private folder, then reopen the app.
            </p>
            <p className="mt-3 break-words rounded-2xl bg-slate-900 px-3 py-3 text-xs leading-5 text-white">
              {status?.appModelDirectory ?? '/sdcard/Android/data/com.manan.offlineai/files/models'}
            </p>
          </div>
        </div>
      </Card>

      {status?.message ? (
        <p className="px-1 text-sm leading-6 text-slate-500">{status.message}</p>
      ) : null}
    </div>
  );
}

function getModelCandidates(status: OfflineModelStatus | null): ModelCandidate[] {
  const nativeModels = Array.isArray(status?.foundModels) ? status.foundModels : [];
  const nativeByFile = new Map(nativeModels.map((model) => [model.modelFile, model]));

  const catalogCandidates = MODEL_CATALOG.map((catalog) => {
    const native = nativeByFile.get(catalog.modelFile);
    return toCandidate(catalog, native);
  });

  const unknownNativeModels = nativeModels
    .filter((model) => !MODEL_CATALOG.some((catalog) => catalog.modelFile === model.modelFile))
    .map((model) => toCandidate(undefined, model));

  return [...catalogCandidates, ...unknownNativeModels];
}

function toCandidate(
  catalog: ModelCatalogEntry | undefined,
  native?: NonNullable<OfflineModelStatus['foundModels']>[number],
): ModelCandidate {
  return {
    name: native?.name ?? catalog?.name ?? native?.modelFile ?? 'Local model',
    modelFile: native?.modelFile ?? catalog?.modelFile ?? '',
    runtimeType: native?.runtimeType ?? catalog?.runtimeType ?? 'local',
    exists: Boolean(native?.exists),
    ready: Boolean(native?.ready),
    sizeBytes: native?.sizeBytes ?? catalog?.sizeInBytes,
    capabilities: native?.capabilities ?? getCatalogCapabilities(catalog),
    description: catalog?.description,
  };
}

function getCatalogCapabilities(catalog?: ModelCatalogEntry): string[] {
  if (!catalog) return ['text'];

  return [
    'text',
    catalog.supportsImage ? 'image' : '',
    catalog.supportsAudio ? 'audio' : '',
    catalog.supportsThinking ? 'thinking' : '',
    ...catalog.defaultConfig.accelerators.split(',').map((accelerator) => accelerator.trim()).filter(Boolean),
  ].filter(Boolean);
}

function CapabilityPill({ label }: { label: string }) {
  const Icon = label === 'image' ? Image : label === 'audio' ? Mic : label === 'thinking' ? Zap : null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
      {Icon ? <Icon size={12} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

function formatBytes(sizeBytes?: number): string {
  if (!sizeBytes) return 'size unknown';

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = sizeBytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex min-h-12 items-center justify-between rounded-2xl bg-white/70 px-3">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
        {ok ? <CheckCircle2 size={16} className="text-primary" /> : <XCircle size={16} className="text-rose-500" />}
        {value}
      </span>
    </div>
  );
}
