package com.manan.offlineai;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OfflineModelPlugin.class);
        registerPlugin(VoiceIOPlugin.class);
        registerPlugin(NativeRemindersPlugin.class);
        registerPlugin(ShareExportPlugin.class);
        registerPlugin(CameraCapturePlugin.class);
        registerPlugin(BiometricLockPlugin.class);
        registerPlugin(HapticsBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
