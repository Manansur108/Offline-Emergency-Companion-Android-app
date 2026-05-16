import { TOP_911_EMERGENCIES, type Top911Emergency } from '../data/top911Emergencies';
import { OfflineModel, type OfflineModelStatus } from '../plugins/offlineModel';
import type { EmergencyProtocol, EmergencyStep, EmergencyType } from '../types/emergency';
import { askOfflineModel, sanitizeModelResponse } from './aiEngine';

export const EMERGENCY_LANGUAGES = [
  { code: 'en', label: 'EN', englishName: 'English', translateCode: 'en', ttsLocale: 'en-US', htmlLang: 'en' },
  { code: 'es-MX', label: 'ES-MX', englishName: 'Spanish Mexico', translateCode: 'es-MX', ttsLocale: 'es-MX', htmlLang: 'es-MX' },
  { code: 'fr-FR', label: 'FR', englishName: 'French France', translateCode: 'fr-FR', ttsLocale: 'fr-FR', htmlLang: 'fr-FR' },
  { code: 'fr-CA', label: 'FR-CA', englishName: 'French Canada', translateCode: 'fr-CA', ttsLocale: 'fr-CA', htmlLang: 'fr-CA' },
  { code: 'de-DE', label: 'DE', englishName: 'German', translateCode: 'de-DE', ttsLocale: 'de-DE', htmlLang: 'de-DE' },
  { code: 'it-IT', label: 'IT', englishName: 'Italian', translateCode: 'it-IT', ttsLocale: 'it-IT', htmlLang: 'it-IT' },
  { code: 'pt-BR', label: 'PT-BR', englishName: 'Portuguese Brazil', translateCode: 'pt-BR', ttsLocale: 'pt-BR', htmlLang: 'pt-BR' },
  { code: 'pt-PT', label: 'PT-PT', englishName: 'Portuguese Portugal', translateCode: 'pt-PT', ttsLocale: 'pt-PT', htmlLang: 'pt-PT' },
  { code: 'nl-NL', label: 'NL', englishName: 'Dutch', translateCode: 'nl-NL', ttsLocale: 'nl-NL', htmlLang: 'nl-NL' },
  { code: 'pl-PL', label: 'PL', englishName: 'Polish', translateCode: 'pl-PL', ttsLocale: 'pl-PL', htmlLang: 'pl-PL' },
  { code: 'ro-RO', label: 'RO', englishName: 'Romanian', translateCode: 'ro-RO', ttsLocale: 'ro-RO', htmlLang: 'ro-RO' },
  { code: 'ru-RU', label: 'RU', englishName: 'Russian', translateCode: 'ru-RU', ttsLocale: 'ru-RU', htmlLang: 'ru-RU' },
  { code: 'uk-UA', label: 'UK', englishName: 'Ukrainian', translateCode: 'uk-UA', ttsLocale: 'uk-UA', htmlLang: 'uk-UA' },
  { code: 'tr-TR', label: 'TR', englishName: 'Turkish', translateCode: 'tr-TR', ttsLocale: 'tr-TR', htmlLang: 'tr-TR' },
  { code: 'ar-SA', label: 'AR', englishName: 'Arabic Saudi Arabia', translateCode: 'ar-SA', ttsLocale: 'ar-SA', htmlLang: 'ar-SA', rtl: true },
  { code: 'ar-EG', label: 'AR-EG', englishName: 'Arabic Egypt', translateCode: 'ar-EG', ttsLocale: 'ar-EG', htmlLang: 'ar-EG', rtl: true },
  { code: 'ca-ES', label: 'CA', englishName: 'Catalan', translateCode: 'ca-ES', ttsLocale: 'ca-ES', htmlLang: 'ca-ES' },
  { code: 'fa-IR', label: 'FA', englishName: 'Persian / Farsi', translateCode: 'fa-IR', ttsLocale: 'fa-IR', htmlLang: 'fa-IR', rtl: true },
  { code: 'fil-PH', label: 'FIL', englishName: 'Filipino', translateCode: 'fil-PH', ttsLocale: 'fil-PH', htmlLang: 'fil-PH' },
  { code: 'he-IL', label: 'HE', englishName: 'Hebrew', translateCode: 'he-IL', ttsLocale: 'he-IL', htmlLang: 'he-IL', rtl: true },
  { code: 'hi-IN', label: 'HI', englishName: 'Hindi', translateCode: 'hi-IN', ttsLocale: 'hi-IN', htmlLang: 'hi-IN' },
  { code: 'bn-IN', label: 'BN', englishName: 'Bengali India', translateCode: 'bn-IN', ttsLocale: 'bn-IN', htmlLang: 'bn-IN' },
  { code: 'gu-IN', label: 'GU', englishName: 'Gujarati', translateCode: 'gu-IN', ttsLocale: 'gu-IN', htmlLang: 'gu-IN' },
  { code: 'kn-IN', label: 'KN', englishName: 'Kannada', translateCode: 'kn-IN', ttsLocale: 'kn-IN', htmlLang: 'kn-IN' },
  { code: 'ml-IN', label: 'ML', englishName: 'Malayalam', translateCode: 'ml-IN', ttsLocale: 'ml-IN', htmlLang: 'ml-IN' },
  { code: 'mr-IN', label: 'MR', englishName: 'Marathi', translateCode: 'mr-IN', ttsLocale: 'mr-IN', htmlLang: 'mr-IN' },
  { code: 'pa-IN', label: 'PA', englishName: 'Punjabi', translateCode: 'pa-IN', ttsLocale: 'pa-IN', htmlLang: 'pa-IN' },
  { code: 'ta-IN', label: 'TA', englishName: 'Tamil', translateCode: 'ta-IN', ttsLocale: 'ta-IN', htmlLang: 'ta-IN' },
  { code: 'te-IN', label: 'TE', englishName: 'Telugu', translateCode: 'te-IN', ttsLocale: 'te-IN', htmlLang: 'te-IN' },
  { code: 'ur-PK', label: 'UR', englishName: 'Urdu', translateCode: 'ur-PK', ttsLocale: 'ur-PK', htmlLang: 'ur-PK', rtl: true },
  { code: 'id-ID', label: 'ID', englishName: 'Indonesian', translateCode: 'id-ID', ttsLocale: 'id-ID', htmlLang: 'id-ID' },
  { code: 'is-IS', label: 'IS', englishName: 'Icelandic', translateCode: 'is-IS', ttsLocale: 'is-IS', htmlLang: 'is-IS' },
  { code: 'lt-LT', label: 'LT', englishName: 'Lithuanian', translateCode: 'lt-LT', ttsLocale: 'lt-LT', htmlLang: 'lt-LT' },
  { code: 'lv-LV', label: 'LV', englishName: 'Latvian', translateCode: 'lv-LV', ttsLocale: 'lv-LV', htmlLang: 'lv-LV' },
  { code: 'vi-VN', label: 'VI', englishName: 'Vietnamese', translateCode: 'vi-VN', ttsLocale: 'vi-VN', htmlLang: 'vi-VN' },
  { code: 'th-TH', label: 'TH', englishName: 'Thai', translateCode: 'th-TH', ttsLocale: 'th-TH', htmlLang: 'th-TH' },
  { code: 'zh-CN', label: 'ZH-CN', englishName: 'Chinese Simplified', translateCode: 'zh-CN', ttsLocale: 'zh-CN', htmlLang: 'zh-CN' },
  { code: 'zh-TW', label: 'ZH-TW', englishName: 'Chinese Traditional', translateCode: 'zh-TW', ttsLocale: 'zh-TW', htmlLang: 'zh-TW' },
  { code: 'ja-JP', label: 'JA', englishName: 'Japanese', translateCode: 'ja-JP', ttsLocale: 'ja-JP', htmlLang: 'ja-JP' },
  { code: 'ko-KR', label: 'KO', englishName: 'Korean', translateCode: 'ko-KR', ttsLocale: 'ko-KR', htmlLang: 'ko-KR' },
  { code: 'cs-CZ', label: 'CS', englishName: 'Czech', translateCode: 'cs-CZ', ttsLocale: 'cs-CZ', htmlLang: 'cs-CZ' },
  { code: 'da-DK', label: 'DA', englishName: 'Danish', translateCode: 'da-DK', ttsLocale: 'da-DK', htmlLang: 'da-DK' },
  { code: 'fi-FI', label: 'FI', englishName: 'Finnish', translateCode: 'fi-FI', ttsLocale: 'fi-FI', htmlLang: 'fi-FI' },
  { code: 'el-GR', label: 'EL', englishName: 'Greek', translateCode: 'el-GR', ttsLocale: 'el-GR', htmlLang: 'el-GR' },
  { code: 'hu-HU', label: 'HU', englishName: 'Hungarian', translateCode: 'hu-HU', ttsLocale: 'hu-HU', htmlLang: 'hu-HU' },
  { code: 'no-NO', label: 'NO', englishName: 'Norwegian', translateCode: 'no-NO', ttsLocale: 'nb-NO', htmlLang: 'no-NO' },
  { code: 'sv-SE', label: 'SV', englishName: 'Swedish', translateCode: 'sv-SE', ttsLocale: 'sv-SE', htmlLang: 'sv-SE' },
  { code: 'bg-BG', label: 'BG', englishName: 'Bulgarian', translateCode: 'bg-BG', ttsLocale: 'bg-BG', htmlLang: 'bg-BG' },
  { code: 'hr-HR', label: 'HR', englishName: 'Croatian', translateCode: 'hr-HR', ttsLocale: 'hr-HR', htmlLang: 'hr-HR' },
  { code: 'sr-RS', label: 'SR', englishName: 'Serbian', translateCode: 'sr-RS', ttsLocale: 'sr-RS', htmlLang: 'sr-RS' },
  { code: 'sk-SK', label: 'SK', englishName: 'Slovak', translateCode: 'sk-SK', ttsLocale: 'sk-SK', htmlLang: 'sk-SK' },
  { code: 'sl-SI', label: 'SL', englishName: 'Slovenian', translateCode: 'sl-SI', ttsLocale: 'sl-SI', htmlLang: 'sl-SI' },
  { code: 'sw-KE', label: 'SW', englishName: 'Swahili Kenya', translateCode: 'sw-KE', ttsLocale: 'sw-KE', htmlLang: 'sw-KE' },
  { code: 'sw-TZ', label: 'SW-TZ', englishName: 'Swahili Tanzania', translateCode: 'sw-TZ', ttsLocale: 'sw-TZ', htmlLang: 'sw-TZ' },
  { code: 'et-EE', label: 'ET', englishName: 'Estonian', translateCode: 'et-EE', ttsLocale: 'et-EE', htmlLang: 'et-EE' },
  { code: 'zu-ZA', label: 'ZU', englishName: 'Zulu', translateCode: 'zu-ZA', ttsLocale: 'zu-ZA', htmlLang: 'zu-ZA' },
] as const;

export type EmergencyLanguageCode = typeof EMERGENCY_LANGUAGES[number]['code'];

export function getEmergencyLanguage(language: EmergencyLanguageCode) {
  return EMERGENCY_LANGUAGES.find((item) => item.code === language) ?? EMERGENCY_LANGUAGES[0];
}

export interface AiEmergencyRoute {
  protocolType?: EmergencyType;
  top911Rank?: number;
  escalation: 'immediate_911' | 'ask_followup' | 'not_911';
  confidence: number;
  dispatcherBrief?: string;
  askNext?: string;
}

export interface TranslatedStep {
  instruction: string;
  detail?: string;
}

export interface EmergencyHtmlHelper {
  kicker?: string;
  dir?: 'ltr' | 'rtl';
  lang?: string;
  fontFamily?: string;
  title: string;
  subtitle?: string;
  urgent: string;
  bullets: string[];
  avoid: string[];
}

const PROTOCOL_ROUTES: EmergencyType[] = [
  'cardiac_arrest',
  'choking',
  'bleeding',
  'fire',
  'chemical',
  'unsafe_scene',
  'trauma',
  'carbon_monoxide',
  'gas_leak',
  'powerline',
  'medical',
  'unknown',
];

export function isAiModelReady(status: OfflineModelStatus | null) {
  return Boolean(status?.platform === 'android' && status.modelExists && status.nativeReady);
}

export async function classifyEmergencyWithAi(description: string): Promise<AiEmergencyRoute | null> {
  const trimmed = description.trim();
  if (!trimmed) return null;

  const prompt = [
    'You are an emergency routing assistant inside an offline 911 guidance app.',
    'Return ONLY valid JSON. No Markdown. No explanation.',
    'You do not provide treatment instructions. You only choose the safest app route and make a short dispatcher brief.',
    '',
    'Allowed protocolType values:',
    PROTOCOL_ROUTES.join(', '),
    '',
    'Allowed top911Rank values and titles:',
    TOP_911_EMERGENCIES.map((item) => `${item.rank}: ${item.title}`).join('\n'),
    '',
    'Rules:',
    '- First decide escalation. Use immediate_911 only for clear life threat, serious injury, fire/hazmat danger, active violence, weapon, explicit threat, trapped/rescue hazard, caller cannot safely leave, or danger happening right now.',
    '- Use ask_followup when the situation may be unsafe but key facts are missing. Ask exactly one short safety question.',
    '- Use not_911 for non-emergency advice, minor uncertainty, or when no immediate risk is described.',
    '- Do not send suspicious-person, being watched, or being followed reports directly to 911 unless the user says the threat is active, close, escalating, blocking escape, threatening, armed, attacking, or they cannot reach safety.',
    '- Example: "I see two men following me" should use escalation ask_followup and ask whether they are still following, getting closer, threatening, blocking the user, or the user cannot reach a safe public place.',
    '- If the person is unresponsive or not breathing normally, protocolType must be cardiac_arrest.',
    '- If blocked airway/cannot speak/cannot cough, protocolType must be choking.',
    '- If severe bleeding/stabbing/cutting with bleeding, protocolType must be bleeding.',
    '- If domestic violence, weapon, robbery, threat, shots fired, active danger, or caller cannot speak, protocolType must be unsafe_scene.',
    '- If fall, crash, fracture, head injury, drowning, entrapment, machinery, crush, or rescue hazard, protocolType must be trauma.',
    '- If carbon monoxide or CO alarm, protocolType must be carbon_monoxide.',
    '- If gas leak, gas odor, natural gas, or hissing gas, protocolType must be gas_leak.',
    '- If downed wire, powerline, wire on vehicle, arcing, or electrical hazard, protocolType must be powerline.',
    '- If fire/smoke/evacuation, protocolType must be fire.',
    '- If chemical/fumes/spill/poison exposure, protocolType must be chemical.',
    '- If medical symptoms such as chest pain, shortness of breath, weakness, confusion, fainting, seizure, severe headache, abdominal pain, overdose, diabetes, pregnancy concern, or stroke signs, protocolType must be medical.',
    '- For common calls without a full protocol, use top911Rank.',
    '- If unclear, protocolType must be unknown.',
    '- If escalation is ask_followup or not_911, protocolType may be unknown even if a possible route exists.',
    '- confidence must be from 0 to 1.',
    '- dispatcherBrief must be one short sentence beginning with exact location context, not medical treatment.',
    '',
    'JSON shape:',
    '{"protocolType":"unknown","top911Rank":null,"escalation":"ask_followup","confidence":0.0,"dispatcherBrief":"Exact location. ...","askNext":"One short safety question."}',
    '',
    `User description: ${trimmed}`,
  ].join('\n');

  try {
    const result = await askOfflineModel(prompt, { maxTokens: 260, temperature: 0, lookahead: 1 });
    if (result.text.toLowerCase().includes('browser preview response')) return null;

    const parsed = parseJsonObject(result.text);
    if (!parsed) return null;

    const protocolType = normalizeProtocolType(parsed.protocolType);
    const top911Rank = normalizeTop911Rank(parsed.top911Rank);
    const escalation = normalizeEscalation(parsed.escalation);
    const confidence = clampConfidence(parsed.confidence);
    const dispatcherBrief = cleanOneLine(parsed.dispatcherBrief, 220);
    const askNext = cleanOneLine(parsed.askNext, 140);

    if (!protocolType && !top911Rank && escalation !== 'ask_followup') return null;

    return {
      protocolType,
      top911Rank,
      escalation,
      confidence,
      dispatcherBrief,
      askNext,
    };
  } catch {
    return null;
  }
}

export async function generateDispatcherBriefWithAi(input: {
  description?: string;
  protocol?: EmergencyProtocol;
  top911Emergency?: Top911Emergency;
}) {
  const prompt = [
    'Create a short 911 dispatcher brief for a caller.',
    'Return ONLY JSON: {"brief":"..."}',
    'Do not include medical treatment instructions. Mention exact location placeholder first.',
    'Keep it under 35 words.',
    '',
    input.description ? `Caller description: ${input.description}` : '',
    input.protocol ? `App route: ${input.protocol.title}` : '',
    input.top911Emergency ? `Common 911 call type: ${input.top911Emergency.title}` : '',
    input.top911Emergency ? `Caller clues: ${input.top911Emergency.clues}` : '',
  ].filter(Boolean).join('\n');

  try {
    const result = await askOfflineModel(prompt, { maxTokens: 120, temperature: 0, lookahead: 1 });
    if (result.text.toLowerCase().includes('browser preview response')) return '';

    const parsed = parseJsonObject(result.text);
    return cleanOneLine(parsed?.brief, 240);
  } catch {
    return '';
  }
}

export async function getConstrainedAlternativeGuidanceWithAi(
  protocol: EmergencyProtocol,
  stepIndex: number,
  userIssue: string,
) {
  const step = protocol.steps[stepIndex];
  const fallback = step?.altGuidance ?? 'Keep yourself safe, continue the current step if possible, and call 911 now.';

  if (!step) return fallback;

  const prompt = [
    'You are helping inside an emergency app.',
    'Return ONLY JSON: {"guidance":"..."}',
    'Use only the allowed facts below. Do not invent new medical instructions.',
    'Keep guidance one short sentence. End with "Call 911 now."',
    '',
    `Emergency: ${protocol.title}`,
    `Current instruction: ${step.instruction}`,
    `Current detail: ${step.detail ?? ''}`,
    `Allowed alternate guidance: ${step.altGuidance ?? fallback}`,
    `User issue: ${userIssue.trim() || 'not working'}`,
  ].join('\n');

  try {
    const result = await askOfflineModel(prompt, { maxTokens: 100, temperature: 0, lookahead: 1 });
    if (result.text.toLowerCase().includes('browser preview response')) return fallback;

    const parsed = parseJsonObject(result.text);
    return cleanOneLine(parsed?.guidance, 220) || fallback;
  } catch {
    return fallback;
  }
}

export async function translateEmergencyStepWithAi(
  step: EmergencyStep,
  targetLanguage: EmergencyLanguageCode,
): Promise<TranslatedStep | null> {
  if (targetLanguage === 'en') return null;

  const key = buildTranslationCacheKey(step, targetLanguage);
  const cached = stepTranslationCache.get(key);
  if (cached) return cached;

  const pending = translateEmergencyStepOnce(step, targetLanguage)
    .then((translation) => {
      if (!translation) {
        stepTranslationCache.delete(key);
      }
      return translation;
    })
    .catch(() => {
      stepTranslationCache.delete(key);
      return null;
    });
  stepTranslationCache.set(key, pending);
  return pending;
}

const stepTranslationCache = new Map<string, Promise<TranslatedStep | null>>();

async function translateEmergencyStepOnce(
  step: EmergencyStep,
  targetLanguage: EmergencyLanguageCode,
): Promise<TranslatedStep | null> {
  const instructionSource = step.instruction.trim();
  const detailSource = step.detail?.trim() ?? '';
  if (!instructionSource && !detailSource) return null;

  const language = getEmergencyLanguage(targetLanguage);
  const prompt = buildStepTranslationPrompt(instructionSource, detailSource, language.englishName);

  try {
    const result = await OfflineModel.generate({
      prompt,
      systemInstruction: '',
      maxTokens: detailSource ? 220 : 120,
      temperature: 0,
      topK: 1,
      lookahead: 1,
    });

    if (result.text.toLowerCase().includes('browser preview response')) {
      return null;
    }

    const parsed = parseJsonObject(result.text);
    const instruction = cleanTranslatedText(
      typeof parsed?.instruction === 'string' ? parsed.instruction : result.text,
      180,
    );
    const detail = cleanTranslatedText(
      typeof parsed?.detail === 'string' ? parsed.detail : '',
      420,
    );

    if (!instruction || looksUntranslated(instructionSource, instruction)) {
      return null;
    }

    return {
      instruction,
      detail: detailSource && detail && !looksUntranslated(detailSource, detail) ? detail : '',
    };
  } catch {
    return null;
  }
}

function buildTranslationCacheKey(step: EmergencyStep, targetLanguage: EmergencyLanguageCode) {
  return [targetLanguage, step.instruction, step.detail ?? ''].join('\n---\n');
}

function buildStepTranslationPrompt(instruction: string, detail: string, languageName: string) {
  return [
    '<|turn>system',
    `You are an emergency translation engine. Translate the user's emergency app text into ${languageName}. Return only valid JSON with keys "instruction" and "detail". Do not explain. Keep names, numbers, addresses, and emergency service terms like 911 unchanged when appropriate.<turn|>`,
    '<|turn>user',
    JSON.stringify({ instruction, detail }),
    '<turn|>',
    '<|turn>model',
  ].join('\n');
}

function cleanTranslatedText(text: string, maxLength: number) {
  const parsed = parseJsonObject(text);
  const raw = typeof parsed?.translation === 'string'
    ? parsed.translation
    : typeof parsed?.text === 'string'
      ? parsed.text
      : text;

  return sanitizeModelResponse(raw)
    .replace(/^translation\s*:\s*/i, '')
    .replace(/^translated text\s*:\s*/i, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/<<<[^>]+>>>/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, maxLength)
    .trim();
}

function looksUntranslated(source: string, translated: string) {
  const normalizedSource = source.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const normalizedTranslated = translated.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalizedSource || !normalizedTranslated) return false;
  if (normalizedSource === normalizedTranslated) return true;
  if (normalizedTranslated.includes(normalizedSource) || normalizedSource.includes(normalizedTranslated)) return true;

  const sourceWords = new Set(normalizedSource.split(' ').filter((word) => word.length > 2));
  const translatedWords = normalizedTranslated.split(' ').filter((word) => word.length > 2);
  if (sourceWords.size < 3 || translatedWords.length < 3) return false;

  const overlap = translatedWords.filter((word) => sourceWords.has(word)).length / translatedWords.length;
  return overlap > 0.65;
}

export async function generateInteractiveHelperWithAi(
  protocol: EmergencyProtocol,
  step: EmergencyStep,
): Promise<EmergencyHtmlHelper | null> {
  const prompt = [
    'You create content for a sandboxed emergency helper HTML preview.',
    'Return ONLY JSON. No Markdown. No HTML tags.',
    'Do not add new medical instructions. Use only the given app protocol facts.',
    'Keep text short, calm, and action-focused.',
    '',
    'JSON shape:',
    '{"title":"...","subtitle":"...","urgent":"...","bullets":["...","..."],"avoid":["...","..."]}',
    '',
    `Emergency: ${protocol.title}`,
    `Current instruction: ${step.instruction}`,
    `Current detail: ${step.detail ?? ''}`,
    `Allowed alternate guidance: ${step.altGuidance ?? ''}`,
  ].join('\n');

  try {
    const result = await askOfflineModel(prompt, { maxTokens: 260, temperature: 0, lookahead: 1 });
    if (result.text.toLowerCase().includes('browser preview response')) return null;

    const parsed = parseJsonObject(result.text);
    if (!parsed) return null;

    const kicker = cleanOneLine(parsed.kicker, 24);
    const title = cleanOneLine(parsed.title, 70);
    const urgent = cleanOneLine(parsed.urgent, 120);
    const subtitle = cleanOneLine(parsed.subtitle, 120);
    const bullets = cleanStringList(parsed.bullets, 4, 120);
    const avoid = cleanStringList(parsed.avoid, 3, 120);

    if (!title || !urgent) return null;
    return { kicker, title, subtitle, urgent, bullets, avoid };
  } catch {
    return null;
  }
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function normalizeProtocolType(value: unknown): EmergencyType | undefined {
  return typeof value === 'string' && PROTOCOL_ROUTES.includes(value as EmergencyType)
    ? value as EmergencyType
    : undefined;
}

function normalizeTop911Rank(value: unknown): number | undefined {
  const rank = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isInteger(rank)) return undefined;
  return TOP_911_EMERGENCIES.some((item) => item.rank === rank) ? rank : undefined;
}

function normalizeEscalation(value: unknown): AiEmergencyRoute['escalation'] {
  return value === 'immediate_911' || value === 'ask_followup' || value === 'not_911'
    ? value
    : 'immediate_911';
}

function clampConfidence(value: unknown) {
  const confidence = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(confidence)) return 0;
  return Math.max(0, Math.min(1, confidence));
}

function cleanOneLine(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function cleanStringList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanOneLine(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}
