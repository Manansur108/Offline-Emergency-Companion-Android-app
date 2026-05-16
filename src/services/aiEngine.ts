import { PLAIN_SYSTEM_INSTRUCTION } from '../lib/basePrompt';
import { OfflineModel } from '../plugins/offlineModel';
import { MODEL_CATALOG, PREFERRED_MODEL } from '../data/modelCatalog';
import { loadAppSettings } from './appSettings';
import { buildAppMemoryPromptContext } from './appMemoryStore';
import type { ChatMessage } from '../types/chat';

export type { ChatMessage } from '../types/chat';

export async function askOfflineModel(
  userQuery: string,
  options: { maxTokens?: number; temperature?: number; lookahead?: number } = {},
) {
  const settings = loadAppSettings();
  const activeModel = MODEL_CATALOG.find((model) => model.modelFile === settings.activeModelFile) ?? PREFERRED_MODEL;
  const webContext = settings.webAccess ? await getWebContext(userQuery) : '';
  const deliveryInstruction = [
    'Delivery style:',
    'Respond in natural language for a small local model.',
    'Avoid Markdown syntax such as # headings, tables, code fences, or bold markers.',
    'Use simple short paragraphs and plain numbered steps only when helpful.',
  ].join('\n');
  const prompt = [webContext, deliveryInstruction, userQuery.trim()].filter(Boolean).join('\n\n');
  const memoryContext = buildAppMemoryPromptContext();
  const systemInstruction = [PLAIN_SYSTEM_INSTRUCTION, memoryContext].filter(Boolean).join('\n\n');

  const response = await OfflineModel.generate({
    prompt,
    systemInstruction,
    modelPath: activeModel.modelFile,
    maxTokens: options.maxTokens ?? Math.min(activeModel.defaultConfig.maxTokens, settings.maxTokens),
    temperature: options.temperature ?? settings.temperature,
    topK: activeModel.defaultConfig.topK,
    lookahead: options.lookahead ?? 4,
  });

  return {
    ...response,
    text: sanitizeModelResponse(response.text),
  };
}

async function getWebContext(query: string): Promise<string> {
  try {
    const result = await OfflineModel.searchWeb({ query: query.slice(0, 240) });
    if (!result.text.trim()) return '';

    return [
      'Optional web context from the app web-access toggle:',
      result.text,
      result.source ? `Source: ${result.source}` : '',
      'Use this only when relevant. If the web result is thin or unrelated, say so.',
    ]
      .filter(Boolean)
      .join('\n');
  } catch {
    return 'Web access is enabled, but the app could not retrieve current web context for this request.';
  }
}

export function newMessage(role: ChatMessage['role'], content: string, extras: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    ...extras,
  };
}

export function sanitizeModelResponse(rawText: string) {
  return rawText
    .replace(/<\|channel\|\s*(thought|final|analysis|commentary)/gi, '')
    .replace(/<\|turn\|>\s*(system|user|model|assistant)?/gi, '')
    .replace(/<\/?turn\|?>/gi, '')
    .replace(/<\|think\|>/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*(model|assistant)\s*:\s*/gim, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/```[\w-]*\n?/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
