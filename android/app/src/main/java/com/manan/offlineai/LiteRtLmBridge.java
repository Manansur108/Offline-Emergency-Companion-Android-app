package com.manan.offlineai;

import com.google.ai.edge.litertlm.Backend;
import com.google.ai.edge.litertlm.Contents;
import com.google.ai.edge.litertlm.Conversation;
import com.google.ai.edge.litertlm.ConversationConfig;
import com.google.ai.edge.litertlm.Engine;
import com.google.ai.edge.litertlm.EngineConfig;
import com.google.ai.edge.litertlm.Message;
import com.google.ai.edge.litertlm.SamplerConfig;

import java.util.Collections;

final class LiteRtLmBridge {
    private static final boolean AVAILABLE = classExists("com.google.ai.edge.litertlm.Engine");

    private LiteRtLmBridge() {
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
            String systemInstruction,
            String cacheDir
    ) {
        if (!AVAILABLE) {
            throw new IllegalStateException("LiteRT-LM classes are not available.");
        }

        RuntimeException lastError = null;
        Backend[] backends = new Backend[] { new Backend.GPU(), new Backend.CPU() };

        for (Backend backend : backends) {
            try {
                return generateWithBackend(modelPath, prompt, maxTokens, temperature, topK, systemInstruction, cacheDir, backend);
            } catch (RuntimeException exception) {
                lastError = exception;
            }
        }

        throw lastError == null
                ? new IllegalStateException("LiteRT-LM generation failed.")
                : lastError;
    }

    private static boolean classExists(String className) {
        try {
            Class.forName(className);
            return true;
        } catch (ClassNotFoundException exception) {
            return false;
        }
    }

    private static String generateWithBackend(
            String modelPath,
            String prompt,
            int maxTokens,
            double temperature,
            int topK,
            String systemInstruction,
            String cacheDir,
            Backend backend
    ) {
        EngineConfig engineConfig = new EngineConfig(
                modelPath,
                backend,
                backend instanceof Backend.GPU ? new Backend.GPU() : null,
                new Backend.CPU(),
                maxTokens,
                null,
                cacheDir
        );

        try (Engine engine = new Engine(engineConfig)) {
            engine.initialize();
            SamplerConfig samplerConfig = new SamplerConfig(topK, 0.95, temperature, 0);
            Contents systemContents = systemInstruction == null || systemInstruction.trim().isEmpty()
                    ? null
                    : Contents.Companion.of(systemInstruction);
            ConversationConfig conversationConfig = new ConversationConfig(
                    systemContents,
                    Collections.emptyList(),
                    Collections.emptyList(),
                    samplerConfig,
                    false
            );

            try (Conversation conversation = engine.createConversation(conversationConfig)) {
                Message response = conversation.sendMessage(prompt, Collections.emptyMap());
                return conversation.renderMessageIntoString(response, Collections.emptyMap()).trim();
            }
        }
    }
}
