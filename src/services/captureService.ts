export type CaptureMediaKind = 'image' | 'audio';

export type CaptureSource = 'file-picker' | 'native-camera' | 'camera-placeholder' | 'microphone-placeholder';

export interface CapturedMediaBase {
  id: string;
  kind: CaptureMediaKind;
  source: CaptureSource;
  name: string;
  mimeType: string;
  sizeBytes: number;
  capturedAt: string;
  objectUrl?: string;
  localUri?: string;
}

export interface CapturedImageMedia extends CapturedMediaBase {
  kind: 'image';
  width?: number;
  height?: number;
}

export interface CapturedAudioMedia extends CapturedMediaBase {
  kind: 'audio';
  durationSeconds?: number;
}

export type CapturedMedia = CapturedImageMedia | CapturedAudioMedia;

export interface LiteRtLmMultimodalPart {
  type: CaptureMediaKind;
  mimeType: string;
  name: string;
  sizeBytes: number;
  localUri?: string;
  base64?: string;
  metadata: {
    capturedAt: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
  };
}

export interface CaptureMetadataOptions {
  createObjectUrl?: boolean;
}

export function detectCaptureKind(file: File): CaptureMediaKind | null {
  if (file.type.startsWith('image/')) {
    return 'image';
  }

  if (file.type.startsWith('audio/')) {
    return 'audio';
  }

  return null;
}

export async function createCapturedMediaFromFile(
  file: File,
  options: CaptureMetadataOptions = {},
): Promise<CapturedMedia> {
  const kind = detectCaptureKind(file);

  if (!kind) {
    throw new Error(`Unsupported capture media type: ${file.type || file.name}`);
  }

  const objectUrl = options.createObjectUrl ? URL.createObjectURL(file) : undefined;
  const baseMedia = {
    id: createCaptureId(),
    source: 'file-picker' as const,
    name: file.name,
    mimeType: file.type || fallbackMimeType(kind),
    sizeBytes: file.size,
    capturedAt: new Date().toISOString(),
    objectUrl,
  };

  if (kind === 'image') {
    const dimensions = await readImageDimensions(file, objectUrl);

    return {
      ...baseMedia,
      kind,
      ...dimensions,
    };
  }

  const durationSeconds = await readAudioDuration(file, objectUrl);

  return {
    ...baseMedia,
    kind,
    durationSeconds,
  };
}

export function toLiteRtLmMultimodalPart(media: CapturedMedia): LiteRtLmMultimodalPart {
  return {
    type: media.kind,
    mimeType: media.mimeType,
    name: media.name,
    sizeBytes: media.sizeBytes,
    localUri: media.localUri ?? media.objectUrl,
    metadata: {
      capturedAt: media.capturedAt,
      width: media.kind === 'image' ? media.width : undefined,
      height: media.kind === 'image' ? media.height : undefined,
      durationSeconds: media.kind === 'audio' ? media.durationSeconds : undefined,
    },
  };
}

export function createCapturedImageFromNativeCamera(input: {
  name?: string;
  path?: string;
  uri?: string;
  sizeBytes?: number;
  capturedAt: string;
}): CapturedImageMedia {
  return {
    id: createCaptureId(),
    kind: 'image',
    source: 'native-camera',
    name: input.name ?? 'camera-capture.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: input.sizeBytes ?? 0,
    capturedAt: input.capturedAt,
    localUri: input.uri ?? input.path,
  };
}

export function revokeCapturedMediaUrl(media: CapturedMedia): void {
  if (media.objectUrl) {
    URL.revokeObjectURL(media.objectUrl);
  }
}

function createCaptureId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `capture-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fallbackMimeType(kind: CaptureMediaKind): string {
  return kind === 'image' ? 'image/*' : 'audio/*';
}

function readImageDimensions(file: File, existingObjectUrl?: string): Promise<Pick<CapturedImageMedia, 'width' | 'height'>> {
  return new Promise((resolve) => {
    const image = new Image();
    const url = existingObjectUrl ?? URL.createObjectURL(file);

    image.onload = () => {
      if (!existingObjectUrl) {
        URL.revokeObjectURL(url);
      }

      resolve({
        width: image.naturalWidth || undefined,
        height: image.naturalHeight || undefined,
      });
    };

    image.onerror = () => {
      if (!existingObjectUrl) {
        URL.revokeObjectURL(url);
      }

      resolve({});
    };

    image.src = url;
  });
}

function readAudioDuration(file: File, existingObjectUrl?: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const url = existingObjectUrl ?? URL.createObjectURL(file);

    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      if (!existingObjectUrl) {
        URL.revokeObjectURL(url);
      }

      resolve(Number.isFinite(audio.duration) ? audio.duration : undefined);
    };

    audio.onerror = () => {
      if (!existingObjectUrl) {
        URL.revokeObjectURL(url);
      }

      resolve(undefined);
    };

    audio.src = url;
  });
}
