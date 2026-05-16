import type { EmergencyType } from '../types/emergency';
import type { Top911Emergency } from './top911Emergencies';

export interface BehaviorNudge {
  reaction: string;
  nudge: string;
  firstSafeAction: string;
  module: string;
  coverage: 'Supported' | 'Partial' | 'Not yet';
}

const UNCERTAINTY_RANKS = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 26, 30, 37, 40, 42, 43, 44, 45, 47, 48, 49,
]);
const BLEEDING_RANKS = new Set([12, 24, 25]);
const CPR_RANKS = new Set([20]);
const TRAUMA_RESCUE_RANKS = new Set([21, 22, 27, 28, 29, 39]);
const UNSAFE_SCENE_RANKS = new Set([23, 41, 46]);
const HAZARD_RANKS = new Set([31, 32, 33, 34, 35, 36, 38, 50]);

const BEHAVIOR_NUDGES = {
  uncertainty: {
    reaction: 'Uncertainty and confirmation seeking',
    nudge: 'Use the 911 call script. Do not wait to prove what it is.',
    firstSafeAction: 'Call 911, give the exact location, and describe what changed.',
    module: 'Top-50 triage',
    coverage: 'Not yet',
  },
  bleeding: {
    reaction: 'Blood panic or scene danger',
    nudge: 'Protect yourself, then keep firm pressure on the bleeding.',
    firstSafeAction: 'Call 911, protect yourself, and apply firm direct pressure if safe.',
    module: 'Severe bleeding / trauma',
    coverage: 'Partial',
  },
  cpr: {
    reaction: 'Freeze or fear of doing CPR wrong',
    nudge: 'Put 911 on speaker and follow the compression coach.',
    firstSafeAction: 'Call 911 on speaker and start compressions if unresponsive and not breathing normally.',
    module: 'Cardiac arrest',
    coverage: 'Supported',
  },
  traumaRescue: {
    reaction: 'Moving the injured person or attempting unsafe rescue',
    nudge: 'Do not move them unless there is immediate danger.',
    firstSafeAction: 'Call 911 and keep the person still unless there is immediate danger.',
    module: 'Trauma / rescue',
    coverage: 'Not yet',
  },
  unsafeScene: {
    reaction: 'Fear, silence, hiding, or conflict escalation',
    nudge: 'Create distance. Speak only if it is safe.',
    firstSafeAction: 'Get to safety if possible and call 911 when safe.',
    module: 'Unsafe scene / law enforcement',
    coverage: 'Not yet',
  },
  hazard: {
    reaction: 'Denial, retrieving items, or investigating the hazard',
    nudge: 'Leave now. Do not investigate or go back in.',
    firstSafeAction: 'Move to safety first, then call 911 from outside, uphill, or upwind.',
    module: 'Fire / HazMat / CO / gas',
    coverage: 'Supported',
  },
} satisfies Record<string, BehaviorNudge>;

export const HUMAN_BEHAVIOR_INSIGHTS = [
  'One visible action per screen reduces overload.',
  'A large Done button helps turn freeze into action.',
  'A 911 script helps fragmented speech under panic.',
  'Scene safety prompts reduce dangerous rescue impulses.',
  'Role assignment helps crowds stop duplicating tasks.',
  'Audio, vibration, and large targets help under physical stress.',
];

export function getBehaviorNudgeForTop911(item: Top911Emergency): BehaviorNudge {
  if (CPR_RANKS.has(item.rank)) return BEHAVIOR_NUDGES.cpr;
  if (BLEEDING_RANKS.has(item.rank)) return BEHAVIOR_NUDGES.bleeding;
  if (TRAUMA_RESCUE_RANKS.has(item.rank)) return BEHAVIOR_NUDGES.traumaRescue;
  if (UNSAFE_SCENE_RANKS.has(item.rank)) return BEHAVIOR_NUDGES.unsafeScene;
  if (HAZARD_RANKS.has(item.rank)) return BEHAVIOR_NUDGES.hazard;
  if (UNCERTAINTY_RANKS.has(item.rank)) return BEHAVIOR_NUDGES.uncertainty;

  return BEHAVIOR_NUDGES.uncertainty;
}

export function getBehaviorNudgeForProtocol(type: EmergencyType): BehaviorNudge | null {
  switch (type) {
    case 'cardiac_arrest':
      return BEHAVIOR_NUDGES.cpr;
    case 'bleeding':
      return BEHAVIOR_NUDGES.bleeding;
    case 'fire':
    case 'chemical':
      return BEHAVIOR_NUDGES.hazard;
    case 'choking':
      return {
        reaction: 'Freeze or fear of doing it wrong',
        nudge: 'Act on the clear sign: cannot speak, cough, or breathe.',
        firstSafeAction: 'Call 911 or have someone call, then follow the choking steps.',
        module: 'Choking',
        coverage: 'Supported',
      };
    case 'unknown':
      return BEHAVIOR_NUDGES.uncertainty;
    default:
      return null;
  }
}
