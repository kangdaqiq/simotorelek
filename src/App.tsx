import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChallengeHudBar } from './components/ChallengeHudBar';
import {
  ChallengeResultModal,
  LeaderboardModal,
} from './components/ChallengeModals';
import { EngineBoard } from './components/EngineBoard';
import {
  InstrumentJackCoords,
  InstrumentLeadsOverlay,
} from './components/InstrumentLeadsOverlay';
import { FaultModal, PresetModal } from './components/Modals';
import { ToolFloatingPanel } from './components/ToolFloatingPanel';
import { TrainerBoard } from './components/TrainerBoard';
import {
  Point,
  WireOverlay,
  WireRoutingStyle,
  WireVisibilityMode,
} from './components/WireOverlay';
import { CircuitPreset, dedupeWires, makeSlots } from './data/presets';
import {
  createCleanHealth,
  generateRandomUkkChallenge,
} from './data/randomUkkGenerator';
import { PIN_LABELS, WIRE_COLORS } from './data/wireStandards';
import { evaluateChallenge } from './engine/challengeEvaluator';
import { solveCircuit } from './engine/circuitSolver';
import {
  ChallengeDefinition,
  ChallengeEvaluation,
  ChallengeSessionStats,
  LeaderboardEntry,
  RandomUkkScope,
  ReplaceablePartId,
} from './types/challenge';
import {
  BikeSystemVariant,
  BoardModule,
  BrandStandard,
  ComponentHealth,
  ComponentSlots,
  ModularSlotKey,
  PinId,
  SwitchStates,
  ToolState,
  Wire,
  WireColorId,
} from './types/circuit';
import { workshopAudio } from './utils/audio';

const STORAGE_LEADERBOARD_KEY = 'elemotor_smk_leaderboard_v1';

const SLOT_PINS_TO_UNPLUG: Record<ModularSlotKey, PinId[]> = {
  spul: ['ALT_YELLOW', 'SPUL_CDI_AC'],
  kiprok: ['REG_YELLOW'],
  keySwitch: ['IGN_KILL', 'IGN_KILL_GND'],
  cdi: ['CDI_PWR', 'CDI_PULSER', 'CDI_COIL', 'CDI_KILL', 'CDI_SIDESTAND', 'CDI_GND'],
  safety: ['SIDE_SW_1', 'SIDE_SW_2', 'NEUTRAL_IND_POS', 'NEUTRAL_SW_OUT', 'NEUTRAL_GND'],
};

export function App() {
  const [boardModule, setBoardModule] = useState<BoardModule>('BODY');
  const [linkedMode, setLinkedMode] = useState<boolean>(true);
  const [brand, setBrand] = useState<BrandStandard>('HONDA');

  // Slots: shared when linkedMode is ON, independent when linkedMode is OFF
  const [linkedSlots, setLinkedSlots] = useState<ComponentSlots>(() => makeSlots('MATIC_DC'));
  const [bodySlots, setBodySlots] = useState<ComponentSlots>(() => makeSlots('BEBEK_AC'));
  const [engineSlots, setEngineSlots] = useState<ComponentSlots>(() => makeSlots('MATIC_DC'));

  const slots = linkedMode ? linkedSlots : boardModule === 'BODY' ? bodySlots : engineSlots;
  const setSlots = useCallback(
    (updater: React.SetStateAction<ComponentSlots>) => {
      if (linkedMode) {
        setLinkedSlots(updater);
      } else if (boardModule === 'BODY') {
        setBodySlots(updater);
      } else {
        setEngineSlots(updater);
      }
    },
    [linkedMode, boardModule]
  );

  // Wires: starts 100% empty & clean on initial load!
  const [linkedWires, setLinkedWires] = useState<Wire[]>([]);
  const [bodyWires, setBodyWires] = useState<Wire[]>([]);
  const [engineWires, setEngineWires] = useState<Wire[]>([]);

  const wires = linkedMode ? linkedWires : boardModule === 'BODY' ? bodyWires : engineWires;
  const setWires = useCallback(
    (updater: React.SetStateAction<Wire[]>) => {
      if (linkedMode) {
        setLinkedWires(updater);
      } else if (boardModule === 'BODY') {
        setBodyWires(updater);
      } else {
        setEngineWires(updater);
      }
    },
    [linkedMode, boardModule]
  );

  const [activeWireColor, setActiveWireColor] = useState<WireColorId>('red');
  const [pendingFromPin, setPendingFromPin] = useState<PinId | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [focusedPin, setFocusedPin] = useState<PinId | null>(null);
  const [pointerPos, setPointerPos] = useState<Point | null>(null);

  const [wireVisibility, setWireVisibility] = useState<WireVisibilityMode>('FULL');
  const [wireStyle, setWireStyle] = useState<WireRoutingStyle>('CURVED');
  const [compactGround, setCompactGround] = useState<boolean>(false);
  const [showCurrentFlow, setShowCurrentFlow] = useState(true);
  const [muted, setMuted] = useState(false);

  const cycleWireVisibility = useCallback(() => {
    setWireVisibility((prev) =>
      prev === 'FULL' ? 'GHOST' : prev === 'GHOST' ? 'HIDDEN' : 'FULL'
    );
  }, []);

  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [faultModalOpen, setFaultModalOpen] = useState(false);

  const [activeChallenge, setActiveChallenge] = useState<ChallengeDefinition | null>(null);
  const [challengeResultOpen, setChallengeResultOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState<ChallengeEvaluation | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; tone: 'ok' | 'warn' } | null>(null);

  const [challengeStats, setChallengeStats] = useState<ChallengeSessionStats>({
    startedAtMs: Date.now(),
    elapsedSec: 0,
    usedDiagnosticTool: false,
    blownFuseCount: 0,
    wastedPartsCount: 0,
    replacedPartsLog: [],
    hintUsed: false,
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_LEADERBOARD_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const showToast = useCallback((text: string, tone: 'ok' | 'warn') => {
    setToastMsg({ text, tone });
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 4000);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  // Initial state: Engine OFF, Key OFF, Switches OFF!
  const [switches, setSwitches] = useState<SwitchStates>({
    ignitionOn: false,
    lightMainPos: 'OFF',
    dimPos: 'LO',
    turnPos: 'OFF',
    hazardOn: false,
    hornPressed: false,
    brakeFrontPressed: false,
    brakeRearPressed: false,
    engineRunning: false,
    rpm: 1600,
    sideStandUp: true,
    neutralGearOn: true,
    starterPressed: false,
    kickStartActive: false,
  });

  const [health, setHealth] = useState<ComponentHealth>(() => createCleanHealth());

  const [tools, setTools] = useState<ToolState>({
    activeTool: 'WIRE',
    multimeterMode: 'DCV',
    probeRedPin: null,
    probeBlackPin: 'GND_1',
    probeTargetNext: 'RED',
    testLampClipPin: 'GND_1',
    testLampTipPin: null,
    testLampTargetNext: 'TIP',
    clampWireId: null,
    clampMode: 'DC',
  });

  const kickTimeoutRef = useRef<number | null>(null);
  const triggerKickStart = useCallback(() => {
    if (kickTimeoutRef.current) window.clearTimeout(kickTimeoutRef.current);
    setSwitches((s) => ({ ...s, kickStartActive: true }));
    kickTimeoutRef.current = window.setTimeout(() => {
      setSwitches((s) => ({ ...s, kickStartActive: false }));
    }, 1500);
  }, []);

  const [tickTimeMs, setTickTimeMs] = useState(() => performance.now());
  const needsActiveTick =
    switches.turnPos !== 'OFF' ||
    switches.hazardOn ||
    ((switches.starterPressed || switches.kickStartActive) && !switches.engineRunning);

  useEffect(() => {
    if (!needsActiveTick) return;
    // Smart TV optimization: 100ms interval (10 FPS) is ample for 360ms flasher blink
    // and eliminates 100% CPU lock on low-power TV/IFP ARM chipsets when idle!
    const id = window.setInterval(() => {
      setTickTimeMs(performance.now());
    }, 100);
    return () => window.clearInterval(id);
  }, [needsActiveTick]);

  useEffect(() => {
    if (!activeChallenge || challengeResultOpen) return;
    const timer = window.setInterval(() => {
      setChallengeStats((st) => ({
        ...st,
        elapsedSec: Math.floor((Date.now() - st.startedAtMs) / 1000),
      }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeChallenge, challengeResultOpen]);

  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const pinElsRef = useRef<Map<PinId, HTMLButtonElement>>(new Map());
  const [pinCoords, setPinCoords] = useState<Record<string, Point>>({});
  const [boardSize, setBoardSize] = useState<{ width: number; height: number }>({
    width: 1280,
    height: 720,
  });
  const [jackCoords, setJackCoords] = useState<InstrumentJackCoords>({
    redJack: null,
    blackJack: null,
    testClipOrigin: null,
    testTipOrigin: null,
  });

  const recomputePinCoords = useCallback(() => {
    const container = boardContainerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    setBoardSize({ width: cRect.width, height: cRect.height });
    const next: Record<string, Point> = {};
    for (const [pinId, el] of pinElsRef.current.entries()) {
      const r = el.getBoundingClientRect();
      next[pinId] = {
        x: r.left - cRect.left + r.width / 2,
        y: r.top - cRect.top + r.height / 2,
      };
    }
    setPinCoords(next);
  }, []);

  const registerPinEl = useCallback(
    (
      pinId: PinId,
      el: HTMLButtonElement | null,
      unmountedEl?: HTMLButtonElement | null
    ) => {
      if (el) {
        pinElsRef.current.set(pinId, el);
      } else if (!unmountedEl || pinElsRef.current.get(pinId) === unmountedEl) {
        pinElsRef.current.delete(pinId);
      }
    },
    []
  );

  useEffect(() => {
    recomputePinCoords();
    const ro = new ResizeObserver(() => recomputePinCoords());
    if (boardContainerRef.current) {
      ro.observe(boardContainerRef.current);
    }
    window.addEventListener('resize', recomputePinCoords);
    const t = window.setTimeout(recomputePinCoords, 70);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recomputePinCoords);
      window.clearTimeout(t);
    };
  }, [recomputePinCoords, activeChallenge, boardModule, slots, linkedMode]);

  // Toggle between 🔗 Mode Terhubung (1 Motor Utuh) and 📋 Mode Terpisah
  const handleToggleLinkedMode = (nextLinked: boolean) => {
    if (nextLinked === linkedMode) return;
    if (activeChallenge) {
      showToast('⚠️ Keluar dari Challenge terlebih dahulu untuk mengubah mode hubungan modul.', 'warn');
      return;
    }
    setPendingFromPin(null);
    setSelectedWireId(null);

    if (nextLinked) {
      // Merge existing separate wires cleanly into unified harness!
      const merged = dedupeWires([...engineWires, ...bodyWires]);
      setLinkedWires(merged);
      setLinkedSlots(boardModule === 'BODY' ? bodySlots : engineSlots);
      setLinkedMode(true);
      showToast(
        '🔗 Mode Terhubung Aktif: Modul 1 (Bodi) & Modul 2 (Mesin) menyatu sebagai 1 sepeda motor!',
        'ok'
      );
    } else {
      // Copy current unified state into separate buffers so nothing is lost
      setBodyWires(linkedWires);
      setEngineWires(linkedWires);
      setBodySlots(linkedSlots);
      setEngineSlots(linkedSlots);
      setLinkedMode(false);
      showToast(
        '📋 Mode Terpisah Aktif: Modul 1 & Modul 2 dapat dipraktikkan secara mandiri.',
        'ok'
      );
    }
  };

  // Swap individual modular component slot
  const handleToggleSlot = useCallback(
    (slotKey: ModularSlotKey) => {
      workshopAudio.playWrenchSwap();
      setPendingFromPin(null);
      setSelectedWireId(null);

      const nextVariant: BikeSystemVariant =
        slots[slotKey] === 'MATIC_DC' ? 'BEBEK_AC' : 'MATIC_DC';

      setSlots((prev) => ({ ...prev, [slotKey]: nextVariant }));

      const affectedPins = new Set<PinId>(SLOT_PINS_TO_UNPLUG[slotKey]);
      setWires((prev) => prev.filter((w) => !affectedPins.has(w.from) && !affectedPins.has(w.to)));

      const slotNames: Record<ModularSlotKey, string> = {
        spul: 'Modul Spul',
        kiprok: 'Modul Kiprok',
        keySwitch: 'Kunci Kontak',
        cdi: 'Unit CDI',
        safety: 'Modul Pengaman',
      };
      showToast(
        `🔄 ${slotNames[slotKey]} diganti ke tipe ${nextVariant === 'MATIC_DC' ? 'MATIC DC' : 'BEBEK AC'}`,
        'ok'
      );
      window.setTimeout(recomputePinCoords, 60);
    },
    [slots, setSlots, setWires, showToast, recomputePinCoords]
  );

  const applyFullSlotPackage = (variant: BikeSystemVariant) => {
    workshopAudio.playWrenchSwap();
    setPendingFromPin(null);
    setSelectedWireId(null);
    setSlots(makeSlots(variant));
    const allSwappablePins = new Set<PinId>(Object.values(SLOT_PINS_TO_UNPLUG).flat());
    setWires((prev) =>
      prev.filter((w) => !allSwappablePins.has(w.from) && !allSwappablePins.has(w.to))
    );
    showToast(
      `🔄 Seluruh slot modul diubah ke paket ${variant === 'MATIC_DC' ? 'MOTOR MATIC DC' : 'MOTOR BEBEK AC'}`,
      'ok'
    );
    window.setTimeout(recomputePinCoords, 60);
  };

  // Solve electrical circuit
  const sim = useMemo(
    () => solveCircuit(wires, switches, health, tools, slots, tickTimeMs),
    [wires, switches, health, tools, slots, tickTimeMs]
  );

  // Real Combustion Engine Physics:
  // Applies whenever on Modul 2 OR whenever 🔗 Mode Terhubung is active (even while viewing Modul 1!)
  const realIgnitionRequired = boardModule === 'ENGINE' || linkedMode;

  useEffect(() => {
    if (!realIgnitionRequired) return;

    if (
      !switches.engineRunning &&
      (sim.starterMotorSpinning || switches.kickStartActive) &&
      sim.sparkActive
    ) {
      const t = window.setTimeout(() => {
        setSwitches((s) => ({
          ...s,
          engineRunning: true,
          rpm: Math.max(1700, s.rpm),
          kickStartActive: false,
        }));
        showToast('🔥 Mesin berhasil menyala dari percikan Busi!', 'ok');
      }, 420);
      return () => window.clearTimeout(t);
    }

    if (switches.engineRunning && !sim.sparkActive) {
      setSwitches((s) => ({ ...s, engineRunning: false }));
      if (health.fuseBlown) {
        showToast('💥 Sekring 10A PUTUS — Suplai pengapian terputus, MESIN MOGOK MATI!', 'warn');
      } else if (slots.safety === 'MATIC_DC' && !switches.sideStandUp) {
        showToast('🛑 Standar Samping TURUN — CDI Matic memutus api, mesin MATI!', 'warn');
      } else if (!switches.ignitionOn) {
        showToast('🔒 Kunci Kontak OFF — Pengapian diputus, mesin MATI.', 'ok');
      } else {
        showToast('⚠️ Percikan api Busi hilang — Mesin otomatis mati!', 'warn');
      }
    }
  }, [
    realIgnitionRequired,
    health.fuseBlown,
    slots.safety,
    switches.engineRunning,
    switches.kickStartActive,
    switches.sideStandUp,
    switches.ignitionOn,
    sim.starterMotorSpinning,
    sim.sparkActive,
    showToast,
  ]);

  useEffect(() => {
    if (sim.shortCircuit.triggersFuseBlow && !health.fuseBlown) {
      workshopAudio.playShortSpark();
      setHealth((h) => ({ ...h, fuseBlown: true }));
      if (activeChallenge) {
        setChallengeStats((st) => ({ ...st, blownFuseCount: st.blownFuseCount + 1 }));
      }
    }
  }, [sim.shortCircuit.triggersFuseBlow, health.fuseBlown, activeChallenge]);

  useEffect(() => {
    const { headLo, headHi, senjaFront, tailSenja, cdiDamaged } = sim.overvoltageBlows;
    if (headLo || headHi || senjaFront || tailSenja || cdiDamaged) {
      workshopAudio.playShortSpark();
      setHealth((h) => ({
        ...h,
        headLoBlown: h.headLoBlown || headLo,
        headHiBlown: h.headHiBlown || headHi,
        senjaFrontBlown: h.senjaFrontBlown || senjaFront,
        tailSenjaBlown: h.tailSenjaBlown || tailSenja,
        faultCdiBroken: h.faultCdiBroken || cdiDamaged,
      }));
    }
  }, [sim.overvoltageBlows]);

  // Dynamic Battery State of Charge (SoC / Isi Aki) simulation loop
  useEffect(() => {
    const netAmps = sim.batteryNetAmperes;
    if (netAmps === 0) return;

    const timer = window.setInterval(() => {
      setHealth((prev) => {
        const curLevel = typeof prev.batteryLevel === 'number' ? prev.batteryLevel : 96;
        let delta = 0;

        if (netAmps > 0) {
          // Pengisian dinamis dari Kiprok/Spul: ~ +0.3% sampai +0.6% per detik sesuai RPM
          delta = (netAmps / 3.0) * 0.45;
        } else {
          // Pengurasan oleh beban listrik aktif
          if (netAmps <= -35) {
            // Dinamo starter cranking berat: -1.5% per detik
            delta = -1.5;
          } else {
            // Beban lampu/klakson/standby: responsif dan terukur untuk demo praktikum
            delta = (netAmps / 20.0) * 0.6;
          }
        }

        const nextLevel = Math.max(0, Math.min(100, Number((curLevel + delta).toFixed(2))));
        if (Math.abs(nextLevel - curLevel) < 0.01) return prev;
        return { ...prev, batteryLevel: nextLevel };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [sim.batteryNetAmperes]);

  const prevRelayRef = useRef(false);
  const prevStarterRelayRef = useRef(false);
  const prevTurnLitRef = useRef(false);
  const lastSparkAudioRef = useRef(0);

  useEffect(() => {
    workshopAudio.muted = muted;
    workshopAudio.setHorn(sim.loads.hornActive, sim.loads.hornIntensity);
    workshopAudio.setStarterCrank(sim.starterMotorSpinning);
    workshopAudio.setBuzzer(
      tools.activeTool === 'MULTIMETER' &&
        tools.multimeterMode === 'OHM' &&
        sim.multimeterReading.buzzerBeep
    );
    workshopAudio.setEngine(switches.engineRunning, switches.rpm);

    if (sim.relayEnergized !== prevRelayRef.current) {
      workshopAudio.playRelayClick();
      prevRelayRef.current = sim.relayEnergized;
    }
    if (sim.starterRelayEnergized !== prevStarterRelayRef.current) {
      workshopAudio.playRelayClick();
      prevStarterRelayRef.current = sim.starterRelayEnergized;
    }

    if (realIgnitionRequired && sim.sparkActive && !switches.engineRunning) {
      if (tickTimeMs - lastSparkAudioRef.current > 140) {
        workshopAudio.playSparkSnap();
        lastSparkAudioRef.current = tickTimeMs;
      }
    }

    const anyTurnNow =
      sim.flasherClicking &&
      (sim.loads.turnFrontL > 0.05 ||
        sim.loads.turnFrontR > 0.05 ||
        sim.loads.turnRearL > 0.05 ||
        sim.loads.turnRearR > 0.05 ||
        sim.testLampBrightness > 0.05);

    if (sim.flasherClicking && anyTurnNow !== prevTurnLitRef.current) {
      workshopAudio.playTick(anyTurnNow);
      prevTurnLitRef.current = anyTurnNow;
    } else if (!sim.flasherClicking) {
      prevTurnLitRef.current = false;
    }
  }, [
    sim,
    realIgnitionRequired,
    switches.engineRunning,
    switches.rpm,
    tools.activeTool,
    tools.multimeterMode,
    muted,
    tickTimeMs,
  ]);

  const switchModuleTab = (target: BoardModule) => {
    if (target === boardModule) return;
    if (activeChallenge && !activeChallenge.requiresLinkedMode) {
      setActiveChallenge(null);
      setShowCurrentFlow(true);
    }
    setPendingFromPin(null);
    setSelectedWireId(null);
    setBoardModule(target);
    if (!linkedMode && target === 'ENGINE') {
      setSwitches((s) => ({ ...s, engineRunning: false, sideStandUp: true, neutralGearOn: true }));
    }
  };

  const startChallenge = useCallback(
    (ch: ChallengeDefinition, targetBrand: BrandStandard = brand) => {
      const initial = ch.setup(targetBrand);
      const useLinked = Boolean(ch.requiresLinkedMode);
      setLinkedMode(useLinked);
      setBoardModule(ch.boardModule);
      setActiveChallenge(ch);
      if (useLinked) {
        setLinkedSlots(initial.slots);
        setLinkedWires(initial.wires);
      } else if (ch.boardModule === 'BODY') {
        setBodySlots(initial.slots);
        setBodyWires(initial.wires);
      } else {
        setEngineSlots(initial.slots);
        setEngineWires(initial.wires);
      }
      setSwitches(initial.switches);
      setHealth(initial.health);
      setPendingFromPin(null);
      setSelectedWireId(null);
      setWireVisibility('FULL');
      setShowCurrentFlow(!ch.hideCurrentFlowByDefault);
      setChallengeResultOpen(false);
      setLastEvaluation(null);
      setChallengeStats({
        startedAtMs: Date.now(),
        elapsedSec: 0,
        usedDiagnosticTool: false,
        blownFuseCount: 0,
        wastedPartsCount: 0,
        replacedPartsLog: [],
        hintUsed: false,
      });
      window.setTimeout(recomputePinCoords, 90);
    },
    [brand, recomputePinCoords]
  );

  const handleReplacePart = useCallback(
    (part: ReplaceablePartId) => {
      const penalizeWasted = (msg: string) => {
        workshopAudio.playWarningPenalty();
        if (activeChallenge) {
          setChallengeStats((st) => ({ ...st, wastedPartsCount: st.wastedPartsCount + 1 }));
        }
        showToast(msg, 'warn');
      };

      if (part === 'FUSE') {
        if (health.fuseBlown) {
          workshopAudio.playWrenchSwap();
          setHealth((h) => ({ ...h, fuseBlown: false }));
          showToast('✅ Sekring 10A baru berhasil dipasang!', 'ok');
        } else {
          penalizeWasted('⚠️ Sekring lama masih utuh! Tidak perlu diganti.');
        }
        return;
      }

      if (part === 'FLASHER') {
        if (health.faultFlasherBroken) {
          workshopAudio.playWrenchSwap();
          setHealth((h) => ({ ...h, faultFlasherBroken: false }));
          showToast('✅ Flasher Sein rusak berhasil diganti baru!', 'ok');
        } else {
          penalizeWasted('⚠️ Flasher lama masih normal! Ukur dulu sebelum ganti part.');
        }
        return;
      }

      if (part === 'REGULATOR') {
        if (health.faultRegulatorBroken) {
          workshopAudio.playWrenchSwap();
          setHealth((h) => ({ ...h, faultRegulatorBroken: false }));
          showToast('✅ Unit Kiprok (Regulator) jebol berhasil diganti baru!', 'ok');
        } else {
          penalizeWasted('⚠️ Kiprok lama ternyata masih bagus! Efisiensi servis berkurang.');
        }
        return;
      }

      if (part === 'HORN') {
        if (health.faultHornBroken) {
          workshopAudio.playWrenchSwap();
          setHealth((h) => ({ ...h, faultHornBroken: false }));
          showToast('✅ Unit Klakson putus berhasil diganti baru!', 'ok');
        } else {
          penalizeWasted('⚠️ Klakson lama masih sehat! Cek jalur kabel atau saklar dulu.');
        }
        return;
      }

      if (part === 'HEADLIGHT_UNIT') {
        const broken =
          health.headLoBlown ||
          health.headHiBlown ||
          health.senjaFrontBlown ||
          health.faultGroundHeadBroken;
        if (broken) {
          workshopAudio.playWrenchSwap();
          setHealth((h) => ({
            ...h,
            headLoBlown: false,
            headHiBlown: false,
            senjaFrontBlown: false,
            faultGroundHeadBroken: false,
          }));
          showToast('✅ Bohlam / Fitting Lampu Kepala berhasil diganti baru!', 'ok');
        } else {
          penalizeWasted('⚠️ Bohlam & fitting lampu depan masih bagus!');
        }
        return;
      }

      if (part === 'TAILLIGHT_UNIT') {
        const broken = health.tailSenjaBlown || health.tailStopBlown;
        if (broken) {
          workshopAudio.playWrenchSwap();
          setHealth((h) => ({ ...h, tailSenjaBlown: false, tailStopBlown: false }));
          showToast('✅ Bohlam Lampu Belakang berhasil diganti baru!', 'ok');
        } else {
          penalizeWasted('⚠️ Bohlam belakang masih bagus!');
        }
        return;
      }

      if (part === 'STARTER_RELAY') {
        if (health.faultStarterRelayBroken) {
          workshopAudio.playWrenchSwap();
          setHealth((h) => ({ ...h, faultStarterRelayBroken: false }));
          showToast('✅ Bendik / Relay Starter putus berhasil diganti baru!', 'ok');
        } else {
          penalizeWasted('⚠️ Bendik Starter lama masih sehat! Ukur koil 85-86 dengan Ohm dulu.');
        }
        return;
      }

      if (part === 'CDI_UNIT') {
        if (health.faultCdiBroken) {
          workshopAudio.playWrenchSwap();
          setHealth((h) => ({ ...h, faultCdiBroken: false }));
          showToast('✅ Unit CDI rusak berhasil diganti baru!', 'ok');
        } else {
          penalizeWasted('⚠️ Unit CDI lama masih sehat! Cek output CDI & Koil terlebih dahulu.');
        }
        return;
      }

      if (part === 'IGNITION_COIL') {
        if (health.faultCoilBroken) {
          workshopAudio.playWrenchSwap();
          setHealth((h) => ({ ...h, faultCoilBroken: false }));
          showToast('✅ Koil Pengapian putus berhasil diganti baru!', 'ok');
        } else {
          penalizeWasted('⚠️ Koil Pengapian lama masih bagus! Ukur Ohm primer koil dulu.');
        }
        return;
      }

      if (part === 'SPARK_PLUG') {
        if (health.faultSparkPlugFouled) {
          workshopAudio.playWrenchSwap();
          setHealth((h) => ({ ...h, faultSparkPlugFouled: false }));
          showToast('✅ Busi mati berhasil diganti dengan Busi baru!', 'ok');
        } else {
          penalizeWasted('⚠️ Busi lama masih bagus! Cek Koil, CDI, dan Pulser dulu.');
        }
        return;
      }

      if (part === 'BATTERY') {
        const isLow = (health.batteryLevel ?? 96) < 85;
        if (health.faultBatteryWeak || isLow) {
          workshopAudio.playWrenchSwap();
          setHealth((h) => ({ ...h, faultBatteryWeak: false, batteryLevel: 100 }));
          showToast(
            `⚡ Aki berhasil ${health.faultBatteryWeak ? 'diganti baru' : 'dicas penuh'} (100% / 12.8V Sehat)!`,
            'ok'
          );
        } else {
          penalizeWasted('⚠️ Kondisi Aki masih sangat prima (>85%)! Lakukan uji beban atau cek komponen lain.');
        }
        return;
      }

      if (part === 'SWITCH_RIGHT_CLEAN') {
        if (health.faultLightSwitchDirty || health.faultBrakeSwitchStuck) {
          workshopAudio.playWrenchSwap();
          setHealth((h) => ({
            ...h,
            faultLightSwitchDirty: false,
            faultBrakeSwitchStuck: false,
          }));
          showToast('🧴 Kontak Saklar Kanan & Switch Rem dibersihkan — kembali normal!', 'ok');
        } else {
          penalizeWasted('⚠️ Saklar Kanan & Switch Rem masih bersih normal!');
        }
        return;
      }

      if (part === 'SWITCH_LEFT_CLEAN') {
        if (health.faultTurnSwitchDirty || health.faultHornSwitchDirty) {
          workshopAudio.playWrenchSwap();
          setHealth((h) => ({
            ...h,
            faultTurnSwitchDirty: false,
            faultHornSwitchDirty: false,
          }));
          showToast('🧴 Kontak Saklar Sein & Klakson dibersihkan — kembali normal!', 'ok');
        } else {
          penalizeWasted('⚠️ Saklar Stang Kiri masih bersih normal!');
        }
        return;
      }

      if (part === 'SWITCH_STARTER_CLEAN') {
        if (health.faultStarterSwitchDirty || health.faultBrakeSwitchStuck) {
          workshopAudio.playWrenchSwap();
          setHealth((h) => ({
            ...h,
            faultStarterSwitchDirty: false,
            faultBrakeSwitchStuck: false,
          }));
          showToast('🧴 Kontak Tombol Starter & Switch Rem dibersihkan — kembali normal!', 'ok');
        } else {
          penalizeWasted('⚠️ Tombol Starter & Switch Rem masih bersih normal!');
        }
        return;
      }

      if (part === 'SWITCH_SIDESTAND_CLEAN') {
        if (health.faultSideStandSwitchDirty) {
          workshopAudio.playWrenchSwap();
          setHealth((h) => ({ ...h, faultSideStandSwitchDirty: false }));
          showToast('🧴 Switch Standar Samping dibersihkan dari kotoran — kembali normal!', 'ok');
        } else {
          penalizeWasted('⚠️ Switch Standar Samping masih bersih normal!');
        }
      }
    },
    [health, activeChallenge, showToast]
  );

  const handleRunBenchTest = useCallback(() => {
    if (!activeChallenge) return;
    const result = evaluateChallenge(activeChallenge, wires, health, slots, brand, challengeStats);
    setLastEvaluation(result);
    setChallengeResultOpen(true);

    if (result.passed) {
      workshopAudio.playSuccessFanfare();
    } else {
      workshopAudio.playWarningPenalty();
    }
  }, [activeChallenge, wires, health, slots, brand, challengeStats]);

  const handleSaveScore = useCallback(
    (studentName: string, className: string) => {
      if (!activeChallenge || !lastEvaluation || !lastEvaluation.passed) return;
      const entry: LeaderboardEntry = {
        id: `lb-${Date.now()}`,
        studentName,
        className,
        challengeId: activeChallenge.id,
        challengeTitle: activeChallenge.title,
        stars: lastEvaluation.stars as 1 | 2 | 3,
        score: lastEvaluation.score,
        elapsedSec: challengeStats.elapsedSec,
        brand,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setLeaderboard((prev) => {
        const next = [entry, ...prev];
        try {
          localStorage.setItem(STORAGE_LEADERBOARD_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [activeChallenge, lastEvaluation, challengeStats.elapsedSec, brand]
  );

  const connectPins = useCallback(
    (a: PinId, b: PinId) => {
      if (a === b) return;
      setWires((prev) => {
        const exists = prev.some(
          (w) => (w.from === a && w.to === b) || (w.from === b && w.to === a)
        );
        if (exists) return prev;
        return [
          ...prev,
          {
            id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            from: a,
            to: b,
            color: activeWireColor,
          },
        ];
      });
    },
    [activeWireColor, setWires]
  );

  const handleFocusPin = useCallback((pinId: PinId) => {
    setSelectedWireId(null);
    setFocusedPin((prev) => (prev === pinId ? null : pinId));
  }, []);

  const handleClampWire = useCallback(
    (wireId: string) => {
      setTools((t) => ({ ...t, clampWireId: t.clampWireId === wireId ? null : wireId }));
      if (activeChallenge) {
        setChallengeStats((st) => ({ ...st, usedDiagnosticTool: true }));
      }
    },
    [activeChallenge]
  );

  const handlePinTap = useCallback(
    (pinId: PinId, e: React.PointerEvent) => {
      setSelectedWireId(null);
      setFocusedPin(null);

      if (tools.activeTool === 'CLAMP_METER') {
        const found = [...wires].reverse().find((w) => w.from === pinId || w.to === pinId);
        if (found) {
          setTools((t) => ({ ...t, clampWireId: t.clampWireId === found.id ? null : found.id }));
          if (activeChallenge) {
            setChallengeStats((st) => ({ ...st, usedDiagnosticTool: true }));
          }
        }
        return;
      }

      if (tools.activeTool === 'MULTIMETER') {
        if (activeChallenge) {
          setChallengeStats((st) => ({ ...st, usedDiagnosticTool: true }));
        }
        setTools((t) => {
          // Keep the currently held probe active (just like holding the Red probe in hand while Black stays on Massa!),
          // only auto-switching from BLACK -> RED after placing the ground reference probe!
          if (t.probeTargetNext === 'BLACK') {
            return { ...t, probeBlackPin: pinId, probeTargetNext: 'RED' };
          }
          return {
            ...t,
            probeRedPin: pinId,
            probeBlackPin: t.probeBlackPin ?? 'GND_1',
          };
        });
        return;
      }

      if (tools.activeTool === 'TEST_LAMP') {
        if (activeChallenge) {
          setChallengeStats((st) => ({ ...st, usedDiagnosticTool: true }));
        }
        setTools((t) =>
          t.testLampTargetNext === 'CLIP'
            ? { ...t, testLampClipPin: pinId, testLampTargetNext: 'TIP' }
            : { ...t, testLampTipPin: pinId }
        );
        return;
      }

      if (tools.activeTool === 'DELETE_WIRE') {
        setWires((prev) => {
          const idx = [...prev].reverse().findIndex((w) => w.from === pinId || w.to === pinId);
          if (idx === -1) return prev;
          const realIdx = prev.length - 1 - idx;
          const removed = prev[realIdx];
          if (removed.fault === 'OPEN') {
            showToast('🔍 Ditemukan! Kabel yang dilepas tadi PUTUS DI DALAM ISOLASI — pasang kabel baru!', 'ok');
          } else if (removed.fault === 'SHORT_GND') {
            showToast('🔍 Ditemukan! Kabel yang dilepas tadi LECET KORSLET KE RANGKA — pasang kabel baru!', 'ok');
          } else if (removed.fault === 'CORRODED') {
            showToast('🔍 Ditemukan! Soket kabel yang dilepas tadi BERJAMUR KOROSI (~18Ω) — pasang kabel baru!', 'ok');
          }
          return prev.filter((_, i) => i !== realIdx);
        });
        return;
      }

      const container = boardContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        setPointerPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      setWireVisibility((v) => (v === 'HIDDEN' ? 'FULL' : v));

      if (!pendingFromPin) {
        setPendingFromPin(pinId);
      } else if (pendingFromPin === pinId) {
        setPendingFromPin(null);
      } else {
        connectPins(pendingFromPin, pinId);
        setPendingFromPin(null);
      }
    },
    [tools.activeTool, pendingFromPin, connectPins, activeChallenge, setWires]
  );

  const handleBoardPointerMove = (e: React.PointerEvent) => {
    if (!pendingFromPin || !boardContainerRef.current) return;
    const rect = boardContainerRef.current.getBoundingClientRect();
    setPointerPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleBoardPointerUp = (e: React.PointerEvent) => {
    if (!pendingFromPin || !boardContainerRef.current) return;
    const rect = boardContainerRef.current.getBoundingClientRect();
    const rx = e.clientX - rect.left;
    const ry = e.clientY - rect.top;

    let closestPin: PinId | null = null;
    let bestDist = 28;
    for (const [pid, pt] of Object.entries(pinCoords)) {
      const d = Math.hypot(pt.x - rx, pt.y - ry);
      if (d < bestDist) {
        bestDist = d;
        closestPin = pid as PinId;
      }
    }
    if (closestPin && closestPin !== pendingFromPin) {
      connectPins(pendingFromPin, closestPin);
      setPendingFromPin(null);
    }
  };

  const handleApplyPreset = (preset: CircuitPreset) => {
    setActiveChallenge(null);
    setShowCurrentFlow(true);
    setPendingFromPin(null);
    setSelectedWireId(null);
    setBoardModule(preset.boardModule);
    setHealth(createCleanHealth());
    const built = preset.buildWires(brand);
    if (preset.linkedFullBike) {
      setLinkedMode(true);
      setLinkedSlots(preset.slots);
      setLinkedWires(built);
      showToast('🔗 Rangkaian 1 Motor Utuh dimuat! Coba hidupkan mesin di Modul 2 lalu tes lampu di Modul 1.', 'ok');
    } else if (linkedMode) {
      // Keep separate or switch to separate when loading single-module preset so student isn't confused why engine won't run without CDI!
      setLinkedMode(false);
      if (preset.boardModule === 'BODY') {
        setBodySlots(preset.slots);
        setBodyWires(built);
      } else {
        setEngineSlots(preset.slots);
        setEngineWires(built);
      }
      showToast(`📋 Memuat ${preset.title} pada Mode Terpisah`, 'ok');
    } else {
      if (preset.boardModule === 'BODY') {
        setBodySlots(preset.slots);
        setBodyWires(built);
      } else {
        setEngineSlots(preset.slots);
        setEngineWires(built);
      }
    }
    setSwitches((s) => ({
      ...s,
      ignitionOn: true,
      sideStandUp: true,
      neutralGearOn: true,
      brakeFrontPressed: preset.boardModule === 'ENGINE' && preset.slots.safety === 'MATIC_DC',
      engineRunning: Boolean(preset.autoEngineOn),
      rpm: Math.max(2200, s.rpm),
    }));
    window.setTimeout(recomputePinCoords, 80);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const activeColorMeta = useMemo(
    () => WIRE_COLORS.find((c) => c.id === activeWireColor) || WIRE_COLORS[0],
    [activeWireColor]
  );

  const handleStartRandomUkk = useCallback(
    (scope: RandomUkkScope) => {
      const generated = generateRandomUkkChallenge(scope);
      startChallenge(generated);
      showToast(`🎲 ${generated.title} dimulai! Lacak masalahnya dengan AVO Meter / Tespen.`, 'ok');
    },
    [startChallenge, showToast]
  );

  const activeFaultCount = [
    health.faultFlasherBroken,
    health.faultRegulatorBroken,
    health.faultGroundHeadBroken,
    health.faultHornBroken,
    health.faultStarterRelayBroken,
    health.faultCdiBroken,
    health.faultCoilBroken,
    health.faultSparkPlugFouled,
    health.faultSpulCdiBroken,
    health.faultBatteryWeak,
    health.faultHornSwitchDirty,
    health.faultStarterSwitchDirty,
    health.faultLightSwitchDirty,
    health.faultTurnSwitchDirty,
    health.faultSideStandSwitchDirty,
    health.faultBrakeSwitchStuck,
  ].filter(Boolean).length;

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* ==================== TOP HEADER BAR (FIXED HEIGHT, NO-WRAP) ==================== */}
      <header className="h-13 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 z-40 whitespace-nowrap overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-amber-500/40 shadow shrink-0"
            title="SiElekMotor | Simulasi Kelistrikan & Elektronik Sepeda Motor"
          >
            <img
              src="/logo.png"
              alt="Logo SMK"
              className="w-7 h-7 object-contain shrink-0 drop-shadow"
            />
            <div className="leading-none">
              <div className="text-xs font-black tracking-wide bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                SiElekMotor
              </div>
              <div className="hidden xl:block text-[8.5px] font-semibold text-slate-400 mt-0.5 whitespace-nowrap">
                Simulasi Elektronik Sepeda Motor
              </div>
            </div>
          </div>

          {/* MODULE TAB SWITCHER (MODUL 1 vs MODUL 2) */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => switchModuleTab('BODY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer whitespace-nowrap ${
                boardModule === 'BODY'
                  ? 'bg-sky-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💡 Modul 1: Bodi
            </button>
            <button
              type="button"
              onClick={() => switchModuleTab('ENGINE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer whitespace-nowrap ${
                boardModule === 'ENGINE'
                  ? 'bg-purple-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚙️ Modul 2: Mesin
            </button>
          </div>

          {/* LINKED vs SEPARATE MODE TOGGLE */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              disabled={Boolean(activeChallenge)}
              onClick={() => handleToggleLinkedMode(true)}
              className={`px-2 py-1 rounded-lg text-[11px] font-black transition cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                linkedMode
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Modul 1 & Modul 2 saling terhubung sebagai 1 sepeda motor utuh"
            >
              🔗 Terhubung
            </button>
            <button
              type="button"
              disabled={Boolean(activeChallenge)}
              onClick={() => handleToggleLinkedMode(false)}
              className={`px-2 py-1 rounded-lg text-[11px] font-black transition cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                !linkedMode
                  ? 'bg-slate-700 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Modul 1 & Modul 2 berdiri sendiri untuk latihan dasar"
            >
              📋 Terpisah
            </button>
          </div>

          {/* QUICK PACKAGE SLOT SWITCHER (MATIC DC vs BEBEK AC) */}
          <div className="hidden 2xl:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => applyFullSlotPackage('MATIC_DC')}
              className={`px-2 py-1 rounded-lg text-[11px] font-black cursor-pointer transition whitespace-nowrap ${
                slots.spul === 'MATIC_DC' && slots.cdi === 'MATIC_DC'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🛵 Matic DC
            </button>
            <button
              type="button"
              onClick={() => applyFullSlotPackage('BEBEK_AC')}
              className={`px-2 py-1 rounded-lg text-[11px] font-black cursor-pointer transition whitespace-nowrap ${
                slots.spul === 'BEBEK_AC' && slots.cdi === 'BEBEK_AC'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏍️ Bebek AC
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              handleStartRandomUkk(
                linkedMode ? 'FULL_MOTOR' : boardModule === 'BODY' ? 'BODY' : 'ENGINE'
              )
            }
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer shadow whitespace-nowrap shrink-0"
            title="Acak 1 dari 40 Kasus Masalah UKK Baru untuk Siswa!"
          >
            🎲 UKK Acak
          </button>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            {(['HONDA', 'YAMAHA'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBrand(b)}
                className={`px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer whitespace-nowrap ${
                  brand === b
                    ? b === 'HONDA'
                      ? 'bg-red-600 text-white'
                      : 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          {!activeChallenge && (
            <>
              <button
                type="button"
                onClick={() => setPresetModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-black text-white shadow cursor-pointer whitespace-nowrap shrink-0"
              >
                📚 Job Sheet
              </button>

              <button
                type="button"
                onClick={() => setFaultModalOpen(true)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-black border cursor-pointer transition whitespace-nowrap shrink-0 ${
                  activeFaultCount > 0
                    ? 'bg-red-600 border-red-300 text-white animate-pulse'
                    : 'bg-slate-800 border-amber-500/50 text-amber-300 hover:bg-slate-700'
                }`}
              >
                🔧 Guru {activeFaultCount > 0 ? `(${activeFaultCount})` : ''}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setWireStyle((s) => (s === 'CURVED' ? 'TRUNKING' : 'CURVED'))}
            className={`px-2 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition whitespace-nowrap shrink-0 ${
              wireStyle === 'CURVED'
                ? 'bg-indigo-950 border-indigo-400 text-indigo-200'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="Pilih gaya jalur kabel: Jumper Menjuntai (Alami) vs Siku Parit"
          >
            {wireStyle === 'CURVED' ? '〰️ Menjuntai' : '📐 Siku'}
          </button>

          <button
            type="button"
            onClick={() => setCompactGround((v) => !v)}
            className={`px-2 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition whitespace-nowrap shrink-0 ${
              compactGround
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="Ringkas kabel Massa (GND) menjadi simbol sasis lokal agar tidak melintang jauh"
          >
            {compactGround ? '⏚ GND Ringkas' : '⏚ GND Penuh'}
          </button>

          <button
            type="button"
            onClick={() => setShowCurrentFlow((v) => !v)}
            disabled={Boolean(
              activeChallenge &&
                (activeChallenge.category === 'REPAIR' || activeChallenge.category === 'RANDOM_UKK')
            )}
            className={`px-2 py-1.5 rounded-xl text-xs font-bold border cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 ${
              showCurrentFlow
                ? 'bg-sky-950 border-sky-500 text-sky-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {showCurrentFlow ? '⚡ON' : '⚡OFF'}
          </button>

          <button
            type="button"
            onClick={cycleWireVisibility}
            className={`px-2 py-1.5 rounded-xl text-xs font-black border cursor-pointer transition whitespace-nowrap shrink-0 ${
              wireVisibility === 'FULL'
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : wireVisibility === 'GHOST'
                  ? 'bg-sky-400 border-white text-slate-950 shadow'
                  : 'bg-amber-400 border-white text-slate-950 shadow'
            }`}
            title="Ubah visibilitas kabel: Jelas (100%) -> Samar (25%) -> Sembunyi (0%)"
          >
            {wireVisibility === 'FULL'
              ? '👁️ Jelas'
              : wireVisibility === 'GHOST'
                ? '👻 Samar'
                : '🙈 Hide'}
          </button>

          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold cursor-pointer shrink-0"
          >
            {muted ? '🔇' : '🔊'}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold cursor-pointer shrink-0"
            title="Layar Penuh 70 Inci"
          >
            ⛶
          </button>
        </div>
      </header>

      {/* ==================== ACTIVE UKK SPK BAR ==================== */}
      {activeChallenge && (
        <ChallengeHudBar
          challenge={activeChallenge}
          stats={challengeStats}
          leaderboardCount={leaderboard.length}
          onShowHint={() => setChallengeStats((st) => ({ ...st, hintUsed: true }))}
          onResetChallenge={() => startChallenge(activeChallenge)}
          onRunBenchTest={handleRunBenchTest}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onExitChallenge={() => {
            setActiveChallenge(null);
            setShowCurrentFlow(true);
          }}
        />
      )}

      {/* ==================== MAIN INTERACTIVE TRAINER BOARD ==================== */}
      <main
        ref={boardContainerRef}
        onPointerMove={handleBoardPointerMove}
        onPointerUp={handleBoardPointerUp}
        onPointerDown={() => {
          setPendingFromPin(null);
          setSelectedWireId(null);
          setFocusedPin(null);
        }}
        className="trainer-workspace flex-1 relative p-2.5 overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        {/* Floating Center Status / Toast Pill (Does NOT push or resize Topbar!) */}
        {(toastMsg ||
          sim.shortCircuit.active ||
          pendingFromPin ||
          (wireVisibility !== 'FULL' && wires.length > 0)) && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-2.5 left-1/2 -translate-x-1/2 z-45 pointer-events-none flex justify-center max-w-[90vw]"
          >
            {toastMsg ? (
              <div
                className={`px-4 py-1.5 rounded-2xl text-xs font-black shadow-2xl border whitespace-nowrap ${
                  toastMsg.tone === 'ok'
                    ? 'bg-emerald-600/95 border-emerald-300 text-white'
                    : 'bg-amber-500/95 border-amber-200 text-slate-950'
                }`}
              >
                {toastMsg.text}
              </div>
            ) : sim.shortCircuit.active ? (
              <div className="px-4 py-1.5 rounded-2xl bg-red-600/95 border-2 border-red-200 text-white text-xs font-black animate-pulse shadow-2xl whitespace-nowrap">
                ⚡ {sim.shortCircuit.message}
              </div>
            ) : pendingFromPin ? (
              <div className="px-4 py-1.5 rounded-2xl bg-slate-950/95 border-2 border-amber-400 text-amber-300 text-xs font-bold shadow-2xl whitespace-nowrap">
                🔌 Dari <b>{PIN_LABELS[pendingFromPin]}</b> — Sentuh soket tujuan
              </div>
            ) : wireVisibility !== 'FULL' && wires.length > 0 ? (
              <button
                type="button"
                onClick={() => setWireVisibility('FULL')}
                className="pointer-events-auto px-4 py-1.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-2xl border border-white/60 cursor-pointer whitespace-nowrap"
              >
                {wireVisibility === 'GHOST'
                  ? `👻 Mode Kabel Samar (25%) — Klik untuk Jelas`
                  : `🙈 Mode Pengetesan: ${wires.length} Kabel Disembunyikan — Klik Tampilkan`}
              </button>
            ) : null}
          </div>
        )}
        {boardModule === 'BODY' ? (
          <TrainerBoard
            wires={wires}
            slots={slots}
            onToggleSlot={handleToggleSlot}
            switches={switches}
            setSwitches={setSwitches}
            health={health}
            sim={sim}
            tools={tools}
            pendingFromPin={pendingFromPin}
            focusedPin={focusedPin}
            challengeActive={Boolean(activeChallenge)}
            onReplacePart={handleReplacePart}
            onPinTap={handlePinTap}
            onFocusPin={handleFocusPin}
            registerPinEl={registerPinEl}
          />
        ) : (
          <EngineBoard
            wires={wires}
            slots={slots}
            onToggleSlot={handleToggleSlot}
            switches={switches}
            setSwitches={setSwitches}
            health={health}
            sim={sim}
            tools={tools}
            pendingFromPin={pendingFromPin}
            focusedPin={focusedPin}
            challengeActive={Boolean(activeChallenge)}
            onReplacePart={handleReplacePart}
            onTriggerKickStart={triggerKickStart}
            onPinTap={handlePinTap}
            onFocusPin={handleFocusPin}
            registerPinEl={registerPinEl}
          />
        )}

        <WireOverlay
          wires={wires}
          pinCoords={pinCoords}
          boardSize={boardSize}
          wireFlows={sim.wireFlows}
          selectedWireId={selectedWireId}
          focusedPin={focusedPin}
          onSelectWire={(id) => {
            setFocusedPin(null);
            setSelectedWireId(id);
          }}
          onDeleteWire={(id) => {
            setWires((prev) => {
              const removed = prev.find((w) => w.id === id);
              if (removed?.fault === 'OPEN') {
                showToast('🔍 Ditemukan! Kabel yang dilepas tadi PUTUS DI DALAM ISOLASI — pasang kabel baru!', 'ok');
              } else if (removed?.fault === 'SHORT_GND') {
                showToast('🔍 Ditemukan! Kabel yang dilepas tadi LECET KORSLET KE RANGKA — pasang kabel baru!', 'ok');
              } else if (removed?.fault === 'CORRODED') {
                showToast('🔍 Ditemukan! Soket kabel yang dilepas tadi BERJAMUR KOROSI (~18Ω) — pasang kabel baru!', 'ok');
              }
              return prev.filter((w) => w.id !== id);
            });
            setSelectedWireId(null);
          }}
          activeTool={tools.activeTool}
          pendingFromPin={pendingFromPin}
          pointerPos={pointerPos}
          activeWireColor={activeWireColor}
          wireVisibility={wireVisibility}
          wireStyle={wireStyle}
          compactGround={compactGround}
          showCurrentFlow={showCurrentFlow}
          clampWireId={tools.clampWireId}
          onClampWire={handleClampWire}
        />

        <InstrumentLeadsOverlay
          tools={tools}
          pinCoords={pinCoords}
          jackCoords={jackCoords}
          sim={sim}
        />

        <ToolFloatingPanel
          tools={tools}
          setTools={setTools}
          sim={sim}
          boardContainerRef={boardContainerRef}
          onUpdateJackCoords={setJackCoords}
        />
      </main>

      {/* ==================== BOTTOM DOCK ==================== */}
      <footer className="h-20 px-4 bg-slate-900 border-t-2 border-slate-800 flex items-center justify-between gap-3 shrink-0 z-40">
        <div className="flex items-center gap-3 bg-slate-950 px-3 py-2 rounded-2xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (realIgnitionRequired && !switches.engineRunning) {
                if (slots.safety === 'MATIC_DC' && !switches.sideStandUp) {
                  showToast('⚠️ Standar Samping Matic masih TURUN! Naikkan standar dulu.', 'warn');
                } else if (!sim.sparkActive && linkedMode && boardModule === 'BODY') {
                  showToast(
                    '🔗 [Mode Terhubung] Rakit & aktifkan Pengapian Busi di Modul 2 dulu, atau ubah ke 📋 Terpisah!',
                    'warn'
                  );
                }
                triggerKickStart();
                return;
              }
              setSwitches((s) => ({
                ...s,
                engineRunning: !s.engineRunning,
                rpm: !s.engineRunning ? Math.max(1600, s.rpm) : s.rpm,
              }));
            }}
            className={`px-3.5 py-2.5 rounded-xl font-black text-xs transition cursor-pointer shadow ${
              switches.engineRunning
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            {switches.engineRunning
              ? '🟢 MESIN HIDUP'
              : realIgnitionRequired
                ? '🦶 ENGKOL MESIN'
                : '⚪ HIDUPKAN MESIN'}
          </button>

          <div className="w-44">
            <div className="flex justify-between text-[11px] font-bold mb-1">
              <span className="text-slate-400">BUKAAN GAS</span>
              <span className="font-mono text-amber-300">{sim.effectiveRpm} RPM</span>
            </div>
            <input
              type="range"
              min={1400}
              max={8500}
              step={100}
              disabled={!switches.engineRunning}
              value={switches.rpm}
              onChange={(e) => setSwitches((s) => ({ ...s, rpm: Number(e.target.value) }))}
              className="w-full h-3 accent-amber-400 cursor-pointer disabled:opacity-40"
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center min-w-0 bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-extrabold text-slate-200 truncate">
              🎨 Warna Kabel:{' '}
              <b className="text-amber-300">
                {activeColorMeta.name} ({activeColorMeta.code})
              </b>
              {' — '}
              <span className="text-sky-300 font-semibold">
                Standar {brand}:{' '}
                {brand === 'HONDA' ? activeColorMeta.usageHonda : activeColorMeta.usageYamaha}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {WIRE_COLORS.map((c) => {
              const selected = activeWireColor === c.id && tools.activeTool === 'WIRE';
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveWireColor(c.id);
                    setTools((t) => ({ ...t, activeTool: 'WIRE' }));
                  }}
                  title={`${c.name} (${c.code})`}
                  className={`w-7 h-7 rounded-lg shrink-0 border-2 transition cursor-pointer relative overflow-hidden ${
                    selected
                      ? 'border-white scale-110 ring-2 ring-amber-400'
                      : 'border-slate-700 opacity-85 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.primaryHex }}
                >
                  {c.stripeHex && (
                    <span
                      className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-2"
                      style={{ backgroundColor: c.stripeHex }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setTools((t) => ({ ...t, activeTool: 'WIRE' }))}
            className={`px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
              tools.activeTool === 'WIRE'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🔌 Pasang
          </button>

          <button
            type="button"
            onClick={() => {
              setPendingFromPin(null);
              setTools((t) => ({
                ...t,
                activeTool: t.activeTool === 'DELETE_WIRE' ? 'WIRE' : 'DELETE_WIRE',
              }));
            }}
            className={`px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
              tools.activeTool === 'DELETE_WIRE'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ✂️ Potong
          </button>

          <button
            type="button"
            onClick={() => {
              setPendingFromPin(null);
              setTools((t) => ({
                ...t,
                activeTool: t.activeTool === 'TEST_LAMP' ? 'WIRE' : 'TEST_LAMP',
              }));
            }}
            className={`px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
              tools.activeTool === 'TEST_LAMP'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-500/40'
            }`}
          >
            💡 Tespen
          </button>

          <button
            type="button"
            onClick={() => {
              setPendingFromPin(null);
              setTools((t) => ({
                ...t,
                activeTool: t.activeTool === 'MULTIMETER' ? 'WIRE' : 'MULTIMETER',
              }));
            }}
            className={`px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
              tools.activeTool === 'MULTIMETER'
                ? 'bg-yellow-400 text-slate-950 shadow'
                : 'bg-slate-800 text-yellow-300 hover:bg-slate-700 border border-yellow-500/40'
            }`}
          >
            📟 AVO Meter
          </button>

          <button
            type="button"
            onClick={() => {
              setPendingFromPin(null);
              setTools((t) => ({
                ...t,
                activeTool: t.activeTool === 'CLAMP_METER' ? 'WIRE' : 'CLAMP_METER',
              }));
            }}
            className={`px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
              tools.activeTool === 'CLAMP_METER'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-500/40'
            }`}
          >
            🧲 Tang Ampere
          </button>

          <button
            type="button"
            onClick={cycleWireVisibility}
            className={`px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer border ${
              wireVisibility === 'HIDDEN'
                ? 'bg-amber-400 border-white text-slate-950 shadow'
                : wireVisibility === 'GHOST'
                  ? 'bg-sky-400 border-white text-slate-950 shadow'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
            title="Klik bertahap: Jelas (100%) -> Samar (25%) -> Sembunyi (0%)"
          >
            {wireVisibility === 'FULL'
              ? '👁️ Kabel: Jelas'
              : wireVisibility === 'GHOST'
                ? '👻 Kabel: Samar'
                : '🙈 Kabel: Hide'}
          </button>

          <button
            type="button"
            onClick={() => setWires((prev) => prev.slice(0, -1))}
            disabled={wires.length === 0}
            className="px-2.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 text-xs font-bold cursor-pointer"
            title="Batalkan Kabel Terakhir (Undo)"
          >
            ↩️
          </button>

          {!activeChallenge && (
            <button
              type="button"
              onClick={() => {
                setPendingFromPin(null);
                setSelectedWireId(null);
                setWires([]);
              }}
              className="px-2.5 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-300 border border-rose-800/60 text-xs font-extrabold cursor-pointer"
              title="Cabut Semua Kabel"
            >
              🧹
            </button>
          )}
        </div>
      </footer>

      <PresetModal
        open={presetModalOpen}
        onClose={() => setPresetModalOpen(false)}
        brand={brand}
        activeModule={boardModule}
        linkedMode={linkedMode}
        onApplyPreset={handleApplyPreset}
        onClearAll={() => {
          setActiveChallenge(null);
          setPendingFromPin(null);
          setSelectedWireId(null);
          setWires([]);
        }}
      />

      <FaultModal
        open={faultModalOpen}
        onClose={() => setFaultModalOpen(false)}
        activeModule={boardModule}
        health={health}
        setHealth={setHealth}
      />

      <ChallengeResultModal
        open={challengeResultOpen}
        onClose={() => setChallengeResultOpen(false)}
        challenge={activeChallenge}
        evaluation={lastEvaluation}
        stats={challengeStats}
        brand={brand}
        onSaveScore={handleSaveScore}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
        onRollNextRandomUkk={handleStartRandomUkk}
        onExitToFreeMode={() => {
          setChallengeResultOpen(false);
          setActiveChallenge(null);
          setShowCurrentFlow(true);
        }}
      />

      <LeaderboardModal
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        entries={leaderboard}
        onClearLeaderboard={() => {
          setLeaderboard([]);
          try {
            localStorage.removeItem(STORAGE_LEADERBOARD_KEY);
          } catch {
            // ignore
          }
        }}
      />
    </div>
  );
}
export default App;
