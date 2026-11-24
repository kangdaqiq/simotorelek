import {
  BoardModule,
  BrandStandard,
  ComponentHealth,
  ComponentSlots,
  SwitchStates,
  Wire,
} from './circuit';

export type ChallengeCategory = 'WIRING' | 'REPAIR' | 'UPGRADE' | 'RANDOM_UKK';

export type ChallengeId =
  | 'W1'
  | 'W2'
  | 'W3'
  | 'W4'
  | 'W5'
  | 'R1'
  | 'R2'
  | 'R3'
  | 'R4'
  | 'R5'
  | 'R6'
  | 'M1'
  | 'M2'
  | 'M3'
  | 'UKK_RANDOM';

export type ReplaceablePartId =
  | 'BATTERY'
  | 'FUSE'
  | 'FLASHER'
  | 'REGULATOR'
  | 'HORN'
  | 'HEADLIGHT_UNIT'
  | 'TAILLIGHT_UNIT'
  | 'STARTER_RELAY'
  | 'CDI_UNIT'
  | 'IGNITION_COIL'
  | 'SPARK_PLUG'
  // Switch Contact Cleaner / Switch Service actions
  | 'SWITCH_RIGHT_CLEAN'
  | 'SWITCH_LEFT_CLEAN'
  | 'SWITCH_STARTER_CLEAN'
  | 'SWITCH_SIDESTAND_CLEAN';

export type RandomUkkScope = 'BODY' | 'ENGINE' | 'FULL_MOTOR';

export interface ChallengeDefinition {
  id: ChallengeId;
  code: string;
  boardModule: BoardModule;
  requiresLinkedMode?: boolean;
  randomScope?: RandomUkkScope;
  secretFaultSummary?: string; // Revealed on pass or for teacher reference
  category: ChallengeCategory;
  difficulty: 'Pemula' | 'Menengah' | 'Mahir';
  title: string;
  customerComplaint: string;
  objectives: string[];
  hint: string;
  hideCurrentFlowByDefault?: boolean;
  setup: (brand: BrandStandard) => {
    slots: ComponentSlots;
    wires: Wire[];
    switches: SwitchStates;
    health: ComponentHealth;
  };
}

export interface ChallengeCheckItem {
  label: string;
  passed: boolean;
  detail?: string;
}

export interface ChallengeEvaluation {
  passed: boolean;
  stars: 0 | 1 | 2 | 3;
  score: number;
  functionalChecks: ChallengeCheckItem[];
  safetyPassed: boolean;
  safetyNote: string;
  proPassed: boolean;
  proNote: string;
}

export interface ChallengeSessionStats {
  startedAtMs: number;
  elapsedSec: number;
  usedDiagnosticTool: boolean;
  blownFuseCount: number;
  wastedPartsCount: number;
  replacedPartsLog: string[];
  hintUsed: boolean;
}

export interface LeaderboardEntry {
  id: string;
  studentName: string;
  className: string;
  challengeId: ChallengeId;
  challengeTitle: string;
  stars: 1 | 2 | 3;
  score: number;
  elapsedSec: number;
  brand: BrandStandard;
  timestamp: string;
}
