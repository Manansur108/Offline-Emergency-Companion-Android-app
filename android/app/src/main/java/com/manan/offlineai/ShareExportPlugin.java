package com.manan.offlineai;

import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "ShareExport")
public class ShareExportPlugin extends Plugin {
    @PluginMethod
    public void shareText(PluginCall call) {
        String text = call.getString("text", "");
        String title = call.getString("title", "Offline AI export");

        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_SUBJECT, title);
        intent.putExtra(Intent.EXTRA_TEXT, text);
        getActivity().startActivity(Intent.createChooser(intent, title));

        JSObject response = new JSObject();
        response.put("shared", true);
        call.resolve(response);
    }

    @PluginMethod
    public void exportTextFile(PluginCall call) {
        String text = call.getString("text", "");
        String title = call.getString("title", "Offline AI export");
        String fileName = sanitizeFileName(call.getString("fileName", "offline-ai-export.md"));
        String mimeType = call.getString("mimeType", "text/markdown");

        try {
            File exportsDir = new File(getContext().getCacheDir(), "exports");
            if (!exportsDir.exists() && !exportsDir.mkdirs()) {
                call.reject("Could not create export folder.");
                return;
            }

            File exportFile = new File(exportsDir, fileName);
            try (FileOutputStream outputStream = new FileOutputStream(exportFile)) {
                outputStream.write(text.getBytes(StandardCharsets.UTF_8));
            }

            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", exportFile);
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType(mimeType);
            intent.putExtra(Intent.EXTRA_SUBJECT, title);
            intent.putExtra(Intent.EXTRA_STREAM, uri);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(intent, title));

            JSObject response = new JSObject();
            response.put("path", exportFile.getAbsolutePath());
            response.put("shared", true);
            call.resolve(response);
        } catch (Exception error) {
            call.reject("Export failed: " + error.getMessage());
        }
    }

    private String sanitizeFileName(String value) {
        String clean = value.replaceAll("[^a-zA-Z0-9._-]", "_");
        return clean.isEmpty() ? "offline-ai-export.md" : clean;
    }
}
