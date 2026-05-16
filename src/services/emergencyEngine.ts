import { getEmergencyProtocol } from '../data/emergencyProtocols';
import { askOfflineModel } from './aiEngine';
import type { EmergencyProtocol, EmergencyType } from '../types/emergency';

const EMERGENCY_KEYS: EmergencyType[] = [
  'cardiac_arrest',
  'fire',
  'chemical',
  'choking',
  'bleeding',
  'unsafe_scene',
  'trauma',
  'carbon_monoxide',
  'gas_leak',
  'powerline',
  'medical',
  'unknown',
];

export async function classifyEmergency(input: string): Promise<EmergencyType> {
  const trimmedInput = input.trim();
  if (!trimmedInput) return 'unknown';

  try {
    const result = await askOfflineModel(
      [
        'You are an emergency classifier.',
        'Given the description below, respond with ONLY one exact word from this list:',
        'cardiac_arrest',
        'fire',
        'chemical',
        'choking',
        'bleeding',
        'unsafe_scene',
        'trauma',
        'carbon_monoxide',
        'gas_leak',
        'powerline',
        'medical',
        'unknown',
        '',
        `Description: ${trimmedInput}`,
        '',
        'Response:',
      ].join('\n'),
      { maxTokens: 12, temperature: 0, lookahead: 1 },
    );
    const parsed = parseEmergencyType(result.text);
    if (parsed !== 'unknown') return parsed;
  } catch {
    // Keyword fallback keeps the emergency flow usable if the model bridge is unavailable.
  }

  return classifyEmergencyWithKeywords(trimmedInput);
}

export function parseEmergencyType(text: string): EmergencyType {
  const normalized = text.toLowerCase();
  if (normalized.includes('browser preview response')) {
    return 'unknown';
  }

  const firstAnswer = normalized
    .split(/\r?\n/)
    .map((line) => line.replace(/[^a-z_ ]/g, ' ').trim().replace(/\s+/g, '_'))
    .find((line) => EMERGENCY_KEYS.includes(line as EmergencyType));

  if (firstAnswer) return firstAnswer as EmergencyType;

  const compact = normalized.replace(/[^a-z_ ]/g, ' ').replace(/\s+/g, '_');
  const matchedKeys = EMERGENCY_KEYS.filter((key) => key !== 'unknown' && compact.includes(key));

  if (matchedKeys.length === 1) {
    return matchedKeys[0];
  }

  if (/\b(cpr|unconscious|not_breathing|no_pulse|collapsed|cardiac|heart)\b/.test(compact)) {
    return 'cardiac_arrest';
  }
  if (/\b(domestic_violence|weapon|weapons|gun|knife|robbery|threat|threats|shots|active_shooter|cannot_speak|can't_speak|unsafe|attacker|armed)\b/.test(compact)) {
    return 'unsafe_scene';
  }
  if (includesAny(compact, ['powerline', 'power_line', 'downed_wire', 'wire_on_car', 'electrical', 'electrocution', 'arcing'])) return 'powerline';
  if (includesAny(compact, ['carbon_monoxide', 'co_alarm', 'co_detector', 'co_exposure'])) return 'carbon_monoxide';
  if (
    includesAny(compact, ['gas_leak', 'gas_smell', 'smell_gas', 'smells_like_gas', 'smell_of_gas', 'odor_of_gas', 'natural_gas', 'hissing_gas']) ||
    (compact.includes('gas') && (compact.includes('smell') || compact.includes('odor') || compact.includes('hissing')))
  ) return 'gas_leak';
  if (/\b(crash|collision|fall|fallen|fracture|broken_bone|head_injury|drowning|water_rescue|machinery|crush|trapped|entrapment|rescue)\b/.test(compact)) return 'trauma';
  if (/\b(fire|smoke|burning|flames|evacuat)\b/.test(compact)) return 'fire';
  if (/\b(chemical|hazmat|spill|gas|fumes|poison|acid|bleach|chlorine)\b/.test(compact)) return 'chemical';
  if (/\b(chok|airway|cannot_breathe|can't_breathe|food_stuck|heimlich)\b/.test(compact)) return 'choking';
  if (/\b(bleed|blood|wound|cut|tourniquet|hemorrhage)\b/.test(compact)) return 'bleeding';
  if (/\b(chest_pain|shortness_of_breath|weakness|confusion|faint|fainted|syncope|seizure|headache|abdominal|vomit|diabetes|overdose|stroke|pregnan)\b/.test(compact)) return 'medical';

  return 'unknown';
}

export function classifyEmergencyWithKeywords(input: string): EmergencyType {
  return parseEmergencyType(input);
}

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

export async function getAlternativeEmergencyGuidance(
  protocol: EmergencyProtocol,
  stepIndex: number,
  userIssue: string,
): Promise<string> {
  const step = protocol.steps[stepIndex];
  const fallback = step?.altGuidance ?? 'Keep yourself safe, continue the current step if possible, and call 911 now.';

  try {
    const result = await askOfflineModel(
      [
        `Emergency: ${protocol.title}.`,
        `Current step: "${step?.instruction ?? 'Call 911 immediately.'}"`,
        `User says: "${userIssue.trim() || 'not working'}"`,
        'Give one short sentence of alternative guidance.',
        'End with: Call 911 now.',
      ].join('\n'),
      { maxTokens: 96, temperature: 0.2, lookahead: 1 },
    );

    return result.text.trim() || fallback;
  } catch {
    return fallback;
  }
}

export function resolveProtocolForInput(type: EmergencyType) {
  return getEmergencyProtocol(type);
}
