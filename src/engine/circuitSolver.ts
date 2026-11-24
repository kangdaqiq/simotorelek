import { ALL_PINS } from '../data/wireStandards';
import {
  ComponentHealth,
  ComponentSlots,
  PinId,
  SimulationResult,
  SwitchStates,
  ToolState,
  Wire,
  WireFlowState,
} from '../types/circuit';

interface Edge0 {
  to: PinId;
  wireId?: string;
  isFuse?: boolean;
  isSmallSwitch?: boolean;
  ohms: number; // 0.05 for normal wire/switch, 18.5 for CORRODED wire
}

class DisjointSet {
  private parent = new Map<PinId, PinId>();

  constructor(pins: PinId[]) {
    for (const p of pins) this.parent.set(p, p);
  }

  find(x: PinId): PinId {
    const p = this.parent.get(x)!;
    if (p === x) return x;
    const root = this.find(p);
    this.parent.set(x, root);
    return root;
  }

  union(a: PinId, b: PinId) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }

  same(a: PinId, b: PinId): boolean {
    return this.find(a) === this.find(b);
  }
}

interface ResistiveLoadDef {
  id: string;
  p1: PinId;
  p2: PinId;
  intact: boolean;
  ohms: number;
  turnWeight?: number;
}

interface ZeroGraphOptions {
  includeFuse: boolean;
  includeRelayContact: boolean;
  includeStarterRelayContact: boolean;
  includeFlasherContact: boolean;
  includeCorrodedWires: boolean;
  excludeSmallSwitchesForHighCurrent?: boolean;
}

function buildZeroOhmEdges(
  wires: Wire[],
  switches: SwitchStates,
  health: ComponentHealth,
  slots: ComponentSlots,
  opts: ZeroGraphOptions
): { adj: Map<PinId, Edge0[]> } {
  const adj = new Map<PinId, Edge0[]>();
  for (const p of ALL_PINS) adj.set(p, []);

  const addEdge = (
    a: PinId,
    b: PinId,
    wireId?: string,
    isFuse?: boolean,
    isSmallSwitch?: boolean,
    ohms = 0.05
  ) => {
    if (opts.excludeSmallSwitchesForHighCurrent && isSmallSwitch) return;
    adj.get(a)!.push({ to: b, wireId, isFuse, isSmallSwitch, ohms });
    adj.get(b)!.push({ to: a, wireId, isFuse, isSmallSwitch, ohms });
  };

  for (const w of wires) {
    // 1. OPEN wire fault: broken copper inside insulation -> conducts NOTHING!
    if (w.fault === 'OPEN') continue;

    // 2. CORRODED wire/socket fault: high resistance ~18.5 Ohm voltage drop!
    if (w.fault === 'CORRODED') {
      if (opts.includeCorrodedWires) {
        addEdge(w.from, w.to, w.id, false, true, 18.5);
      }
      continue;
    }

    // Normal or SHORT_GND wire conducts end-to-end
    addEdge(w.from, w.to, w.id, false, false, 0.05);

    // 3. SHORT_GND wire fault: chafed insulation touching chassis ground mid-wire!
    if (w.fault === 'SHORT_GND') {
      addEdge(w.from, 'GND_1', w.id, false, false, 0.05);
      addEdge(w.to, 'GND_1', w.id, false, false, 0.05);
    }
  }

  // Chassis Ground Bus
  addEdge('GND_1', 'GND_2');
  addEdge('GND_2', 'GND_3');
  addEdge('GND_3', 'GND_4');

  // Fuse 10A
  if (opts.includeFuse) {
    addEdge('FUSE_IN', 'FUSE_OUT', undefined, true, false);
  }

  // Kunci Kontak Modular
  if (switches.ignitionOn) {
    addEdge('IGN_IN', 'IGN_OUT', undefined, false, true);
  } else if (slots.keySwitch === 'BEBEK_AC') {
    addEdge('IGN_KILL', 'IGN_KILL_GND', undefined, false, false);
  }

  // Safety Switch Modular (with dirty side-stand switch support)
  if (slots.safety === 'MATIC_DC') {
    if (switches.sideStandUp && !health.faultSideStandSwitchDirty) {
      addEdge('SIDE_SW_1', 'SIDE_SW_2', undefined, false, true);
    }
  } else {
    if (switches.neutralGearOn) {
      addEdge('NEUTRAL_SW_OUT', 'NEUTRAL_GND', undefined, false, true);
    }
  }

  // Starter Push Button (with dirty contact fault support)
  if (switches.starterPressed && !health.faultStarterSwitchDirty) {
    addEdge('ST_BTN_1', 'ST_BTN_2', undefined, false, true);
  }

  // Right Switch: Main Lighting (with dirty contact fault support)
  if (!health.faultLightSwitchDirty) {
    if (switches.lightMainPos === 'SENJA') {
      addEdge('SWR_LIGHT_IN', 'SWR_SENJA_OUT', undefined, false, true);
    } else if (switches.lightMainPos === 'HEAD') {
      addEdge('SWR_LIGHT_IN', 'SWR_SENJA_OUT', undefined, false, true);
      addEdge('SWR_LIGHT_IN', 'SWR_HEAD_OUT', undefined, false, true);
    }
  }

  // Brake Switches (with Stuck-Closed Front Brake Switch fault support!)
  if (switches.brakeFrontPressed || health.faultBrakeSwitchStuck) {
    addEdge('SWR_BRAKE_IN', 'SWR_BRAKE_OUT', undefined, false, true);
  }
  if (switches.brakeRearPressed) {
    addEdge('BRK_REAR_IN', 'BRK_REAR_OUT', undefined, false, true);
  }

  // Left Switch: Dimmer (Hi/Lo)
  if (switches.dimPos === 'LO') {
    addEdge('SWL_DIM_IN', 'SWL_LO_OUT', undefined, false, true);
  } else {
    addEdge('SWL_DIM_IN', 'SWL_HI_OUT', undefined, false, true);
  }

  // Left Switch: Turn Signal & Hazard (with dirty contact fault support)
  if (!health.faultTurnSwitchDirty) {
    if (switches.hazardOn) {
      addEdge('SWL_TURN_IN', 'SWL_TURN_L', undefined, false, true);
      addEdge('SWL_TURN_IN', 'SWL_TURN_R', undefined, false, true);
    } else if (switches.turnPos === 'L') {
      addEdge('SWL_TURN_IN', 'SWL_TURN_L', undefined, false, true);
    } else if (switches.turnPos === 'R') {
      addEdge('SWL_TURN_IN', 'SWL_TURN_R', undefined, false, true);
    }
  }

  // Left Switch: Horn Button (with dirty contact fault support)
  if (switches.hornPressed && !health.faultHornSwitchDirty) {
    addEdge('SWL_HORN_1', 'SWL_HORN_2', undefined, false, true);
  }

  // Standard 4-pin Relay (30 - 87)
  if (opts.includeRelayContact) {
    addEdge('RLY_30', 'RLY_87');
  }

  // Heavy-Duty Starter Relay / Bendik (30 - 87)
  if (opts.includeStarterRelayContact) {
    addEdge('ST_RLY_30', 'ST_RLY_87');
  }

  // Flasher (B - L)
  if (opts.includeFlasherContact) {
    addEdge('FLS_B', 'FLS_L', undefined, false, true);
  }

  return { adj };
}

function buildDSU(adj: Map<PinId, Edge0[]>): DisjointSet {
  const dsu = new DisjointSet(ALL_PINS);
  for (const [u, edges] of adj.entries()) {
    for (const e of edges) {
      dsu.union(u, e.to);
    }
  }
  return dsu;
}

function markConductiveWires(
  adj: Map<PinId, Edge0[]>,
  sources: PinId[],
  targets: PinId[],
  mode: 'DC' | 'AC' | 'HV',
  intensity: number,
  wireFlows: Record<string, WireFlowState>
) {
  const targetSet = new Set(targets);
  const distFromSrc = new Map<PinId, number>();
  const q: PinId[] = [];
  for (const s of sources) {
    distFromSrc.set(s, 0);
    q.push(s);
  }
  let head = 0;
  while (head < q.length) {
    const u = q[head++];
    const d = distFromSrc.get(u)!;
    for (const e of adj.get(u) || []) {
      if (!distFromSrc.has(e.to)) {
        distFromSrc.set(e.to, d + 1);
        q.push(e.to);
      }
    }
  }

  const revVisited = new Set<PinId>();
  const rq: PinId[] = [];
  for (const t of targetSet) {
    if (distFromSrc.has(t)) {
      revVisited.add(t);
      rq.push(t);
    }
  }
  let rHead = 0;
  while (rHead < rq.length) {
    const cur = rq[rHead++];
    const curDist = distFromSrc.get(cur)!;
    for (const e of adj.get(cur) || []) {
      const prevDist = distFromSrc.get(e.to);
      if (prevDist !== undefined && prevDist === curDist - 1) {
        if (e.wireId) {
          const prev = wireFlows[e.wireId];
          if (!prev || prev.mode === 'NONE' || intensity >= prev.intensity) {
            wireFlows[e.wireId] = { mode, intensity };
          }
        }
        if (!revVisited.has(e.to)) {
          revVisited.add(e.to);
          rq.push(e.to);
        }
      }
    }
  }
}

export function solveCircuit(
  wires: Wire[],
  switches: SwitchStates,
  health: ComponentHealth,
  tools: ToolState,
  slots: ComponentSlots,
  tickTimeMs: number
): SimulationResult {
  const wireFlows: Record<string, WireFlowState> = {};
  for (const w of wires) {
    wireFlows[w.id] = { mode: 'NONE', intensity: 0 };
  }

  const headGndIntact = !health.faultGroundHeadBroken;
  const hasYellowWinding = slots.spul === 'BEBEK_AC';
  const hasCdiAcWinding = slots.spul === 'BEBEK_AC' && !health.faultSpulCdiBroken;

  const loadDefs: ResistiveLoadDef[] = [
    { id: 'headLo', p1: 'HEAD_LO', p2: 'HEAD_GND', intact: !health.headLoBlown && headGndIntact, ohms: 3.8 },
    { id: 'headHi', p1: 'HEAD_HI', p2: 'HEAD_GND', intact: !health.headHiBlown && headGndIntact, ohms: 3.8 },
    { id: 'senjaFront', p1: 'HEAD_SENJA', p2: 'HEAD_GND', intact: !health.senjaFrontBlown && headGndIntact, ohms: 28 },
    { id: 'turnFrontL', p1: 'TURN_FL_POS', p2: 'TURN_FL_GND', intact: true, ohms: 14.4, turnWeight: 1.0 },
    { id: 'turnFrontR', p1: 'TURN_FR_POS', p2: 'TURN_FR_GND', intact: true, ohms: 14.4, turnWeight: 1.0 },
    { id: 'turnRearL', p1: 'TURN_RL_POS', p2: 'TURN_RL_GND', intact: true, ohms: 14.4, turnWeight: 1.0 },
    { id: 'turnRearR', p1: 'TURN_RR_POS', p2: 'TURN_RR_GND', intact: true, ohms: 14.4, turnWeight: 1.0 },
    { id: 'indTurnL', p1: 'IND_L_IN', p2: 'IND_GND', intact: true, ohms: 48, turnWeight: 0.2 },
    { id: 'indTurnR', p1: 'IND_R_IN', p2: 'IND_GND', intact: true, ohms: 48, turnWeight: 0.2 },
    { id: 'indHighBeam', p1: 'IND_HI_IN', p2: 'IND_GND', intact: true, ohms: 48 },
    { id: 'tailSenja', p1: 'TAIL_SENJA', p2: 'TAIL_GND', intact: !health.tailSenjaBlown, ohms: 28 },
    { id: 'tailStop', p1: 'TAIL_STOP', p2: 'TAIL_GND', intact: !health.tailStopBlown, ohms: 8.0 },
    { id: 'horn', p1: 'HORN_A', p2: 'HORN_B', intact: !health.faultHornBroken, ohms: 2.2 },
    { id: 'relayCoil', p1: 'RLY_85', p2: 'RLY_86', intact: true, ohms: 85.0 },
    { id: 'neutralLamp', p1: 'NEUTRAL_IND_POS', p2: 'NEUTRAL_SW_OUT', intact: slots.safety === 'BEBEK_AC', ohms: 48.0 },
    { id: 'starterRelayCoil', p1: 'ST_RLY_85', p2: 'ST_RLY_86', intact: !health.faultStarterRelayBroken, ohms: 4.8 },
    { id: 'starterMotor', p1: 'ST_MOT_POS', p2: 'ST_MOT_GND', intact: true, ohms: 0.3 },
    { id: 'ignitionCoilPrimary', p1: 'COIL_POS', p2: 'COIL_GND', intact: !health.faultCoilBroken, ohms: 0.9 },
    { id: 'pulserCoil', p1: 'PULSER_POS', p2: 'ALT_GND', intact: true, ohms: 125.0 },
    { id: 'spulCdiCoil', p1: 'SPUL_CDI_AC', p2: 'ALT_GND', intact: hasCdiAcWinding, ohms: 310.0 },
  ];

  let fuseIntact = !health.fuseBlown;
  let shortCircuit: SimulationResult['shortCircuit'] = {
    active: false,
    triggersFuseBlow: false,
    type: null,
    message: '',
  };

  // Pass 1: Clean low-resistance graph (excluding 18.5-ohm corroded wires so relays & shorts respond realistically)
  let gPass1 = buildZeroOhmEdges(wires, switches, health, slots, {
    includeFuse: fuseIntact,
    includeRelayContact: false,
    includeStarterRelayContact: false,
    includeFlasherContact: false,
    includeCorrodedWires: false,
  });
  let dsu1 = buildDSU(gPass1.adj);

  const checkShort = (
    dsuWithFuse: DisjointSet,
    relayClosed: boolean,
    starterRelayClosed: boolean,
    flasherClosed: boolean
  ): boolean => {
    if (dsuWithFuse.same('BAT_POS', 'BAT_NEG')) {
      const gNoFuse = buildZeroOhmEdges(wires, switches, health, slots, {
        includeFuse: false,
        includeRelayContact: relayClosed,
        includeStarterRelayContact: starterRelayClosed,
        includeFlasherContact: flasherClosed,
        includeCorrodedWires: false,
      });
      const dsuNoFuse = buildDSU(gNoFuse.adj);
      if (!dsuNoFuse.same('BAT_POS', 'BAT_NEG') && fuseIntact) {
        fuseIntact = false;
        shortCircuit = {
          active: true,
          triggersFuseBlow: true,
          type: 'FUSE_PROTECTED',
          message: 'KORSLETING DC! Arus Positif (+) bertemu Massa (-) tanpa beban -> Sekring 10A PUTUS!',
        };
        return true;
      } else if (dsuNoFuse.same('BAT_POS', 'BAT_NEG')) {
        shortCircuit = {
          active: true,
          triggersFuseBlow: false,
          type: 'UNFUSED_DANGER',
          message: 'BAHAYA KORSLETING TANPA SEKRING! Jalur Aki (+) langsung ke Massa (-) tanpa pengaman!',
        };
      }
    }
    return false;
  };

  if (checkShort(dsu1, false, false, false)) {
    gPass1 = buildZeroOhmEdges(wires, switches, health, slots, {
      includeFuse: false,
      includeRelayContact: false,
      includeStarterRelayContact: false,
      includeFlasherContact: false,
      includeCorrodedWires: false,
    });
    dsu1 = buildDSU(gPass1.adj);
  }

  const isDCPairPowered = (dsu: DisjointSet, a: PinId, b: PinId): boolean => {
    if (dsu.same('BAT_POS', 'BAT_NEG')) return false;
    return (
      (dsu.same(a, 'BAT_POS') && dsu.same(b, 'BAT_NEG')) ||
      (dsu.same(b, 'BAT_POS') && dsu.same(a, 'BAT_NEG'))
    );
  };

  const relayEnergized = isDCPairPowered(dsu1, 'RLY_85', 'RLY_86');
  const starterRelayEnergized =
    !health.faultStarterRelayBroken && isDCPairPowered(dsu1, 'ST_RLY_85', 'ST_RLY_86');

  if (relayEnergized || starterRelayEnergized) {
    gPass1 = buildZeroOhmEdges(wires, switches, health, slots, {
      includeFuse: fuseIntact,
      includeRelayContact: relayEnergized,
      includeStarterRelayContact: starterRelayEnergized,
      includeFlasherContact: false,
      includeCorrodedWires: false,
    });
    dsu1 = buildDSU(gPass1.adj);
    if (checkShort(dsu1, relayEnergized, starterRelayEnergized, false)) {
      gPass1 = buildZeroOhmEdges(wires, switches, health, slots, {
        includeFuse: false,
        includeRelayContact: false,
        includeStarterRelayContact: false,
        includeFlasherContact: false,
        includeCorrodedWires: false,
      });
      dsu1 = buildDSU(gPass1.adj);
    }
  }

  // Starter Motor & Weak Battery Cranking Sag evaluation!
  let starterMotorSpinning = false;
  let batteryCrankSag = false;

  if (isDCPairPowered(dsu1, 'ST_MOT_POS', 'ST_MOT_GND')) {
    const gWithoutFuse = buildZeroOhmEdges(wires, switches, health, slots, {
      includeFuse: false,
      includeRelayContact: relayEnergized,
      includeStarterRelayContact: starterRelayEnergized,
      includeFlasherContact: false,
      includeCorrodedWires: false,
    });
    const dsuWithoutFuse = buildDSU(gWithoutFuse.adj);
    const stillPoweredWithoutFuse = isDCPairPowered(dsuWithoutFuse, 'ST_MOT_POS', 'ST_MOT_GND');

    if (!stillPoweredWithoutFuse && fuseIntact) {
      fuseIntact = false;
      shortCircuit = {
        active: true,
        triggersFuseBlow: true,
        type: 'STARTER_OVERCURRENT',
        message:
          'SEKRING 10A PUTUS! Arus Dinamo Starter (~45A) tidak boleh melewati Sekring 10A — gunakan kabel langsung Aki (+) ke Baut 30 Bendik!',
      };
    } else {
      const gHeavyOnly = buildZeroOhmEdges(wires, switches, health, slots, {
        includeFuse: false,
        includeRelayContact: relayEnergized,
        includeStarterRelayContact: starterRelayEnergized,
        includeFlasherContact: false,
        includeCorrodedWires: false,
        excludeSmallSwitchesForHighCurrent: true,
      });
      const dsuHeavy = buildDSU(gHeavyOnly.adj);
      if (!isDCPairPowered(dsuHeavy, 'ST_MOT_POS', 'ST_MOT_GND')) {
        shortCircuit = {
          active: true,
          triggersFuseBlow: false,
          type: 'STARTER_OVERCURRENT',
          message:
            'BAHAYA SAKLAR MELELEH! Arus besar Dinamo Starter wajib lewat kontak Baut 30-87 Bendik!',
        };
      } else if (health.faultBatteryWeak || (health.batteryLevel ?? 96) < 22) {
        // AKI SOAK ATAU AKI TEKOR (< 22%)! Tegangan anjlok saat beban 45A starter -> dinamo gagal memutar kruk as!
        batteryCrankSag = true;
        starterMotorSpinning = false;
      } else {
        starterMotorSpinning = true;
      }
    }
  }

  const effectiveRpm = switches.engineRunning
    ? Math.max(1400, switches.rpm)
    : starterMotorSpinning
      ? 550
      : switches.kickStartActive
        ? 650
        : 0;

  const rawSpulAC =
    effectiveRpm > 0 ? Number((9.8 * Math.pow(effectiveRpm / 1500, 0.72)).toFixed(2)) : 0;
  const spulCdiRawAC =
    hasCdiAcWinding && effectiveRpm > 0
      ? Number(Math.min(210, 75 + (effectiveRpm / 8000) * 135).toFixed(1))
      : 0;
  const pulserRawAC =
    effectiveRpm > 0 ? Number(Math.min(3.2, 0.6 + (effectiveRpm / 8000) * 2.4).toFixed(2)) : 0;

  // Flasher evaluation
  let flasherClicking = false;
  let flasherFastBlink = false;
  let flasherConducting = false;

  if (!health.faultFlasherBroken && fuseIntact && !dsu1.same('BAT_POS', 'BAT_NEG')) {
    const flsBHasPower = dsu1.same('FLS_B', 'BAT_POS');
    if (flsBHasPower) {
      if (dsu1.same('FLS_L', 'BAT_NEG')) {
        const gTest = buildZeroOhmEdges(wires, switches, health, slots, {
          includeFuse: fuseIntact,
          includeRelayContact: relayEnergized,
          includeStarterRelayContact: starterRelayEnergized,
          includeFlasherContact: true,
          includeCorrodedWires: false,
        });
        checkShort(buildDSU(gTest.adj), relayEnergized, starterRelayEnergized, true);
      } else {
        let totalTurnWeight = 0;
        for (const ld of loadDefs) {
          if (!ld.intact || !ld.turnWeight) continue;
          const connects =
            (dsu1.same(ld.p1, 'FLS_L') && dsu1.same(ld.p2, 'BAT_NEG')) ||
            (dsu1.same(ld.p2, 'FLS_L') && dsu1.same(ld.p1, 'BAT_NEG'));
          if (connects) totalTurnWeight += ld.turnWeight;
        }
        if (tools.activeTool === 'TEST_LAMP' && tools.testLampClipPin && tools.testLampTipPin) {
          const testConnects =
            (dsu1.same(tools.testLampClipPin, 'FLS_L') && dsu1.same(tools.testLampTipPin, 'BAT_NEG')) ||
            (dsu1.same(tools.testLampTipPin, 'FLS_L') && dsu1.same(tools.testLampClipPin, 'BAT_NEG'));
          if (testConnects) totalTurnWeight += 0.25;
        }
        if (totalTurnWeight >= 0.2) {
          flasherClicking = true;
          flasherFastBlink = totalTurnWeight < 1.5;
          const periodHalf = flasherFastBlink ? 145 : 360;
          flasherConducting = Math.floor(tickTimeMs / periodHalf) % 2 === 0;
        }
      }
    }
  }

  // Clean final graph AND Corroded-inclusive graph (to detect high-resistance voltage-dropped paths!)
  const gClean = buildZeroOhmEdges(wires, switches, health, slots, {
    includeFuse: fuseIntact,
    includeRelayContact: relayEnergized,
    includeStarterRelayContact: starterRelayEnergized && fuseIntact,
    includeFlasherContact: flasherConducting,
    includeCorrodedWires: false,
  });
  const dsuClean = buildDSU(gClean.adj);

  const gWithCorroded = buildZeroOhmEdges(wires, switches, health, slots, {
    includeFuse: fuseIntact,
    includeRelayContact: relayEnergized,
    includeStarterRelayContact: starterRelayEnergized && fuseIntact,
    includeFlasherContact: flasherConducting,
    includeCorrodedWires: true,
  });
  const dsuCorroded = buildDSU(gWithCorroded.adj);

  // AC Short checks
  const yellowShorted = hasYellowWinding && rawSpulAC > 0 && dsuClean.same('ALT_YELLOW', 'ALT_GND');
  const whiteShorted = rawSpulAC > 0 && dsuClean.same('ALT_WHITE', 'ALT_GND');
  const cdiSpulShorted = spulCdiRawAC > 0 && dsuClean.same('SPUL_CDI_AC', 'ALT_GND');

  if ((yellowShorted || whiteShorted || cdiSpulShorted) && !shortCircuit.active) {
    shortCircuit = {
      active: true,
      triggersFuseBlow: false,
      type: 'AC_SHORT',
      message: 'KORSLETING ARUS SPUL AC! Kabel Spul terhubung langsung ke Massa tanpa beban!',
    };
  }

  // Kiprok Regulation & Charging
  const kiprokGroundedToSpul = dsuClean.same('REG_GND', 'ALT_GND');
  const acYellowRegulated =
    slots.kiprok === 'BEBEK_AC' &&
    !health.faultRegulatorBroken &&
    kiprokGroundedToSpul &&
    dsuClean.same('REG_YELLOW', 'ALT_YELLOW');

  const spulYellowAC = !hasYellowWinding || yellowShorted
    ? 0
    : acYellowRegulated
      ? Math.min(13.6, rawSpulAC)
      : rawSpulAC;
  const spulWhiteAC = whiteShorted ? 0 : rawSpulAC;
  const spulCdiACVoltage = cdiSpulShorted ? 0 : spulCdiRawAC;
  const pulserACVoltage = dsuClean.same('PULSER_POS', 'ALT_GND') ? 0 : pulserRawAC;

  const kiprokChargingReady =
    effectiveRpm >= 1400 &&
    !whiteShorted &&
    !health.faultRegulatorBroken &&
    kiprokGroundedToSpul &&
    dsuClean.same('REG_WHITE', 'ALT_WHITE');

  const kiprokRegRedVoltage = kiprokChargingReady
    ? Number(Math.min(14.4, Math.max(12.2, 11.4 + (effectiveRpm / 8000) * 3.5)).toFixed(2))
    : 0;

  const dcShortedUnfused = dsuClean.same('BAT_POS', 'BAT_NEG');
  const batteryCharging =
    !dcShortedUnfused &&
    kiprokChargingReady &&
    dsuClean.same('REG_GND', 'BAT_NEG') &&
    dsuClean.same('REG_RED', 'BAT_POS') &&
    effectiveRpm >= 1700;

  const heavyHeadlightDrawingDC =
    !batteryCharging &&
    (isDCPairPowered(dsuClean, 'HEAD_LO', 'HEAD_GND') ||
      isDCPairPowered(dsuClean, 'HEAD_HI', 'HEAD_GND'));

  // Battery State of Charge (SoC) Curve & Realistic Open Circuit Voltage (OCV)
  const rawSoc = typeof health.batteryLevel === 'number' ? health.batteryLevel : 96;
  const soc = Math.max(0, Math.min(100, rawSoc));

  const getBatteryOpenCircuitV = (s: number) => {
    if (s >= 80) return 12.6 + ((s - 80) / 20) * 0.28; // 12.60V .. 12.88V (Aki penuh)
    if (s >= 40) return 12.1 + ((s - 40) / 40) * 0.50; // 12.10V .. 12.60V (Aki sedang)
    if (s >= 15) return 11.3 + ((s - 15) / 25) * 0.80; // 11.30V .. 12.10V (Mulai drop)
    return 9.6 + (s / 15) * 1.70;                      // 9.60V .. 11.30V (Tekor parah)
  };

  const normalBatteryV = Number(getBatteryOpenCircuitV(soc).toFixed(2));

  const baseBatteryV = health.faultBatteryWeak
    ? batteryCrankSag
      ? 5.8
      : heavyHeadlightDrawingDC
        ? 9.1
        : 12.25
    : batteryCrankSag
      ? soc < 10 ? 5.2 : 6.8
      : heavyHeadlightDrawingDC
        ? Math.max(7.5, normalBatteryV - 0.45)
        : normalBatteryV;

  const systemDCVoltage = dcShortedUnfused
    ? 0
    : starterMotorSpinning
      ? Math.max(9.8, normalBatteryV - 1.5)
      : batteryCharging
        ? Math.max(baseBatteryV, kiprokRegRedVoltage)
        : baseBatteryV;

  // ==================== MODULAR IGNITION SYSTEM ====================
  let cdiPowered = false;
  let cdiSideStandOk = true;
  let cdiDamaged = false;

  if (slots.cdi === 'MATIC_DC') {
    if (
      !health.faultCdiBroken &&
      spulCdiACVoltage >= 60 &&
      dsuClean.same('CDI_GND', 'ALT_GND') &&
      (dsuClean.same('CDI_PWR', 'SPUL_CDI_AC') || dsuClean.same('CDI_SIDESTAND', 'SPUL_CDI_AC'))
    ) {
      cdiDamaged = true;
      shortCircuit = {
        active: true,
        triggersFuseBlow: false,
        type: 'CDI_OVERVOLTAGE',
        message:
          '💥 CDI MATIC DC JEBOL! Tegangan tinggi Spul Bebek AC (~150V) masuk ke pin 12V CDI Matic DC!',
      };
    }

    if (!health.faultCdiBroken && !cdiDamaged) {
      const has12V =
        (systemDCVoltage >= 8.5 &&
          dsuClean.same('CDI_PWR', 'BAT_POS') &&
          dsuClean.same('CDI_GND', 'BAT_NEG')) ||
        (kiprokRegRedVoltage >= 8.5 &&
          dsuClean.same('CDI_PWR', 'REG_RED') &&
          dsuClean.same('CDI_GND', 'REG_GND'));

      cdiSideStandOk =
        (dsuClean.same('CDI_SIDESTAND', 'BAT_NEG') || dsuClean.same('CDI_SIDESTAND', 'CDI_GND')) &&
        (dsuClean.same('CDI_GND', 'BAT_NEG') || dsuClean.same('CDI_GND', 'REG_GND'));

      cdiPowered = has12V && cdiSideStandOk;
    }
  } else {
    const cdiKilled = dsuClean.same('CDI_KILL', 'CDI_GND') || dsuClean.same('CDI_KILL', 'ALT_GND');
    cdiSideStandOk = !cdiKilled;
    if (!health.faultCdiBroken) {
      cdiPowered =
        !cdiKilled &&
        spulCdiACVoltage >= 45 &&
        dsuClean.same('CDI_PWR', 'SPUL_CDI_AC') &&
        dsuClean.same('CDI_GND', 'ALT_GND');
    }
  }

  const cdiSharesPulserGnd = dsuClean.same('CDI_GND', 'ALT_GND');
  const cdiTriggered =
    cdiPowered &&
    cdiSharesPulserGnd &&
    pulserACVoltage > 0.3 &&
    dsuClean.same('CDI_PULSER', 'PULSER_POS');

  const coilConnected =
    !health.faultCoilBroken &&
    dsuClean.same('CDI_COIL', 'COIL_POS') &&
    dsuClean.same('COIL_GND', 'CDI_GND') &&
    !dsuClean.same('CDI_COIL', 'CDI_GND');

  const sparkPlugConnected =
    !health.faultSparkPlugFouled &&
    dsuClean.same('COP_OUT', 'PLUG_TOP') &&
    dsuClean.same('PLUG_GND', 'COIL_GND');

  const sparkActive = cdiTriggered && coilConnected && sparkPlugConnected;

  // Compute live net current (Ampere) into or out of the 12V Battery
  let dcLoadAmps = 0;
  if (!dcShortedUnfused && systemDCVoltage > 2) {
    if (starterMotorSpinning || (batteryCrankSag && switches.starterPressed)) {
      dcLoadAmps += 45.0;
    }
    if (starterRelayEnergized) dcLoadAmps += 0.8;
    if (relayEnergized) dcLoadAmps += 0.15;
    if (cdiPowered && slots.cdi === 'MATIC_DC') dcLoadAmps += 0.55;
    if (isDCPairPowered(dsuClean, 'HEAD_LO', 'HEAD_GND')) dcLoadAmps += 2.9;
    if (isDCPairPowered(dsuClean, 'HEAD_HI', 'HEAD_GND')) dcLoadAmps += 3.3;
    if (isDCPairPowered(dsuClean, 'HEAD_SENJA', 'HEAD_GND')) dcLoadAmps += 0.4;
    if (isDCPairPowered(dsuClean, 'TAIL_SENJA', 'TAIL_GND')) dcLoadAmps += 0.4;
    if (isDCPairPowered(dsuClean, 'TAIL_STOP', 'TAIL_GND')) dcLoadAmps += 1.75;
    if (flasherConducting) {
      if (isDCPairPowered(dsuClean, 'TURN_FL_POS', 'TURN_FL_GND')) dcLoadAmps += 0.85;
      if (isDCPairPowered(dsuClean, 'TURN_FR_POS', 'TURN_FR_GND')) dcLoadAmps += 0.85;
      if (isDCPairPowered(dsuClean, 'TURN_RL_POS', 'TURN_RL_GND')) dcLoadAmps += 0.85;
      if (isDCPairPowered(dsuClean, 'TURN_RR_POS', 'TURN_RR_GND')) dcLoadAmps += 0.85;
    }
    if (switches.hornPressed && isDCPairPowered(dsuClean, 'HORN_A', 'HORN_B')) dcLoadAmps += 2.5;
    if (isDCPairPowered(dsuClean, 'NEUTRAL_IND_POS', 'NEUTRAL_SW_OUT')) dcLoadAmps += 0.25;
    if (switches.ignitionOn) dcLoadAmps += 0.08;
  }

  const batteryNetAmperes = batteryCharging
    ? Number((1.8 + (effectiveRpm / 8000) * 2.2 - dcLoadAmps * 0.12).toFixed(1))
    : Number((-dcLoadAmps).toFixed(1));

  // Highlight Modul 2 active wires
  if (starterMotorSpinning) {
    markConductiveWires(gClean.adj, ['BAT_POS'], ['ST_MOT_POS'], 'DC', 1.2, wireFlows);
    markConductiveWires(gClean.adj, ['ST_MOT_GND'], ['BAT_NEG'], 'DC', 1.2, wireFlows);
  }
  if (starterRelayEnergized) {
    if (dsuClean.same('ST_RLY_85', 'BAT_POS')) {
      markConductiveWires(gClean.adj, ['BAT_POS'], ['ST_RLY_85'], 'DC', 0.9, wireFlows);
      markConductiveWires(gClean.adj, ['ST_RLY_86'], ['BAT_NEG'], 'DC', 0.9, wireFlows);
    } else {
      markConductiveWires(gClean.adj, ['BAT_POS'], ['ST_RLY_86'], 'DC', 0.9, wireFlows);
      markConductiveWires(gClean.adj, ['ST_RLY_85'], ['BAT_NEG'], 'DC', 0.9, wireFlows);
    }
  }
  if (cdiPowered) {
    if (slots.cdi === 'MATIC_DC') {
      markConductiveWires(gClean.adj, ['BAT_POS'], ['CDI_PWR'], 'DC', 0.9, wireFlows);
      markConductiveWires(gClean.adj, ['CDI_GND'], ['BAT_NEG'], 'DC', 0.9, wireFlows);
      markConductiveWires(gClean.adj, ['CDI_SIDESTAND'], ['BAT_NEG'], 'DC', 0.75, wireFlows);
    } else {
      markConductiveWires(gClean.adj, ['SPUL_CDI_AC'], ['CDI_PWR'], 'AC', 1.0, wireFlows);
      markConductiveWires(gClean.adj, ['CDI_GND'], ['ALT_GND'], 'AC', 1.0, wireFlows);
    }
  }
  if (cdiTriggered) {
    markConductiveWires(gClean.adj, ['PULSER_POS'], ['CDI_PULSER'], 'AC', 0.85, wireFlows);
  }
  if (cdiTriggered && coilConnected) {
    markConductiveWires(gClean.adj, ['CDI_COIL'], ['COIL_POS'], 'AC', 1.0, wireFlows);
    markConductiveWires(gClean.adj, ['COIL_GND'], ['CDI_GND'], 'DC', 0.9, wireFlows);
  }
  if (sparkActive) {
    markConductiveWires(gClean.adj, ['COP_OUT'], ['PLUG_TOP'], 'HV', 1.3, wireFlows);
    markConductiveWires(gClean.adj, ['PLUG_GND'], ['COIL_GND'], 'DC', 1.0, wireFlows);
  }

  // Evaluate 2-pin loads (including realistic ~65% voltage drop if path passes through a CORRODED 18.5-ohm wire!)
  const evalTwoPin = (
    p1: PinId,
    p2: PinId,
    intact: boolean,
    recordWireFlow: boolean
  ): { vDC: number; vAC: number; droppedByCorrosion: boolean } => {
    if (!intact) return { vDC: 0, vAC: 0, droppedByCorrosion: false };
    let vDC = 0;
    let vAC = 0;
    let droppedByCorrosion = false;

    if (systemDCVoltage > 0) {
      if (
        (dsuClean.same(p1, 'BAT_POS') && dsuClean.same(p2, 'BAT_NEG')) ||
        (dsuClean.same(p2, 'BAT_POS') && dsuClean.same(p1, 'BAT_NEG'))
      ) {
        vDC = systemDCVoltage;
        if (recordWireFlow) {
          const hi = dsuClean.same(p1, 'BAT_POS') ? p1 : p2;
          const lo = hi === p1 ? p2 : p1;
          markConductiveWires(gClean.adj, ['BAT_POS'], [hi], 'DC', vDC / 12, wireFlows);
          markConductiveWires(gClean.adj, [lo], ['BAT_NEG'], 'DC', vDC / 12, wireFlows);
        }
      } else if (
        (dsuCorroded.same(p1, 'BAT_POS') && dsuCorroded.same(p2, 'BAT_NEG')) ||
        (dsuCorroded.same(p2, 'BAT_POS') && dsuCorroded.same(p1, 'BAT_NEG'))
      ) {
        // Corroded wire voltage drop (~4.2V under load!)
        vDC = Number((systemDCVoltage * 0.34).toFixed(2));
        droppedByCorrosion = true;
        if (recordWireFlow) {
          const hi = dsuCorroded.same(p1, 'BAT_POS') ? p1 : p2;
          const lo = hi === p1 ? p2 : p1;
          markConductiveWires(gWithCorroded.adj, ['BAT_POS'], [hi], 'DC', 0.3, wireFlows);
          markConductiveWires(gWithCorroded.adj, [lo], ['BAT_NEG'], 'DC', 0.3, wireFlows);
        }
      }
    }

    if (vDC === 0 && kiprokRegRedVoltage > 0 && !dsuClean.same('REG_RED', 'REG_GND')) {
      if (
        (dsuClean.same(p1, 'REG_RED') && dsuClean.same(p2, 'REG_GND')) ||
        (dsuClean.same(p2, 'REG_RED') && dsuClean.same(p1, 'REG_GND'))
      ) {
        vDC = kiprokRegRedVoltage;
      }
    }

    if (spulYellowAC > 0 && !yellowShorted) {
      if (
        (dsuClean.same(p1, 'ALT_YELLOW') && dsuClean.same(p2, 'ALT_GND')) ||
        (dsuClean.same(p2, 'ALT_YELLOW') && dsuClean.same(p1, 'ALT_GND'))
      ) {
        vAC = spulYellowAC;
        if (recordWireFlow) {
          const hi = dsuClean.same(p1, 'ALT_YELLOW') ? p1 : p2;
          const lo = hi === p1 ? p2 : p1;
          markConductiveWires(gClean.adj, ['ALT_YELLOW'], [hi], 'AC', vAC / 12, wireFlows);
          markConductiveWires(gClean.adj, [lo], ['ALT_GND'], 'AC', vAC / 12, wireFlows);
        }
      } else if (
        (dsuCorroded.same(p1, 'ALT_YELLOW') && dsuCorroded.same(p2, 'ALT_GND')) ||
        (dsuCorroded.same(p2, 'ALT_YELLOW') && dsuCorroded.same(p1, 'ALT_GND'))
      ) {
        vAC = Number((spulYellowAC * 0.34).toFixed(2));
        droppedByCorrosion = true;
      }
    }

    if (vAC === 0 && spulWhiteAC > 0 && !whiteShorted) {
      if (
        (dsuClean.same(p1, 'ALT_WHITE') && dsuClean.same(p2, 'ALT_GND')) ||
        (dsuClean.same(p2, 'ALT_WHITE') && dsuClean.same(p1, 'ALT_GND'))
      ) {
        vAC = spulWhiteAC;
      }
    }

    return { vDC, vAC, droppedByCorrosion };
  };

  if (acYellowRegulated && rawSpulAC > 13.6) {
    markConductiveWires(gClean.adj, ['ALT_YELLOW'], ['REG_YELLOW'], 'AC', 0.8, wireFlows);
    markConductiveWires(gClean.adj, ['REG_GND'], ['ALT_GND'], 'AC', 0.8, wireFlows);
  }
  if (batteryCharging) {
    markConductiveWires(gClean.adj, ['ALT_WHITE'], ['REG_WHITE'], 'AC', 0.9, wireFlows);
    markConductiveWires(gClean.adj, ['REG_RED'], ['BAT_POS'], 'DC', 0.9, wireFlows);
    markConductiveWires(gClean.adj, ['BAT_NEG'], ['REG_GND'], 'DC', 0.9, wireFlows);
  }

  const loadVoltages: Record<string, number> = {};
  const corrodedLoads = new Set<string>();
  for (const ld of loadDefs.slice(0, 15)) {
    const { vDC, vAC, droppedByCorrosion } = evalTwoPin(ld.p1, ld.p2, ld.intact, true);
    loadVoltages[ld.id] = Math.max(vDC, vAC);
    if (droppedByCorrosion) corrodedLoads.add(ld.id);
  }

  const toBrightness = (v: number) => (v < 2.0 ? 0 : Math.min(1.6, v / 12.0));

  const overvoltageBlows = {
    headLo: loadVoltages.headLo > 17.5,
    headHi: loadVoltages.headHi > 17.5,
    senjaFront: loadVoltages.senjaFront > 17.5,
    tailSenja: loadVoltages.tailSenja > 17.5,
    cdiDamaged,
  };

  let testLampBrightness = 0;
  if (tools.activeTool === 'TEST_LAMP' && tools.testLampClipPin && tools.testLampTipPin) {
    const { vDC, vAC } = evalTwoPin(tools.testLampClipPin, tools.testLampTipPin, true, true);
    testLampBrightness = toBrightness(Math.max(vDC, vAC));
  }

  const multimeterReading = computeMultimeter(
    tools,
    dsuClean,
    dsuCorroded,
    gWithCorroded.adj,
    loadDefs,
    corrodedLoads,
    systemDCVoltage,
    kiprokRegRedVoltage,
    spulYellowAC,
    spulWhiteAC,
    spulCdiACVoltage,
    pulserACVoltage,
    cdiTriggered
  );

  const hornV = loadVoltages.horn;

  return {
    wireFlows,
    shortCircuit,
    overvoltageBlows,
    batteryCrankSag,
    relayEnergized,
    starterRelayEnergized,
    starterMotorSpinning,
    flasherClicking,
    flasherFastBlink,
    batteryCharging,
    batteryLevel: soc,
    batteryNetAmperes,
    systemDCVoltage,
    spulACVoltage: spulYellowAC,
    spulCdiACVoltage,
    pulserACVoltage,
    effectiveRpm,
    cdiPowered,
    cdiSideStandOk,
    cdiTriggered,
    sparkActive,
    neutralLampBrightness: toBrightness(loadVoltages.neutralLamp || 0),
    loads: {
      headLo: toBrightness(loadVoltages.headLo),
      headHi: toBrightness(loadVoltages.headHi),
      senjaFront: toBrightness(loadVoltages.senjaFront),
      turnFrontL: toBrightness(loadVoltages.turnFrontL),
      turnFrontR: toBrightness(loadVoltages.turnFrontR),
      turnRearL: toBrightness(loadVoltages.turnRearL),
      turnRearR: toBrightness(loadVoltages.turnRearR),
      indTurnL: toBrightness(loadVoltages.indTurnL),
      indTurnR: toBrightness(loadVoltages.indTurnR),
      indHighBeam: toBrightness(loadVoltages.indHighBeam),
      tailSenja: toBrightness(loadVoltages.tailSenja),
      tailStop: toBrightness(loadVoltages.tailStop),
      hornActive: hornV >= 7.5,
      hornIntensity: Math.min(1.2, hornV / 12.0),
    },
    multimeterReading,
    testLampBrightness,
  };
}

function computeMultimeter(
  tools: ToolState,
  dsuClean: DisjointSet,
  dsuCorroded: DisjointSet,
  adjWithCorroded: Map<PinId, Edge0[]>,
  loadDefs: ResistiveLoadDef[],
  corrodedLoads: Set<string>,
  systemDCV: number,
  kiprokDCV: number,
  yellowACV: number,
  whiteACV: number,
  spulCdiACV: number,
  pulserACV: number,
  cdiTriggered: boolean
): SimulationResult['multimeterReading'] {
  if (tools.activeTool !== 'MULTIMETER' || tools.multimeterMode === 'OFF') {
    return { display: '---', unit: '', buzzerBeep: false };
  }
  const red = tools.probeRedPin;
  const black = tools.probeBlackPin;
  if (!red || !black) {
    return {
      display: tools.multimeterMode === 'OHM' ? 'OL' : '0.00',
      unit: tools.multimeterMode === 'DCV' ? 'V DC' : tools.multimeterMode === 'ACV' ? 'V AC' : 'Ω',
      buzzerBeep: false,
    };
  }

  const getPinDCPotential = (pin: PinId): number | null => {
    // Check if this pin sits on the voltage-dropped side of an active corroded load!
    for (const ld of loadDefs) {
      if (!corrodedLoads.has(ld.id)) continue;
      if (dsuClean.same(pin, ld.p1) && dsuClean.same(ld.p2, 'BAT_NEG')) {
        return Number((systemDCV * 0.34).toFixed(2));
      }
      if (dsuClean.same(pin, ld.p2) && dsuClean.same(ld.p1, 'BAT_NEG')) {
        return Number((systemDCV * 0.34).toFixed(2));
      }
      // If corrosion is on the ground return wire of an active load, ground pin floats up to ~8.2V!
      if (dsuClean.same(pin, ld.p2) && dsuClean.same(ld.p1, 'BAT_POS')) {
        return Number((systemDCV * 0.66).toFixed(2));
      }
      if (dsuClean.same(pin, ld.p1) && dsuClean.same(ld.p2, 'BAT_POS')) {
        return Number((systemDCV * 0.66).toFixed(2));
      }
    }

    if (dsuClean.same(pin, 'BAT_NEG')) return 0;
    if (systemDCV > 0 && dsuClean.same(pin, 'BAT_POS')) return systemDCV;
    if (kiprokDCV > 0 && dsuClean.same(pin, 'REG_RED')) return kiprokDCV;

    // Unloaded weak pull-up/pull-down (including unloaded corroded wire!)
    if (dsuCorroded.same(pin, 'BAT_NEG')) return 0;
    if (systemDCV > 0 && dsuCorroded.same(pin, 'BAT_POS')) return systemDCV;

    for (const ld of loadDefs) {
      if (!ld.intact) continue;
      if (dsuCorroded.same(pin, ld.p1)) {
        if (dsuCorroded.same(ld.p2, 'BAT_NEG')) return 0;
        if (systemDCV > 0 && dsuCorroded.same(ld.p2, 'BAT_POS')) return systemDCV;
      } else if (dsuCorroded.same(pin, ld.p2)) {
        if (dsuCorroded.same(ld.p1, 'BAT_NEG')) return 0;
        if (systemDCV > 0 && dsuCorroded.same(ld.p1, 'BAT_POS')) return systemDCV;
      }
    }
    return null;
  };

  type AcSourceTag = 'GND' | 'Y' | 'W' | 'CDI_SPUL' | 'PULSER' | 'CDI_OUT' | null;
  const getPinACPotential = (pin: PinId): AcSourceTag => {
    if (dsuCorroded.same(pin, 'ALT_GND') || dsuCorroded.same(pin, 'CDI_GND')) return 'GND';
    if (cdiTriggered && dsuClean.same(pin, 'CDI_COIL')) return 'CDI_OUT';
    if (spulCdiACV > 0 && dsuCorroded.same(pin, 'SPUL_CDI_AC')) return 'CDI_SPUL';
    if (pulserACV > 0 && dsuCorroded.same(pin, 'PULSER_POS')) return 'PULSER';
    if (yellowACV > 0 && dsuCorroded.same(pin, 'ALT_YELLOW')) return 'Y';
    if (whiteACV > 0 && dsuCorroded.same(pin, 'ALT_WHITE')) return 'W';
    return null;
  };

  const vRed = getPinDCPotential(red);
  const vBlack = getPinDCPotential(black);
  const dcDiff = vRed !== null && vBlack !== null ? vRed - vBlack : 0;

  const acR = getPinACPotential(red);
  const acB = getPinACPotential(black);
  let acDiff = 0;
  const pairMatch = (tag: AcSourceTag) =>
    (acR === tag && acB === 'GND') || (acB === tag && acR === 'GND');

  if (pairMatch('Y')) acDiff = yellowACV;
  else if (pairMatch('W')) acDiff = whiteACV;
  else if (pairMatch('CDI_SPUL')) acDiff = spulCdiACV;
  else if (pairMatch('PULSER')) acDiff = pulserACV;
  else if (pairMatch('CDI_OUT')) acDiff = 165.0;

  if (tools.multimeterMode === 'DCV') {
    return {
      display: dcDiff.toFixed(2),
      unit: 'V DC',
      buzzerBeep: false,
    };
  }

  if (tools.multimeterMode === 'ACV') {
    return {
      display: acDiff >= 10 ? acDiff.toFixed(1) : acDiff.toFixed(2),
      unit: 'V AC',
      buzzerBeep: false,
    };
  }

  if (Math.abs(dcDiff) > 1.0 || acDiff > 1.0) {
    return {
      display: 'ERR!',
      unit: 'BERTEGANGAN',
      buzzerBeep: false,
      warning: 'Putuskan arus (Kunci Kontak OFF / Mesin OFF) sebelum mengukur Hambatan (Ω)!',
    };
  }

  // Dijkstra Ohm measurement (uses edge.ohms: 0.05 for healthy wire, 18.5 for CORRODED wire, Infinity for OPEN wire!)
  const dist = new Map<PinId, number>();
  for (const p of ALL_PINS) dist.set(p, Infinity);
  dist.set(red, 0);
  const visited = new Set<PinId>();

  while (visited.size < ALL_PINS.length) {
    let u: PinId | null = null;
    let best = Infinity;
    for (const p of ALL_PINS) {
      if (!visited.has(p) && dist.get(p)! < best) {
        best = dist.get(p)!;
        u = p;
      }
    }
    if (!u || best === Infinity) break;
    if (u === black) break;
    visited.add(u);

    for (const e of adjWithCorroded.get(u) || []) {
      const nd = best + e.ohms;
      if (nd < dist.get(e.to)!) dist.set(e.to, nd);
    }

    for (const ld of loadDefs) {
      if (!ld.intact) continue;
      if (ld.p1 === u) {
        const nd = best + ld.ohms;
        if (nd < dist.get(ld.p2)!) dist.set(ld.p2, nd);
      } else if (ld.p2 === u) {
        const nd = best + ld.ohms;
        if (nd < dist.get(ld.p1)!) dist.set(ld.p1, nd);
      }
    }
  }

  const totalOhms = dist.get(black)!;
  if (!Number.isFinite(totalOhms)) {
    return { display: 'OL', unit: 'Ω (Putus)', buzzerBeep: false };
  }
  const rounded = Math.max(0.1, Number(totalOhms.toFixed(1)));
  return {
    display: rounded.toFixed(1),
    unit: 'Ω',
    buzzerBeep: rounded < 5.5,
  };
}
