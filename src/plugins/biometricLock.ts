import { Capacitor, registerPlugin } from '@capacitor/core';

export interface BiometricStatus {
  platform: string;
  available: boolean;
  enrolled: boolean;
  message?: string;
}

export interface BiometricLockPlugin {
  getStatus(): Promise<BiometricStatus>;
  authenticate(request?: { reason?: string }): Promise<{ authenticated: boolean }>;
}

const NativePlugin = registerPlugin<BiometricLockPlugin>('BiometricLock');

const webFallback: BiometricLockPlugin = {
  async getStatus() {
    return {
      platform: 'web',
      available: false,
      enrolled: false,
      message: 'Biometric unlock is available in native Android and iOS builds.',
    };
  },
  async authenticate() {
    return { authenticated: false };
  },
};

export const BiometricLock = Capacitor.getPlatform() === 'web' ? webFallback : NativePlugin;
