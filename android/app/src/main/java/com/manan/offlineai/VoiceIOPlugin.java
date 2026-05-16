package com.manan.offlineai;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PluginMethod;

import java.util.ArrayList;
import java.util.Locale;

@CapacitorPlugin(
        name = "VoiceIO",
        permissions = {
                @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
        }
)
public class VoiceIOPlugin extends Plugin {
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private TextToSpeech textToSpeech;
    private SpeechRecognizer speechRecognizer;
    private PluginCall activeSpeechCall;
    private boolean ttsReady = false;

    @Override
    public void load() {
        textToSpeech = new TextToSpeech(getContext(), status -> ttsReady = status == TextToSpeech.SUCCESS);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject response = new JSObject();
        response.put("platform", "android");
        response.put("sttAvailable", SpeechRecognizer.isRecognitionAvailable(getContext()));
        response.put("ttsAvailable", ttsReady);
        response.put("message", "Using Android SpeechRecognizer with offline preference and TextToSpeech. Offline STT depends on installed device voice packs.");
        call.resolve(response);
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
            return;
        }

        launchSpeechRecognizer(call);
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Microphone permission is required for speech to text.");
            return;
        }

        launchSpeechRecognizer(call);
    }

    private void launchSpeechRecognizer(PluginCall call) {
        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            call.reject("Speech recognition is not available on this device.");
            return;
        }

        String language = call.getString("language", Locale.getDefault().toLanguageTag());
        String prompt = call.getString("prompt", "Speak now");
        boolean offlinePreferred = call.getBoolean("offlinePreferred", true);
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, prompt);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
        intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, offlinePreferred);
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 2_000);
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1_500);
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1_000);
        intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());

        runOnMainThread(() -> startSpeechRecognizerOnMainThread(call, intent));
    }

    private void startSpeechRecognizerOnMainThread(PluginCall call, Intent intent) {
        if (activeSpeechCall != null) {
            call.reject("Speech recognition is already listening.");
            return;
        }

        activeSpeechCall = call;
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(getActivity());
        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle params) {}

            @Override
            public void onBeginningOfSpeech() {}

            @Override
            public void onRmsChanged(float rmsdB) {}

            @Override
            public void onBufferReceived(byte[] buffer) {}

            @Override
            public void onEndOfSpeech() {}

            @Override
            public void onError(int error) {
                PluginCall pendingCall = activeSpeechCall;
                cleanupSpeechRecognizer();
                if (pendingCall != null) {
                    pendingCall.reject(speechErrorMessage(error));
                }
            }

            @Override
            public void onResults(Bundle results) {
                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                float[] confidenceScores = results.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES);
                String text = matches == null || matches.isEmpty() ? "" : matches.get(0);
                PluginCall pendingCall = activeSpeechCall;
                cleanupSpeechRecognizer();

                if (pendingCall == null) {
                    return;
                }

                JSObject response = new JSObject();
                response.put("text", text);
                if (confidenceScores != null && confidenceScores.length > 0) {
                    response.put("confidence", confidenceScores[0]);
                }
                pendingCall.resolve(response);
            }

            @Override
            public void onPartialResults(Bundle partialResults) {}

            @Override
            public void onEvent(int eventType, Bundle params) {}
        });
        speechRecognizer.startListening(intent);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "").trim();
        String language = call.getString("language", Locale.getDefault().toLanguageTag());
        double rate = call.getDouble("rate", 0.96);
        double pitch = call.getDouble("pitch", 1.0);

        if (text.isEmpty()) {
            call.reject("Missing text to speak.");
            return;
        }

        if (textToSpeech == null || !ttsReady) {
            call.reject("Text to speech is not ready yet.");
            return;
        }

        Locale locale = Locale.forLanguageTag(language);
        int languageResult = textToSpeech.setLanguage(locale);
        if (languageResult == TextToSpeech.LANG_MISSING_DATA || languageResult == TextToSpeech.LANG_NOT_SUPPORTED) {
            call.reject("Text to speech language is not installed on this device.");
            return;
        }
        textToSpeech.setSpeechRate((float) rate);
        textToSpeech.setPitch((float) pitch);
        int result = textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, new Bundle(), "offline-ai-base-tts");
        if (result == TextToSpeech.ERROR) {
            call.reject("Text to speech failed.");
            return;
        }

        call.resolve();
    }

    @PluginMethod
    public void stopSpeaking(PluginCall call) {
        if (textToSpeech != null) {
            textToSpeech.stop();
        }
        cleanupSpeechRecognizerOnMainThread();
        call.resolve();
    }

    private void cleanupSpeechRecognizer() {
        runOnMainThread(this::cleanupSpeechRecognizerOnMainThread);
    }

    private void cleanupSpeechRecognizerOnMainThread() {
        SpeechRecognizer recognizer = speechRecognizer;
        speechRecognizer = null;
        activeSpeechCall = null;
        if (recognizer != null) {
            recognizer.cancel();
            recognizer.destroy();
        }
    }

    private void runOnMainThread(Runnable runnable) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            runnable.run();
            return;
        }

        mainHandler.post(runnable);
    }

    private String speechErrorMessage(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO:
                return "Audio recording error.";
            case SpeechRecognizer.ERROR_CLIENT:
                return "Speech recognition client error.";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "Microphone permission is required for speech to text.";
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "Offline speech recognition is not available on this device. Type the emergency or install offline speech packs.";
            case SpeechRecognizer.ERROR_NO_MATCH:
                return "No speech was recognized.";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "Speech recognizer is busy. Try again.";
            case SpeechRecognizer.ERROR_SERVER:
                return "Speech recognition service error.";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "No speech was heard.";
            default:
                return "Speech recognition failed.";
        }
    }

    @Override
    protected void handleOnDestroy() {
        cleanupSpeechRecognizer();
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
        }
    }
}
