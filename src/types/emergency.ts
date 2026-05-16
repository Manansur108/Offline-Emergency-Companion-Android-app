export type EmergencyType =
  | 'cardiac_arrest'
  | 'fire'
  | 'chemical'
  | 'choking'
  | 'bleeding'
  | 'unsafe_scene'
  | 'trauma'
  | 'carbon_monoxide'
  | 'gas_leak'
  | 'powerline'
  | 'medical'
  | 'unknown';

export interface EmergencyStep {
  number: number;
  instruction: string;
  detail?: string;
  altGuidance?: string;
}

export interface EmergencyProtocol {
  type: EmergencyType;
  title: string;
  steps: EmergencyStep[];
}

export const EMERGENCY_TYPE_LABELS: Record<EmergencyType, string> = {
  cardiac_arrest: 'CARDIAC ARREST',
  fire: 'FIRE',
  chemical: 'CHEMICAL EXPOSURE',
  choking: 'CHOKING',
  bleeding: 'SEVERE BLEEDING',
  unsafe_scene: 'UNSAFE SCENE',
  trauma: 'TRAUMA / RESCUE',
  carbon_monoxide: 'CARBON MONOXIDE',
  gas_leak: 'GAS LEAK',
  powerline: 'POWERLINE HAZARD',
  medical: 'MEDICAL RED FLAGS',
  unknown: 'EMERGENCY',
};
