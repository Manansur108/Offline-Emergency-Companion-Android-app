package com.manan.offlineai;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "OfflineModel")
public class OfflineModelPlugin extends Plugin {
    private static final ExecutorService MODEL_EXECUTOR = Executors.newSingleThreadExecutor();

    private static final ModelCandidate[] MODEL_CANDIDATES = {
            new ModelCandidate("Gemma-4-E2B-it", "gemma4_2b_v09_obfus_fix_all_modalities_thinking.litertlm", "litertlm"),
            new ModelCandidate("Gemma-4-E4B-it", "gemma4_4b_v09_obfus_fix_all_modalities_thinking.litertlm", "litertlm"),
            new ModelCandidate("Gemma-4-E4B-it direct filename", "gemma-4-E4B-it.litertlm", "litertlm"),
            new ModelCandidate("TranslateGemma-4B-it", "translategemma-4b-it.litertlm", "litertlm"),
            new ModelCandidate("TranslateGemma-4B-it alternate", "translate-gemma-4b-it.litertlm", "litertlm"),
            new ModelCandidate("TranslateGemma-4B-it alternate underscore", "translategemma_4b_it.litertlm", "litertlm"),
            new ModelCandidate("Gemma-3n-E2B-it", "gemma-3n-E2B-it-int4.litertlm", "litertlm"),
            new ModelCandidate("Gemma3-1B-IT", "gemma3-1b-it-int4.litertlm", "litertlm"),
            new ModelCandidate("Gemma 4 E2B GGUF fallback", "gemma-4-E2B-it-Q4_K_M.gguf", "gguf")
    };

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject response = new JSObject();
        File modelDirectory = getModelDirectory();
        ModelCandidate selected = findSelectedModel(modelDirectory);
        File modelFile = selected == null ? new File(modelDirectory, MODEL_CANDIDATES[0].modelFile) : new File(modelDirectory, selected.modelFile);
        String runtimeType = selected == null ? MODEL_CANDIDATES[0].runtimeType : selected.runtimeType;

        response.put("platform", "android");
        response.put("selectedModelName", selected == null ? MODEL_CANDIDATES[0].name : selected.name);
        response.put("modelFileName", selected == null ? MODEL_CANDIDATES[0].modelFile : selected.modelFile);
        response.put("runtimeType", runtimeType);
        response.put("appModelDirectory", modelDirectory.getAbsolutePath());
        response.put("modelPath", modelFile.getAbsolutePath());
        response.put("modelExists", modelFile.exists());
        response.put("nativeReady", isRuntimeReady(runtimeType));
        response.put("foundModels", buildFoundModels(modelDirectory));

        if (!modelFile.exists()) {
            response.put("message", "Copy a LiteRT-LM model from Edge Gallery into the app model folder before generating.");
        } else if (!isRuntimeReady(runtimeType)) {
            response.put("message", runtimeType.equals("litertlm")
                    ? "LiteRT-LM dependency is present, but the Java bridge still needs the final Engine wiring."
                    : "The app shell is ready, but the llama.cpp native library has not been linked yet.");
        }

        call.resolve(response);
    }

    @PluginMethod
    public void generate(PluginCall call) {
        String prompt = call.getString("prompt", "");
        String systemInstruction = call.getString("systemInstruction", "");
        int maxTokens = call.getInt("maxTokens", 384);
        double temperature = call.getDouble("temperature", 0.7);
        int topK = call.getInt("topK", 40);
        int lookahead = call.getInt("lookahead", 4);

        File modelDirectory = getModelDirectory();
        String requestedModelPath = call.getString("modelPath", "");
        ModelCandidate selected = requestedModelPath.isEmpty()
                ? findSelectedModel(modelDirectory)
                : findCandidateForRequestedModel(requestedModelPath);
        if (selected == null) {
            selected = MODEL_CANDIDATES[0];
        }
        File modelFile = requestedModelPath.isEmpty()
                ? new File(modelDirectory, selected.modelFile)
                : resolveRequestedModelFile(modelDirectory, requestedModelPath, selected.modelFile);

        if (!modelFile.exists()) {
            call.reject("Missing model file. Copy " + selected.modelFile + " to " + modelDirectory.getAbsolutePath());
            return;
        }

        if (selected.runtimeType.equals("litertlm") && !LiteRtLmBridge.isAvailable()) {
            call.reject("LiteRT-LM runtime classes are not available. See docs/ANDROID_LITERTLM_RUNTIME.md.");
            return;
        }

        if (selected.runtimeType.equals("gguf") && !NativeLlamaBridge.isAvailable()) {
            call.reject("Native llama.cpp bridge is not linked yet. See docs/ANDROID_GGUF_RUNTIME.md.");
            return;
        }

        ModelCandidate generationModel = selected;
        MODEL_EXECUTOR.execute(() -> {
            long startedAt = System.currentTimeMillis();
            try {
                String text = generationModel.runtimeType.equals("litertlm")
                        ? LiteRtLmBridge.generate(
                                modelFile.getAbsolutePath(),
                                prompt,
                                maxTokens,
                                temperature,
                                topK,
                                systemInstruction,
                                getContext().getCacheDir().getAbsolutePath()
                        )
                        : NativeLlamaBridge.generate(
                                modelFile.getAbsolutePath(),
                                prompt,
                                maxTokens,
                                temperature,
                                topK,
                                lookahead
                        );

                JSObject response = new JSObject();
                response.put("text", text);
                response.put("elapsedMs", System.currentTimeMillis() - startedAt);
                call.resolve(response);
            } catch (RuntimeException exception) {
                call.reject(exception.getMessage(), exception);
            }
        });
    }

    @PluginMethod
    public void searchWeb(PluginCall call) {
        String query = call.getString("query", "").trim();
        if (query.isEmpty()) {
            call.reject("Missing web search query.");
            return;
        }

        new Thread(() -> {
            try {
                String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8.name());
                URL url = new URL("https://api.duckduckgo.com/?q=" + encodedQuery + "&format=json&no_html=1&skip_disambig=1");
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(6000);
                connection.setReadTimeout(8000);
                connection.setRequestMethod("GET");
                connection.setRequestProperty("User-Agent", "OfflineAIBase/1.0");

                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                    StringBuilder body = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        body.append(line);
                    }

                    JSONObject data = new JSONObject(body.toString());
                    String text = buildWebSummary(data);
                    JSObject response = new JSObject();
                    response.put("text", text.isEmpty() ? "No web summary was available for this query." : text);
                    response.put("source", data.optString("AbstractURL", "https://duckduckgo.com/?q=" + encodedQuery));
                    call.resolve(response);
                } finally {
                    connection.disconnect();
                }
            } catch (Exception exception) {
                call.reject("Web lookup failed: " + exception.getMessage(), exception);
            }
        }).start();
    }

    private File getModelDirectory() {
        File directory = getContext().getExternalFilesDir("models");
        if (directory == null) {
            directory = new File(getContext().getFilesDir(), "models");
        }
        if (!directory.exists()) {
            directory.mkdirs();
        }
        return directory;
    }

    private ModelCandidate findSelectedModel(File modelDirectory) {
        for (ModelCandidate candidate : MODEL_CANDIDATES) {
            File modelFile = new File(modelDirectory, candidate.modelFile);
            if (modelFile.exists()) {
                return candidate;
            }
        }
        return null;
    }

    private ModelCandidate findCandidateForRequestedModel(String requestedModelPath) {
        String requested = new File(requestedModelPath).getName();
        for (ModelCandidate candidate : MODEL_CANDIDATES) {
            if (candidate.modelFile.equals(requested) || candidate.modelFile.equals(requestedModelPath)) {
                return candidate;
            }
        }
        String lower = requested.toLowerCase();
        String runtimeType = lower.endsWith(".gguf") ? "gguf" : "litertlm";
        return new ModelCandidate(requested, requested, runtimeType);
    }

    private File resolveRequestedModelFile(File modelDirectory, String requestedModelPath, String fallbackModelFile) {
        File direct = new File(requestedModelPath);
        if (direct.isAbsolute()) {
            return direct;
        }
        return new File(modelDirectory, requestedModelPath.isEmpty() ? fallbackModelFile : requestedModelPath);
    }

    private boolean isRuntimeReady(String runtimeType) {
        if (runtimeType.equals("litertlm")) {
            return LiteRtLmBridge.isAvailable();
        }
        if (runtimeType.equals("gguf")) {
            return NativeLlamaBridge.isAvailable();
        }
        return false;
    }

    private JSArray buildFoundModels(File modelDirectory) {
        JSArray models = new JSArray();
        for (ModelCandidate candidate : MODEL_CANDIDATES) {
            File modelFile = new File(modelDirectory, candidate.modelFile);
            JSObject model = new JSObject();
            model.put("name", candidate.name);
            model.put("modelFile", candidate.modelFile);
            model.put("runtimeType", candidate.runtimeType);
            model.put("exists", modelFile.exists());
            model.put("ready", modelFile.exists() && isRuntimeReady(candidate.runtimeType));
            models.put(model);
        }
        File[] files = modelDirectory.listFiles();
        if (files != null) {
            for (File file : files) {
                String fileName = file.getName();
                String lowerName = fileName.toLowerCase();
                if (!file.isFile() || !lowerName.contains("translategemma") || !lowerName.endsWith(".litertlm")) {
                    continue;
                }
                JSObject model = new JSObject();
                model.put("name", "TranslateGemma local file");
                model.put("modelFile", fileName);
                model.put("runtimeType", "litertlm");
                model.put("exists", true);
                model.put("ready", isRuntimeReady("litertlm"));
                model.put("fileName", fileName);
                model.put("sizeBytes", file.length());
                models.put(model);
            }
        }
        return models;
    }

    private String buildWebSummary(JSONObject data) {
        StringBuilder summary = new StringBuilder();
        appendLine(summary, data.optString("Heading", ""));
        appendLine(summary, data.optString("AbstractText", ""));

        JSONArray relatedTopics = data.optJSONArray("RelatedTopics");
        if (relatedTopics != null) {
            int added = 0;
            for (int index = 0; index < relatedTopics.length() && added < 4; index++) {
                JSONObject topic = relatedTopics.optJSONObject(index);
                if (topic == null) {
                    continue;
                }

                String text = topic.optString("Text", "");
                if (!text.isEmpty()) {
                    appendLine(summary, text);
                    added++;
                }
            }
        }

        return summary.toString().trim();
    }

    private void appendLine(StringBuilder builder, String value) {
        if (value == null || value.trim().isEmpty()) {
            return;
        }

        if (builder.length() > 0) {
            builder.append("\n");
        }
        builder.append(value.trim());
    }

    private static final class ModelCandidate {
        final String name;
        final String modelFile;
        final String runtimeType;

        ModelCandidate(String name, String modelFile, String runtimeType) {
            this.name = name;
            this.modelFile = modelFile;
            this.runtimeType = runtimeType;
        }
    }
}
