export type RuntimeType = 'litertlm' | 'aicore' | 'gguf';

export interface ModelCatalogEntry {
  name: string;
  modelId: string;
  modelFile: string;
  runtimeType: RuntimeType;
  description: string;
  sizeInBytes: number;
  minDeviceMemoryInGb: number;
  supportsImage: boolean;
  supportsAudio: boolean;
  supportsThinking?: boolean;
  defaultConfig: {
    topK: number;
    topP?: number;
    temperature: number;
    maxTokens: number;
    maxContextLength?: number;
    accelerators: string;
    visionAccelerator?: string;
  };
  taskTypes: string[];
}

export const MODEL_CATALOG: ModelCatalogEntry[] = [
  {
    name: 'Gemma-4-E2B-it',
    modelId: 'litert-community/gemma-4-E2B-it-litert-lm',
    modelFile: 'gemma4_2b_v09_obfus_fix_all_modalities_thinking.litertlm',
    runtimeType: 'litertlm',
    description: 'Preferred Android model from AI Edge Gallery. Supports text, image, audio, thinking, and up to 32K context.',
    sizeInBytes: 2538766336,
    minDeviceMemoryInGb: 8,
    supportsImage: true,
    supportsAudio: true,
    supportsThinking: true,
    defaultConfig: {
      topK: 64,
      topP: 0.95,
      temperature: 1.0,
      maxContextLength: 32000,
      maxTokens: 4000,
      accelerators: 'gpu,cpu',
      visionAccelerator: 'gpu',
    },
    taskTypes: ['llm_chat', 'llm_prompt_lab', 'llm_agent_chat', 'llm_ask_image', 'llm_ask_audio'],
  },
  {
    name: 'Gemma-4-E4B-it',
    modelId: 'litert-community/gemma-4-E4B-it-litert-lm',
    modelFile: 'gemma4_4b_v09_obfus_fix_all_modalities_thinking.litertlm',
    runtimeType: 'litertlm',
    description: 'Larger Gemma 4 Android model for phones with more memory.',
    sizeInBytes: 3609411584,
    minDeviceMemoryInGb: 12,
    supportsImage: true,
    supportsAudio: true,
    supportsThinking: true,
    defaultConfig: {
      topK: 64,
      topP: 0.95,
      temperature: 1.0,
      maxContextLength: 32000,
      maxTokens: 4000,
      accelerators: 'gpu,cpu',
      visionAccelerator: 'gpu',
    },
    taskTypes: ['llm_chat', 'llm_prompt_lab', 'llm_agent_chat', 'llm_ask_image', 'llm_ask_audio'],
  },
  {
    name: 'Gemma-4-E4B-it',
    modelId: 'local/gemma-4-E4B-it',
    modelFile: 'gemma-4-E4B-it.litertlm',
    runtimeType: 'litertlm',
    description: 'Gemma 4 E4B LiteRT-LM model using the direct downloaded filename.',
    sizeInBytes: 3659530240,
    minDeviceMemoryInGb: 12,
    supportsImage: true,
    supportsAudio: true,
    supportsThinking: true,
    defaultConfig: {
      topK: 64,
      topP: 0.95,
      temperature: 1.0,
      maxContextLength: 32000,
      maxTokens: 4000,
      accelerators: 'gpu,cpu',
      visionAccelerator: 'gpu',
    },
    taskTypes: ['llm_chat', 'llm_prompt_lab', 'llm_agent_chat', 'llm_ask_image', 'llm_ask_audio'],
  },
  {
    name: 'TranslateGemma-4B-it',
    modelId: 'google/translategemma-4b-it',
    modelFile: 'translategemma-4b-it.litertlm',
    runtimeType: 'litertlm',
    description: 'Dedicated offline translation model for emergency language helper and translated TTS.',
    sizeInBytes: 4000000000,
    minDeviceMemoryInGb: 8,
    supportsImage: false,
    supportsAudio: false,
    defaultConfig: {
      topK: 1,
      topP: 1,
      temperature: 0,
      maxTokens: 240,
      accelerators: 'gpu,cpu',
    },
    taskTypes: ['translation'],
  },
  {
    name: 'Gemma 4 E2B via AICore',
    modelId: '',
    modelFile: 'system-managed',
    runtimeType: 'aicore',
    description: 'System-managed Gemini Nano path for supported Android devices with AICore preview access.',
    sizeInBytes: 0,
    minDeviceMemoryInGb: 6,
    supportsImage: true,
    supportsAudio: false,
    defaultConfig: {
      topK: 64,
      temperature: 1.0,
      maxTokens: 1024,
      accelerators: 'npu',
    },
    taskTypes: ['llm_chat', 'llm_ask_image'],
  },
  {
    name: 'Gemma-3n-E2B-it',
    modelId: 'google/gemma-3n-E2B-it-litert-lm',
    modelFile: 'gemma-3n-E2B-it-int4.litertlm',
    runtimeType: 'litertlm',
    description: 'Good fallback LiteRT-LM multimodal model with lower context than Gemma 4.',
    sizeInBytes: 3655827456,
    minDeviceMemoryInGb: 8,
    supportsImage: true,
    supportsAudio: true,
    defaultConfig: {
      topK: 64,
      topP: 0.95,
      temperature: 1.0,
      maxTokens: 4096,
      accelerators: 'cpu,gpu',
    },
    taskTypes: ['llm_chat', 'llm_prompt_lab', 'llm_ask_image', 'llm_ask_audio'],
  },
  {
    name: 'Gemma3-1B-IT',
    modelId: 'litert-community/Gemma3-1B-IT',
    modelFile: 'gemma3-1b-it-int4.litertlm',
    runtimeType: 'litertlm',
    description: 'Smallest practical CPU/GPU chat fallback for broad phone support.',
    sizeInBytes: 584417280,
    minDeviceMemoryInGb: 6,
    supportsImage: false,
    supportsAudio: false,
    defaultConfig: {
      topK: 64,
      topP: 0.95,
      temperature: 1.0,
      maxTokens: 1024,
      accelerators: 'gpu,cpu',
    },
    taskTypes: ['llm_chat', 'llm_prompt_lab'],
  },
  {
    name: 'Gemma 4 E2B GGUF fallback',
    modelId: 'local/gemma-4-E2B-it-Q4_K_M',
    modelFile: 'gemma-4-E2B-it-Q4_K_M.gguf',
    runtimeType: 'gguf',
    description: 'Local GGUF fallback for a llama.cpp bridge. Text-only until a GGUF multimodal stack is added.',
    sizeInBytes: 3106736256,
    minDeviceMemoryInGb: 8,
    supportsImage: false,
    supportsAudio: false,
    defaultConfig: {
      topK: 40,
      temperature: 0.7,
      maxTokens: 384,
      accelerators: 'cpu',
    },
    taskTypes: ['llm_chat', 'llm_prompt_lab'],
  },
];

export const PREFERRED_MODEL = MODEL_CATALOG[0];
