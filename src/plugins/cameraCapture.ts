import { Capacitor, registerPlugin } from '@capacitor/core';
import { NativeReminders } from './nativeReminders';

export interface CameraCaptureResponse {
  path?: string;
  uri?: string;
  name?: string;
  sizeBytes?: number;
  capturedAt: string;
}

export interface CameraCapturePlugin {
  capturePhoto(): Promise<CameraCaptureResponse>;
}

const NativePlugin = registerPlugin<CameraCapturePlugin>('CameraCapture');

const webFallback: CameraCapturePlugin = {
  async capturePhoto() {
    throw new Error('Camera capture is available in the Android app build. Browser preview can still upload image files.');
  },
};

export const CameraCapture = Capacitor.getPlatform() === 'web' ? webFallback : NativePlugin;

export async function scheduleCameraCaptureReminder(minutes: number) {
  const delayMs = Math.max(1, minutes) * 60 * 1000;
  await NativeReminders.requestPermissions();
  return NativeReminders.schedule({
    id: Date.now(),
    title: 'Offline AI camera check',
    body: 'Open Offline AI Base and capture the next scene snapshot.',
    delayMs,
  });
}
