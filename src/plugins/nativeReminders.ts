import { Capacitor, registerPlugin } from '@capacitor/core';

export interface ReminderRequest {
  id?: number;
  title: string;
  body: string;
  delayMs?: number;
  at?: string;
}

export interface ReminderResponse {
  id: number;
  scheduledAt: string;
}

export interface NativeRemindersPlugin {
  requestPermissions(): Promise<{ granted: boolean }>;
  schedule(request: ReminderRequest): Promise<ReminderResponse>;
  cancel(request: { id: number }): Promise<{ cancelled: boolean }>;
}

const NativePlugin = registerPlugin<NativeRemindersPlugin>('NativeReminders');

const webFallback: NativeRemindersPlugin = {
  async requestPermissions() {
    if (!('Notification' in window)) return { granted: false };
    const permission = await Notification.requestPermission();
    return { granted: permission === 'granted' };
  },
  async schedule(request) {
    const id = request.id ?? Date.now();
    const scheduledAt = request.at ?? new Date(Date.now() + (request.delayMs ?? 1000)).toISOString();
    const delayMs = Math.max(0, new Date(scheduledAt).getTime() - Date.now());
    window.setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(request.title, { body: request.body });
      }
    }, delayMs);
    return { id, scheduledAt };
  },
  async cancel() {
    return { cancelled: false };
  },
};

export const NativeReminders = Capacitor.getPlatform() === 'web' ? webFallback : NativePlugin;
