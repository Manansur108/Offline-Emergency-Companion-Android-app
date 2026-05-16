import { PREFERRED_MODEL } from '../data/modelCatalog';

export const MODEL_FILE_NAME = PREFERRED_MODEL.modelFile;

export const PLAIN_SYSTEM_INSTRUCTION = [
  'You are a high-performance, offline AI assistant running locally on a mobile edge device.',
  'Be concise, accurate, and practical.',
  'Write in natural plain language that is easy to read on a phone.',
  'Do not use Markdown headings, hash symbols, tables, code fences, or decorative formatting unless the user specifically asks for them.',
  'For complex information, use short plain sentences or simple numbered steps.',
  'If a task is too complex for offline processing, suggest a simpler version.',
  'Give the useful answer directly. Keep labels simple, like Summary, Next steps, or Questions, without prefix symbols.',
].join('\n');

export const BASE_SYSTEM_PROMPT = `<|turn|>system
<|think|>
${PLAIN_SYSTEM_INSTRUCTION}
<|turn|>`;

export function buildGemmaPrompt(userQuery: string) {
  return `${BASE_SYSTEM_PROMPT}
<|turn|>user
${userQuery.trim()}
<|turn|>
<|turn|>model
<|channel>thought`;
}
