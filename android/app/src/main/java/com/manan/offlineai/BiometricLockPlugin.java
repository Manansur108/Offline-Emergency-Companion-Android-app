package com.manan.offlineai;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "BiometricLock")
public class BiometricLockPlugin extends Plugin {
    @PluginMethod
    public void getStatus(PluginCall call) {
        int authenticators = BiometricManager.Authenticators.BIOMETRIC_WEAK | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
        int status = BiometricManager.from(getContext()).canAuthenticate(authenticators);

        JSObject response = new JSObject();
        response.put("platform", "android");
        response.put("available", status == BiometricManager.BIOMETRIC_SUCCESS);
        response.put("enrolled", status == BiometricManager.BIOMETRIC_SUCCESS);
        response.put("message", statusMessage(status));
        call.resolve(response);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        int authenticators = BiometricManager.Authenticators.BIOMETRIC_WEAK | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
        int status = BiometricManager.from(getContext()).canAuthenticate(authenticators);
        if (status != BiometricManager.BIOMETRIC_SUCCESS) {
            call.reject(statusMessage(status));
            return;
        }

        Executor executor = ContextCompat.getMainExecutor(getContext());
        BiometricPrompt prompt = new BiometricPrompt((FragmentActivity) getActivity(), executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                JSObject response = new JSObject();
                response.put("authenticated", true);
                call.resolve(response);
            }

            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                call.reject(errString.toString());
            }

            @Override
            public void onAuthenticationFailed() {
                call.reject("Biometric authentication failed.");
            }
        });

        String reason = call.getString("reason", "Unlock Offline AI Base");
        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Offline AI Base")
                .setSubtitle(reason)
                .setAllowedAuthenticators(authenticators)
                .build();

        prompt.authenticate(promptInfo);
    }

    private String statusMessage(int status) {
        switch (status) {
            case BiometricManager.BIOMETRIC_SUCCESS:
                return "Biometric or device credential unlock is available.";
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                return "No biometric or device credential is enrolled.";
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                return "This device does not have biometric hardware.";
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                return "Biometric hardware is currently unavailable.";
            default:
                return "Biometric unlock is not available.";
        }
    }
}
