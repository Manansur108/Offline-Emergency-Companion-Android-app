import { Capacitor, registerPlugin } from '@capacitor/core';

export interface HapticsBridgePlugin {
  impact(request?: { style?: 'light' | 'medium' | 'heavy' }): Promise<void>;
}

const NativePlugin = registerPlugin<HapticsBridgePlugin>('HapticsBridge');

const webFallback: HapticsBridgePlugin = {
  async impact() {
    navigator.vibrate?.(18);
  },
};

export const HapticsBridge = Capacitor.getPlatform() === 'web' ? webFallback : NativePlugin;
