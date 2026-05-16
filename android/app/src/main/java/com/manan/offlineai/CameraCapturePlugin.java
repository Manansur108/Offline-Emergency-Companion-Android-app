package com.manan.offlineai;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.util.Date;
import java.util.Locale;

@CapacitorPlugin(
        name = "CameraCapture",
        permissions = {
                @Permission(alias = "camera", strings = { Manifest.permission.CAMERA })
        }
)
public class CameraCapturePlugin extends Plugin {
    private File pendingPhotoFile;
    private Uri pendingPhotoUri;

    @PluginMethod
    public void capturePhoto(PluginCall call) {
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            requestPermissionForAlias("camera", call, "cameraPermissionCallback");
            return;
        }

        openCamera(call);
    }

    @PermissionCallback
    private void cameraPermissionCallback(PluginCall call) {
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            call.reject("Camera permission is required.");
            return;
        }

        openCamera(call);
    }

    private void openCamera(PluginCall call) {
        try {
            File picturesDir = new File(getContext().getFilesDir(), "camera");
            if (!picturesDir.exists() && !picturesDir.mkdirs()) {
                call.reject("Could not create camera folder.");
                return;
            }

            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
            pendingPhotoFile = new File(picturesDir, "offline_ai_" + timestamp + ".jpg");
            pendingPhotoUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", pendingPhotoFile);

            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, pendingPhotoUri);
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(call, intent, "handleCameraResult");
        } catch (Exception error) {
            call.reject("Camera launch failed: " + error.getMessage());
        }
    }

    @ActivityCallback
    private void handleCameraResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK || pendingPhotoFile == null) {
            call.reject("No photo was captured.");
            return;
        }

        JSObject response = new JSObject();
        response.put("path", pendingPhotoFile.getAbsolutePath());
        response.put("uri", pendingPhotoUri == null ? "" : pendingPhotoUri.toString());
        response.put("name", pendingPhotoFile.getName());
        response.put("sizeBytes", pendingPhotoFile.length());
        response.put("capturedAt", Instant.now().toString());
        call.resolve(response);
    }
}
