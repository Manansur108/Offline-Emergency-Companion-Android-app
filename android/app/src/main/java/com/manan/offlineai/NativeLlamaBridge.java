package com.manan.offlineai;

final class NativeLlamaBridge {
    private static final boolean AVAILABLE = loadNativeLibrary();

    private NativeLlamaBridge() {
    }

    static boolean isAvailable() {
        return AVAILABLE;
    }

    static String generate(
            String modelPath,
            String prompt,
            int maxTokens,
            double temperature,
            int topK,
            int lookahead
    ) {
        if (!AVAILABLE) {
            throw new IllegalStateException("Native llama.cpp bridge is not available.");
        }

        return nativeGenerate(modelPath, prompt, maxTokens, temperature, topK, lookahead);
    }

    private static boolean loadNativeLibrary() {
        try {
            System.loadLibrary("offline_llama");
            return true;
        } catch (UnsatisfiedLinkError error) {
            return false;
        }
    }

    private static native String nativeGenerate(
            String modelPath,
            String prompt,
            int maxTokens,
            double temperature,
            int topK,
            int lookahead
    );
}
