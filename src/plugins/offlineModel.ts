import { Capacitor, registerPlugin } from '@capacitor/core';

export interface OfflineModelStatus {
  platform: string;
  modelFileName: string;
  modelExists: boolean;
  nativeReady: boolean;
  runtimeType?: string;
  selectedModelName?: string;
  foundModels?: Array<{
    name: string;
    modelFile: string;
    runtimeType: string;
    exists: boolean;
    ready: boolean;
    fileName?: string;
    sizeBytes?: number;
    capabilities?: string[];
  }>;
  appModelDirectory?: string;
  modelPath?: string;
  message?: string;
}

export interface GenerateRequest {
  prompt: string;
  systemInstruction?: string;
  modelPath?: string;
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  lookahead?: number;
}

export interface GenerateResponse {
  text: string;
  elapsedMs?: number;
  tokensPerSecond?: number;
}

export interface WebSearchRequest {
  query: string;
}

export interface WebSearchResponse {
  text: string;
  source?: string;
}

export interface OfflineModelPlugin {
  getStatus(): Promise<OfflineModelStatus>;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  searchWeb(request: WebSearchRequest): Promise<WebSearchResponse>;
}

const NativeOfflineModel = registerPlugin<OfflineModelPlugin>('OfflineModel');

const webFallback: OfflineModelPlugin = {
  async getStatus() {
    return {
      platform: 'web',
      modelFileName: 'gemma4_2b_v09_obfus_fix_all_modalities_thinking.litertlm',
      modelExists: false,
      nativeReady: false,
      runtimeType: 'litertlm',
      selectedModelName: 'Gemma-4-E2B-it',
      message: 'Native inference is available only inside the Android app build.',
    };
  },
  async generate({ prompt }) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      text: [
        'Browser preview response:',
        '',
        '- The chat UI, prompt formatting, and workflow shell are wired.',
        '- Place a LiteRT-LM .litertlm model in the app model folder to use local inference on Android.',
        '- Prompt preview:',
        '',
        prompt.slice(0, 420),
      ].join('\n'),
      elapsedMs: 500,
    };
  },
  async searchWeb({ query }) {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const response = await fetch(url);
      const data = (await response.json()) as {
        AbstractText?: string;
        AbstractURL?: string;
        Heading?: string;
        RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
      };
      const related = (data.RelatedTopics ?? [])
        .map((topic) => topic.Text)
        .filter(Boolean)
        .slice(0, 4);
      const text = [data.Heading, data.AbstractText, ...related].filter(Boolean).join('\n');

      return {
        text: text || 'No web summary was available for this query.',
        source: data.AbstractURL || url,
      };
    } catch {
      return {
        text: 'Web lookup failed in browser preview. Android uses the native bridge when web access is enabled.',
      };
    }
  },
};

export const OfflineModel =
  Capacitor.getPlatform() === 'web' ? webFallback : NativeOfflineModel;
