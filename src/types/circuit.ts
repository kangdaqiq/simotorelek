export type BrandStandard = 'HONDA' | 'YAMAHA';
export type BoardModule = 'BODY' | 'ENGINE';
export type BikeSystemVariant = 'MATIC_DC' | 'BEBEK_AC';

export interface ComponentSlots {
  spul: BikeSystemVariant;
  kiprok: BikeSystemVariant;
  keySwitch: BikeSystemVariant;
  cdi: BikeSystemVariant;
  safety: BikeSystemVariant;
}

export type ModularSlotKey = keyof ComponentSlots;

export type WireColorId =
  | 'red'
  | 'black'
  | 'green'
  | 'brown'
  | 'gray'
  | 'brown_white'
  | 'orange'
  | 'light_blue'
  | 'dark_brown'
  | 'dark_green'
  | 'light_green'
  | 'pink'
  | 'yellow'
  | 'white'
  | 'blue'
  | 'black_red'
  | 'blue_yellow'
  | 'yellow_red'
  | 'black_yellow';

export interface WireColorOption {
  id: WireColorId;
  name: string;
  code: string;
  primaryHex: string;
  stripeHex?: string;
  usageHonda?: string;
  usageYamaha?: string;
}

export type PinId =
  | 'BAT_POS'
  | 'BAT_NEG'
  | 'FUSE_IN'
  | 'FUSE_OUT'
  | 'ALT_WHITE'
  | 'ALT_YELLOW'
  | 'SPUL_CDI_AC'
  | 'PULSER_POS'
  | 'ALT_GND'
  | 'REG_WHITE'
  | 'REG_YELLOW'
  | 'REG_RED'
  | 'REG_GND'
  | 'IGN_IN'
  | 'IGN_OUT'
  | 'IGN_KILL'
  | 'IGN_KILL_GND'
  | 'FLS_B'
  | 'FLS_L'
  | 'RLY_30'
  | 'RLY_87'
  | 'RLY_85'
  | 'RLY_86'
  | 'SWR_LIGHT_IN'
  | 'SWR_SENJA_OUT'
  | 'SWR_HEAD_OUT'
  | 'SWR_BRAKE_IN'
  | 'SWR_BRAKE_OUT'
  | 'BRK_REAR_IN'
  | 'BRK_REAR_OUT'
  | 'SWL_DIM_IN'
  | 'SWL_LO_OUT'
  | 'SWL_HI_OUT'
  | 'SWL_TURN_IN'
  | 'SWL_TURN_L'
  | 'SWL_TURN_R'
  | 'SWL_HORN_1'
  | 'SWL_HORN_2'
  | 'IND_L_IN'
  | 'IND_R_IN'
  | 'IND_HI_IN'
  | 'IND_GND'
  | 'HEAD_LO'
  | 'HEAD_HI'
  | 'HEAD_SENJA'
  | 'HEAD_GND'
  | 'TURN_FL_POS'
  | 'TURN_FL_GND'
  | 'TURN_FR_POS'
  | 'TURN_FR_GND'
  | 'HORN_A'
  | 'HORN_B'
  | 'TURN_RL_POS'
  | 'TURN_RL_GND'
  | 'TURN_RR_POS'
  | 'TURN_RR_GND'
  | 'TAIL_SENJA'
  | 'TAIL_STOP'
  | 'TAIL_GND'
  | 'GND_1'
  | 'GND_2'
  | 'GND_3'
  | 'GND_4'
  | 'SIDE_SW_1'
  | 'SIDE_SW_2'
  | 'NEUTRAL_IND_POS'
  | 'NEUTRAL_SW_OUT'
  | 'NEUTRAL_GND'
  | 'ST_BTN_1'
  | 'ST_BTN_2'
  | 'ST_RLY_30'
  | 'ST_RLY_87'
  | 'ST_RLY_85'
  | 'ST_RLY_86'
  | 'ST_MOT_POS'
  | 'ST_MOT_GND'
  | 'CDI_PWR'
  | 'CDI_PULSER'
  | 'CDI_COIL'
  | 'CDI_KILL'
  | 'CDI_SIDESTAND'
  | 'CDI_GND'
  | 'COIL_POS'
  | 'COIL_GND'
  | 'COP_OUT'
  | 'PLUG_TOP'
  | 'PLUG_GND';

export type WireFaultType = 'NONE' | 'OPEN' | 'SHORT_GND' | 'CORRODED';

export interface Wire {
  id: string;
  from: PinId;
  to: PinId;
  color: WireColorId;
  fault?: WireFaultType; // Hidden internal wire fault (visually normal outside!)
}

export interface SwitchStates {
  ignitionOn: boolean;
  lightMainPos: 'OFF' | 'SENJA' | 'HEAD';
  dimPos: 'LO' | 'HI';
  turnPos: 'OFF' | 'L' | 'R';
  hazardOn: boolean;
  hornPressed: boolean;
  brakeFrontPressed: boolean;
  brakeRearPressed: boolean;
  engineRunning: boolean;
  rpm: number;
  sideStandUp: boolean;
  neutralGearOn: boolean;
  starterPressed: boolean;
  kickStartActive: boolean;
}

export interface ComponentHealth {
  fuseBlown: boolean;
  headLoBlown: boolean;
  headHiBlown: boolean;
  senjaFrontBlown: boolean;
  tailSenjaBlown: boolean;
  tailStopBlown: boolean;
  // Component faults
  faultFlasherBroken: boolean;
  faultRegulatorBroken: boolean;
  faultGroundHeadBroken: boolean;
  faultHornBroken: boolean;
  faultStarterRelayBroken: boolean;
  faultCdiBroken: boolean;
  faultCoilBroken: boolean;
  faultSparkPlugFouled: boolean;
  faultSpulCdiBroken: boolean;
  // Battery health & State of Charge (Isi Aki)
  faultBatteryWeak: boolean; // Aki soak: internal resistance tinggi (12.25V tanpa beban, anjlok 5.8V saat starter!)
  batteryLevel: number; // State of Charge / Kapasitas Aki: 0% (habis total) sampai 100% (penuh)
  // Switch mechanical/contact faults
  faultHornSwitchDirty: boolean;
  faultStarterSwitchDirty: boolean;
  faultLightSwitchDirty: boolean;
  faultTurnSwitchDirty: boolean;
  faultSideStandSwitchDirty: boolean;
  faultBrakeSwitchStuck: boolean; // Switch rem macet terhubung terus
}

export type ActiveTool = 'WIRE' | 'DELETE_WIRE' | 'TEST_LAMP' | 'MULTIMETER';
export type MultimeterMode = 'OFF' | 'DCV' | 'ACV' | 'OHM';

export interface ToolState {
  activeTool: ActiveTool;
  multimeterMode: MultimeterMode;
  probeRedPin: PinId | null;
  probeBlackPin: PinId | null;
  probeTargetNext: 'RED' | 'BLACK';
  testLampClipPin: PinId | null;
  testLampTipPin: PinId | null;
  testLampTargetNext: 'CLIP' | 'TIP';
}

export interface WireFlowState {
  mode: 'DC' | 'AC' | 'HV' | 'NONE';
  intensity: number;
}

export interface SimulationResult {
  wireFlows: Record<string, WireFlowState>;
  shortCircuit: {
    active: boolean;
    triggersFuseBlow: boolean;
    type:
      | 'FUSE_PROTECTED'
      | 'UNFUSED_DANGER'
      | 'AC_SHORT'
      | 'STARTER_OVERCURRENT'
      | 'CDI_OVERVOLTAGE'
      | null;
    message: string;
  };
  overvoltageBlows: {
    headLo: boolean;
    headHi: boolean;
    senjaFront: boolean;
    tailSenja: boolean;
    cdiDamaged: boolean;
  };
  batteryCrankSag: boolean;
  relayEnergized: boolean;
  starterRelayEnergized: boolean;
  starterMotorSpinning: boolean;
  flasherClicking: boolean;
  flasherFastBlink: boolean;
  batteryCharging: boolean;
  batteryLevel: number; // 0 - 100%
  batteryNetAmperes: number; // Arus bersih: positif (+A) saat dicas, negatif (-A) saat dikuras beban
  systemDCVoltage: number;
  spulACVoltage: number;
  spulCdiACVoltage: number;
  pulserACVoltage: number;
  effectiveRpm: number;
  cdiPowered: boolean;
  cdiSideStandOk: boolean;
  cdiTriggered: boolean;
  sparkActive: boolean;
  neutralLampBrightness: number;
  loads: {
    headLo: number;
    headHi: number;
    senjaFront: number;
    turnFrontL: number;
    turnFrontR: number;
    turnRearL: number;
    turnRearR: number;
    indTurnL: number;
    indTurnR: number;
    indHighBeam: number;
    tailSenja: number;
    tailStop: number;
    hornActive: boolean;
    hornIntensity: number;
  };
  multimeterReading: {
    display: string;
    unit: string;
    buzzerBeep: boolean;
    warning?: string;
  };
  testLampBrightness: number;
}
