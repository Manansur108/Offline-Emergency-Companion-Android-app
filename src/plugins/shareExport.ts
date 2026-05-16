import { Capacitor, registerPlugin } from '@capacitor/core';

export interface ShareExportRequest {
  title?: string;
  text: string;
  fileName?: string;
  mimeType?: string;
}

export interface ShareExportPlugin {
  shareText(request: ShareExportRequest): Promise<{ shared: boolean }>;
  exportTextFile(request: ShareExportRequest): Promise<{ path?: string; shared: boolean }>;
}

const NativePlugin = registerPlugin<ShareExportPlugin>('ShareExport');

const webFallback: ShareExportPlugin = {
  async shareText(request) {
    if (navigator.share) {
      await navigator.share({ title: request.title, text: request.text });
      return { shared: true };
    }
    await navigator.clipboard?.writeText(request.text);
    return { shared: false };
  },
  async exportTextFile(request) {
    const blob = new Blob([request.text], { type: request.mimeType ?? 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = request.fileName ?? 'offline-ai-export.md';
    anchor.click();
    URL.revokeObjectURL(url);
    return { shared: false };
  },
};

export const ShareExport = Capacitor.getPlatform() === 'web' ? webFallback : NativePlugin;
