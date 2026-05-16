import { Camera, FileAudio, FileImage, Loader2, Mic2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';

import {
  createCapturedImageFromNativeCamera,
  createCapturedMediaFromFile,
  revokeCapturedMediaUrl,
  toLiteRtLmMultimodalPart,
  type CapturedMedia,
  type CaptureMediaKind,
  type LiteRtLmMultimodalPart,
} from '../../services/captureService';
import { CameraCapture } from '../../plugins/cameraCapture';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface CaptureInputProps {
  label?: string;
  description?: string;
  acceptedKinds?: CaptureMediaKind[];
  onCapture?: (media: CapturedMedia, part: LiteRtLmMultimodalPart) => void;
  onClear?: () => void;
}

const acceptByKind: Record<CaptureMediaKind, string> = {
  image: 'image/*',
  audio: 'audio/*',
};

export function CaptureInput({
  label = 'Capture input',
  description = 'Use local file placeholders for camera snapshots and microphone clips. Nothing leaves this device.',
  acceptedKinds = ['image', 'audio'],
  onCapture,
  onClear,
}: CaptureInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<CapturedMedia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);

  const accept = useMemo(
    () => acceptedKinds.map((kind) => acceptByKind[kind]).join(','),
    [acceptedKinds],
  );
  const supportsImages = acceptedKinds.includes('image');
  const supportsAudio = acceptedKinds.includes('audio');

  useEffect(() => {
    return () => {
      if (media) {
        revokeCapturedMediaUrl(media);
      }
    };
  }, [media]);

  const handleSelect = () => {
    inputRef.current?.click();
  };

  const handleNativeCamera = async () => {
    setIsOpeningCamera(true);
    setError(null);

    try {
      const captured = await CameraCapture.capturePhoto();
      const nextMedia = createCapturedImageFromNativeCamera(captured);
      setMedia((previous) => {
        if (previous) {
          revokeCapturedMediaUrl(previous);
        }

        return nextMedia;
      });
      onCapture?.(nextMedia, toLiteRtLmMultimodalPart(nextMedia));
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Camera capture failed.');
    } finally {
      setIsOpeningCamera(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setIsReading(true);
    setError(null);

    try {
      const nextMedia = await createCapturedMediaFromFile(file, { createObjectUrl: true });

      if (!acceptedKinds.includes(nextMedia.kind)) {
        revokeCapturedMediaUrl(nextMedia);
        setError(`This workflow accepts ${acceptedKinds.join(' or ')} files.`);
        return;
      }

      setMedia((previous) => {
        if (previous) {
          revokeCapturedMediaUrl(previous);
        }

        return nextMedia;
      });
      onCapture?.(nextMedia, toLiteRtLmMultimodalPart(nextMedia));
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Unable to read that file.');
    } finally {
      setIsReading(false);
    }
  };

  const handleClear = () => {
    setMedia((previous) => {
      if (previous) {
        revokeCapturedMediaUrl(previous);
      }

      return null;
    });
    setError(null);
    onClear?.();
  };

  return (
    <Card className="space-y-4 rounded-[1.25rem] p-4" glass={false}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30">
          {supportsImages ? <Camera size={20} aria-hidden="true" /> : <Mic2 size={20} aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-slate-950">{label}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {supportsImages ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <FileImage size={16} aria-hidden="true" />
              Image placeholder
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">File picker now, camera path later.</p>
          </div>
        ) : null}
        {supportsAudio ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <FileAudio size={16} aria-hidden="true" />
              Audio placeholder
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">File picker now, mic recorder later.</p>
          </div>
        ) : null}
      </div>

      <input ref={inputRef} className="hidden" type="file" accept={accept} onChange={handleFileChange} />

      {media ? <CapturePreview media={media} onClear={handleClear} /> : null}

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button className="w-full" type="button" variant="outline" onClick={handleSelect} disabled={isReading}>
          {isReading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Choose local media
        </Button>
        {supportsImages ? (
          <Button className="w-full" type="button" onClick={handleNativeCamera} disabled={isOpeningCamera}>
            {isOpeningCamera ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Open camera
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

interface CapturePreviewProps {
  media: CapturedMedia;
  onClear: () => void;
}

function CapturePreview({ media, onClear }: CapturePreviewProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950">{media.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {media.mimeType} - {formatBytes(media.sizeBytes)}
          </p>
        </div>
        <Button aria-label="Clear captured media" size="icon" type="button" variant="ghost" onClick={onClear}>
          <X size={16} aria-hidden="true" />
        </Button>
      </div>

      {media.kind === 'image' && media.objectUrl ? (
        <img
          alt=""
          className="mt-3 max-h-56 w-full rounded-xl object-cover"
          src={media.objectUrl}
        />
      ) : null}

      {media.kind === 'audio' && media.objectUrl ? (
        <audio className="mt-3 w-full" controls src={media.objectUrl}>
          <track kind="captions" />
        </audio>
      ) : null}

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div>
          <dt className="font-semibold text-slate-900">Kind</dt>
          <dd>{media.kind}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Captured</dt>
          <dd>{new Date(media.capturedAt).toLocaleString()}</dd>
        </div>
        {media.kind === 'image' ? (
          <div>
            <dt className="font-semibold text-slate-900">Dimensions</dt>
            <dd>{formatDimensions(media.width, media.height)}</dd>
          </div>
        ) : (
          <div>
            <dt className="font-semibold text-slate-900">Duration</dt>
            <dd>{formatDuration(media.durationSeconds)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDimensions(width?: number, height?: number): string {
  if (!width || !height) {
    return 'Unknown';
  }

  return `${width} x ${height}`;
}

function formatDuration(durationSeconds?: number): string {
  if (durationSeconds === undefined) {
    return 'Unknown';
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.round(durationSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
