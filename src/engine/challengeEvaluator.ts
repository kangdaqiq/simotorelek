import { solveCircuit } from './circuitSolver';
import {
  ChallengeCheckItem,
  ChallengeDefinition,
  ChallengeEvaluation,
  ChallengeSessionStats,
} from '../types/challenge';
import {
  BrandStandard,
  ComponentHealth,
  ComponentSlots,
  PinId,
  SwitchStates,
  ToolState,
  Wire,
  WireColorId,
} from '../types/circuit';

const neutralTools: ToolState = {
  activeTool: 'WIRE',
  multimeterMode: 'OFF',
  probeRedPin: null,
  probeBlackPin: null,
  probeTargetNext: 'RED',
  testLampClipPin: null,
  testLampTipPin: null,
  testLampTargetNext: 'TIP',
};

const baseSw: SwitchStates = {
  ignitionOn: false,
  lightMainPos: 'OFF',
  dimPos: 'LO',
  turnPos: 'OFF',
  hazardOn: false,
  hornPressed: false,
  brakeFrontPressed: false,
  brakeRearPressed: false,
  engineRunning: false,
  rpm: 0,
  sideStandUp: true,
  neutralGearOn: true,
  starterPressed: false,
  kickStartActive: false,
};

function hasWireColorOnPin(wires: Wire[], pin: PinId, expected: WireColorId[]): boolean {
  const connected = wires.filter((w) => w.from === pin || w.to === pin);
  if (connected.length === 0) return false;
  return connected.every((w) => expected.includes(w.color));
}

export function evaluateChallenge(
  challenge: ChallengeDefinition,
  wires: Wire[],
  currentHealth: ComponentHealth,
  currentSlots: ComponentSlots,
  brand: BrandStandard,
  stats: ChallengeSessionStats
): ChallengeEvaluation {
  const checks: ChallengeCheckItem[] = [];

  const runSim = (swPatch: Partial<SwitchStates>, healthPatch?: Partial<ComponentHealth>, t = 100) =>
    solveCircuit(
      wires,
      { ...baseSw, ...swPatch },
      { ...currentHealth, ...healthPatch },
      neutralTools,
      currentSlots,
      t
    );

  let usesFuseProtection = true;
  let wireStandardOk = true;
  const gndColor: WireColorId = brand === 'HONDA' ? 'green' : 'black';
  const ignColor: WireColorId = brand === 'HONDA' ? 'black' : 'brown';

  if (challenge.id === 'W1') {
    const sOff = runSim({ ignitionOn: false, hornPressed: true, brakeFrontPressed: true });
    checks.push({
      label: 'Saat Kunci Kontak OFF, Klakson & Lampu Rem tidak bocor menyala',
      passed: !sOff.loads.hornActive && sOff.loads.tailStop === 0 && !sOff.shortCircuit.active,
    });

    const sIdle = runSim({ ignitionOn: true });
    checks.push({
      label: 'Saat Kunci Kontak ON (saklar belum ditekan), tidak korslet & beban diam',
      passed: !sIdle.shortCircuit.active && !sIdle.loads.hornActive && sIdle.loads.tailStop === 0,
    });

    const sHorn = runSim({ ignitionOn: true, hornPressed: true });
    checks.push({
      label: 'Tombol Klakson ditekan -> Klakson berbunyi nyaring',
      passed: sHorn.loads.hornActive && !sHorn.shortCircuit.active,
    });

    const sBrkF = runSim({ ignitionOn: true, brakeFrontPressed: true });
    const sBrkR = runSim({ ignitionOn: true, brakeRearPressed: true });
    checks.push({
      label: 'Switch Rem Depan maupun Belakang menyalakan Lampu Rem',
      passed:
        sBrkF.loads.tailStop >= 0.8 &&
        sBrkR.loads.tailStop >= 0.8 &&
        !sBrkF.shortCircuit.active &&
        !sBrkR.shortCircuit.active,
    });

    const sNoFuse = runSim(
      { ignitionOn: true, hornPressed: true, brakeFrontPressed: true },
      { fuseBlown: true }
    );
    usesFuseProtection = !sNoFuse.loads.hornActive && sNoFuse.loads.tailStop === 0;

    wireStandardOk =
      hasWireColorOnPin(wires, 'BAT_POS', ['red']) &&
      hasWireColorOnPin(wires, 'BAT_NEG', [gndColor]) &&
      hasWireColorOnPin(wires, 'IGN_OUT', [ignColor]);
  } else if (challenge.id === 'W2' || challenge.id === 'R1') {
    const sOff = runSim({ ignitionOn: false, turnPos: 'L' }, undefined, 100);
    checks.push({
      label: 'Saat Kunci Kontak OFF, seluruh lampu sein mati',
      passed: sOff.loads.turnFrontL === 0 && sOff.loads.turnFrontR === 0 && !sOff.shortCircuit.active,
    });

    const sLeftOn = runSim({ ignitionOn: true, turnPos: 'L' }, undefined, 100);
    const sLeftOffPhase = runSim({ ignitionOn: true, turnPos: 'L' }, undefined, 460);
    checks.push({
      label: 'Sein Kiri (Depan, Belakang, Indikator L) berkedip normal & serempak',
      passed:
        sLeftOn.loads.turnFrontL >= 0.8 &&
        sLeftOn.loads.turnRearL >= 0.8 &&
        sLeftOn.loads.indTurnL >= 0.8 &&
        sLeftOn.loads.turnFrontR === 0 &&
        !sLeftOn.flasherFastBlink &&
        sLeftOffPhase.loads.turnFrontL === 0,
    });

    const sRightOn = runSim({ ignitionOn: true, turnPos: 'R' }, undefined, 100);
    const sRightOffPhase = runSim({ ignitionOn: true, turnPos: 'R' }, undefined, 460);
    checks.push({
      label: 'Sein Kanan (Depan, Belakang, Indikator R) berkedip normal & serempak',
      passed:
        sRightOn.loads.turnFrontR >= 0.8 &&
        sRightOn.loads.turnRearR >= 0.8 &&
        sRightOn.loads.indTurnR >= 0.8 &&
        sRightOn.loads.turnFrontL === 0 &&
        !sRightOn.flasherFastBlink &&
        sRightOffPhase.loads.turnFrontR === 0,
    });

    const sNoFuse = runSim({ ignitionOn: true, turnPos: 'L' }, { fuseBlown: true }, 100);
    usesFuseProtection = sNoFuse.loads.turnFrontL === 0;

    const leftC: WireColorId = brand === 'HONDA' ? 'orange' : 'dark_brown';
    const rightC: WireColorId = brand === 'HONDA' ? 'light_blue' : 'dark_green';
    wireStandardOk =
      hasWireColorOnPin(wires, 'SWL_TURN_L', [leftC]) &&
      hasWireColorOnPin(wires, 'SWL_TURN_R', [rightC]);
  } else if (challenge.id === 'W3' || challenge.id === 'R3') {
    checks.push({
      label: 'Slot Spul & Kiprok menggunakan tipe BEBEK AC (4-Pin Kuning)',
      passed: currentSlots.spul === 'BEBEK_AC' && currentSlots.kiprok === 'BEBEK_AC',
    });

    const sEngOff = runSim({ engineRunning: false, rpm: 0, lightMainPos: 'HEAD', dimPos: 'LO' });
    checks.push({
      label: 'Saat mesin mati (0 RPM), Lampu Kepala AC mati (murni sumber Spul)',
      passed: sEngOff.loads.headLo === 0 && sEngOff.loads.headHi === 0,
    });

    const sLo = runSim({ engineRunning: true, rpm: 2800, lightMainPos: 'HEAD', dimPos: 'LO' });
    const sHi = runSim({ engineRunning: true, rpm: 2800, lightMainPos: 'HEAD', dimPos: 'HI' });
    checks.push({
      label: 'Saklar SENJA, Dekat (LO), & Jauh (HI + Indikator Biru) berfungsi normal',
      passed:
        sLo.loads.senjaFront >= 0.7 &&
        sLo.loads.tailSenja >= 0.7 &&
        sLo.loads.headLo >= 0.8 &&
        sHi.loads.headHi >= 0.8 &&
        sHi.loads.indHighBeam >= 0.8,
    });

    const sHighRpm = runSim({ engineRunning: true, rpm: 7800, lightMainPos: 'HEAD', dimPos: 'LO' });
    checks.push({
      label: 'Uji Geber 7800 RPM: Kiprok menahan voltase aman (bohlam utuh) & Aki mengisi',
      passed:
        !sHighRpm.overvoltageBlows.headLo &&
        !sHighRpm.overvoltageBlows.headHi &&
        sHighRpm.loads.headLo >= 0.9 &&
        sHighRpm.batteryCharging &&
        !sHighRpm.shortCircuit.active,
    });

    const sNoFuse = runSim({ engineRunning: true, rpm: 4000 }, { fuseBlown: true });
    usesFuseProtection = !sNoFuse.batteryCharging;

    wireStandardOk =
      hasWireColorOnPin(wires, 'ALT_YELLOW', ['yellow']) &&
      hasWireColorOnPin(wires, 'ALT_WHITE', ['white']);
  } else if (challenge.id === 'W4' || challenge.id === 'R5') {
    const sKeyOff = runSim({
      ignitionOn: false,
      sideStandUp: true,
      brakeFrontPressed: true,
      starterPressed: true,
    });
    checks.push({
      label: 'Saat Kunci Kontak OFF, Dinamo Starter tidak berputar',
      passed: !sKeyOff.starterMotorSpinning && !sKeyOff.shortCircuit.active,
    });

    const sStandDown = runSim({
      ignitionOn: true,
      sideStandUp: false,
      brakeFrontPressed: true,
      starterPressed: true,
    });
    checks.push({
      label: 'Pengaman Standar Samping Matic: Saat standar TURUN, starter terkunci mati',
      passed: !sStandDown.starterMotorSpinning && !sStandDown.shortCircuit.active,
    });

    const sNoBrake = runSim({
      ignitionOn: true,
      sideStandUp: true,
      brakeFrontPressed: false,
      brakeRearPressed: false,
      starterPressed: true,
    });
    checks.push({
      label: 'Pengaman Rem Matic: Saat tuas rem TIDAK ditarik, starter terkunci mati',
      passed: !sNoBrake.starterMotorSpinning && !sNoBrake.shortCircuit.active,
    });

    const sStartGo = runSim({
      ignitionOn: true,
      sideStandUp: true,
      brakeFrontPressed: true,
      starterPressed: true,
    });
    checks.push({
      label: 'Kontak ON + Standar NAIK + Rem Ditarik + Start -> Bendik klik & Dinamo berputar!',
      passed:
        sStartGo.starterRelayEnergized &&
        sStartGo.starterMotorSpinning &&
        !sStartGo.shortCircuit.active,
    });

    const sNoFuse = runSim(
      {
        ignitionOn: true,
        sideStandUp: true,
        brakeFrontPressed: true,
        starterPressed: true,
      },
      { fuseBlown: true }
    );
    usesFuseProtection = !sNoFuse.starterMotorSpinning;

    wireStandardOk =
      hasWireColorOnPin(wires, 'ST_RLY_30', ['red']) &&
      hasWireColorOnPin(wires, 'ST_MOT_POS', ['red']);
  } else if (challenge.id === 'W5' || challenge.id === 'R6') {
    checks.push({
      label: 'Modul CDI & Pengaman menggunakan tipe MATIC DC (Pin SW Standar)',
      passed: currentSlots.cdi === 'MATIC_DC' && currentSlots.safety === 'MATIC_DC',
    });

    const sKeyOffKick = runSim({
      ignitionOn: false,
      sideStandUp: true,
      kickStartActive: true,
    });
    checks.push({
      label: 'Saat Kunci Kontak OFF, Busi tidak memercikkan api (mesin mati)',
      passed: !sKeyOffKick.sparkActive && !sKeyOffKick.shortCircuit.active,
    });

    const sSideStandDown = runSim({
      ignitionOn: true,
      sideStandUp: false,
      engineRunning: true,
      rpm: 2000,
    });
    checks.push({
      label: 'Pengaman Matic: Saat Standar Samping TURUN, api Busi otomatis terputus!',
      passed: !sSideStandDown.sparkActive && !sSideStandDown.shortCircuit.active,
    });

    const sCrankStart = runSim({
      ignitionOn: true,
      sideStandUp: true,
      brakeFrontPressed: true,
      starterPressed: true,
    });
    checks.push({
      label: 'Standar NAIK + Rem + Start -> Dinamo berputar & Busi memercikkan api biru!',
      passed:
        sCrankStart.starterMotorSpinning &&
        sCrankStart.cdiTriggered &&
        sCrankStart.sparkActive &&
        !sCrankStart.shortCircuit.active,
    });

    const sNoFuse = runSim(
      { ignitionOn: true, sideStandUp: true, kickStartActive: true },
      { fuseBlown: true }
    );
    usesFuseProtection = !sNoFuse.sparkActive;

    const coilC: WireColorId = brand === 'HONDA' ? 'black_yellow' : 'orange';
    wireStandardOk =
      hasWireColorOnPin(wires, 'PULSER_POS', ['blue_yellow', 'white']) &&
      hasWireColorOnPin(wires, 'COIL_POS', [coilC, 'black_yellow', 'orange']);
  } else if (challenge.id === 'R2') {
    checks.push({
      label: 'Sekring 10A dalam kondisi utuh (sudah diganti setelah perbaikan)',
      passed: !currentHealth.fuseBlown,
    });

    const sSenja = runSim({ ignitionOn: true, lightMainPos: 'SENJA' });
    const sLo = runSim({ ignitionOn: true, lightMainPos: 'HEAD', dimPos: 'LO' });
    const sHi = runSim({ ignitionOn: true, lightMainPos: 'HEAD', dimPos: 'HI' });

    checks.push({
      label: 'Tidak terjadi korsleting lagi saat Saklar digeser ke SENJA & UTAMA',
      passed:
        !sSenja.shortCircuit.active && !sLo.shortCircuit.active && !sHi.shortCircuit.active,
    });

    checks.push({
      label: 'Lampu Senja Depan, Kota Belakang, Dekat (LO), & Jauh (HI) menyala sempurna',
      passed:
        sSenja.loads.senjaFront >= 0.8 &&
        sSenja.loads.tailSenja >= 0.8 &&
        sLo.loads.headLo >= 0.8 &&
        sHi.loads.headHi >= 0.8,
    });

    const sNoFuse = runSim({ ignitionOn: true, lightMainPos: 'HEAD' }, { fuseBlown: true });
    usesFuseProtection = sNoFuse.loads.headLo === 0;
  } else if (challenge.id === 'R4') {
    const sTurnL = runSim({ ignitionOn: true, turnPos: 'L' }, undefined, 100);
    const sTurnLOff = runSim({ ignitionOn: true, turnPos: 'L' }, undefined, 460);
    const sTurnR = runSim({ ignitionOn: true, turnPos: 'R' }, undefined, 100);
    checks.push({
      label: 'Lampu Sein Kiri & Kanan kembali berkedip normal',
      passed:
        sTurnL.loads.turnFrontL >= 0.8 &&
        sTurnL.loads.turnRearL >= 0.8 &&
        sTurnLOff.loads.turnFrontL === 0 &&
        sTurnR.loads.turnFrontR >= 0.8 &&
        sTurnR.loads.turnRearR >= 0.8,
    });

    const sHorn = runSim({ ignitionOn: true, hornPressed: true });
    const sBrake = runSim({ ignitionOn: true, brakeFrontPressed: true });
    checks.push({
      label: 'Klakson berbunyi nyaring & Lampu Rem tetap bekerja normal',
      passed: sHorn.loads.hornActive && !sHorn.shortCircuit.active && sBrake.loads.tailStop >= 0.8,
    });

    const sNoFuse = runSim({ ignitionOn: true, hornPressed: true }, { fuseBlown: true });
    usesFuseProtection = !sNoFuse.loads.hornActive;
  } else if (challenge.id === 'M1') {
    const sKeyOff = runSim({
      ignitionOn: false,
      engineRunning: false,
      lightMainPos: 'HEAD',
      dimPos: 'LO',
    });
    checks.push({
      label: 'Saat Kunci Kontak OFF, Lampu & Relay mati total (tidak menguras Aki)',
      passed:
        sKeyOff.loads.headLo === 0 &&
        sKeyOff.loads.senjaFront === 0 &&
        !sKeyOff.relayEnergized,
    });

    const sDcLo = runSim({
      ignitionOn: true,
      engineRunning: false,
      rpm: 0,
      lightMainPos: 'HEAD',
      dimPos: 'LO',
    });
    const sDcHi = runSim({
      ignitionOn: true,
      engineRunning: false,
      rpm: 0,
      lightMainPos: 'HEAD',
      dimPos: 'HI',
    });
    checks.push({
      label: 'Mesin MATI + Kontak ON: Lampu Dekat, Jauh & Senja menyala terang stabil (Full DC)',
      passed:
        sDcLo.loads.headLo >= 0.95 &&
        sDcLo.loads.senjaFront >= 0.95 &&
        sDcLo.loads.tailSenja >= 0.95 &&
        sDcHi.loads.headHi >= 0.95 &&
        sDcHi.loads.indHighBeam >= 0.95,
    });

    const sRelayOff = runSim({ ignitionOn: true, lightMainPos: 'OFF' });
    checks.push({
      label: 'Relay 4 Kaki bekerja aktif menguatkan beban saat Saklar UTAMA dinyalakan',
      passed: sDcLo.relayEnergized && !sRelayOff.relayEnergized,
    });

    const sAcIsolation = runSim({
      ignitionOn: false,
      engineRunning: true,
      rpm: 6000,
      lightMainPos: 'HEAD',
      dimPos: 'LO',
    });
    const sCharging = runSim({
      ignitionOn: true,
      engineRunning: true,
      rpm: 5000,
      lightMainPos: 'HEAD',
      dimPos: 'LO',
    });
    checks.push({
      label: 'Jalur AC Spul Kuning sudah dipisah aman & Pengisian Aki (Kiprok) tetap aktif',
      passed:
        sAcIsolation.loads.headLo === 0 &&
        sCharging.batteryCharging &&
        !sCharging.shortCircuit.active &&
        !sCharging.overvoltageBlows.headLo,
    });

    const sNoFuse = runSim(
      { ignitionOn: true, engineRunning: false, lightMainPos: 'HEAD', dimPos: 'LO' },
      { fuseBlown: true }
    );
    usesFuseProtection = sNoFuse.loads.headLo === 0;
  } else if (challenge.id === 'M2') {
    // Konversi Modular: Spul Hitam-Merah Bebek mati -> ganti slot CDI ke MATIC DC!
    checks.push({
      label: 'Modul Unit CDI sudah diganti dari BEBEK AC menjadi tipe DC (MATIC DC)',
      passed: currentSlots.cdi === 'MATIC_DC',
    });

    const sKeyOff = runSim({
      ignitionOn: false,
      neutralGearOn: true,
      kickStartActive: true,
    });
    checks.push({
      label: 'Saat Kunci Kontak OFF, Busi tidak memercikkan api (mesin mati normal)',
      passed: !sKeyOff.sparkActive && !sKeyOff.shortCircuit.active,
    });

    const sStartNeutral = runSim({
      ignitionOn: true,
      neutralGearOn: true,
      sideStandUp: true,
      starterPressed: true,
    });
    checks.push({
      label: 'Kontak ON + Gigi Netral [N] + Start -> Dinamo memutar mesin & Busi memercikkan api!',
      passed:
        sStartNeutral.starterMotorSpinning &&
        sStartNeutral.sparkActive &&
        !sStartNeutral.overvoltageBlows.cdiDamaged &&
        !sStartNeutral.shortCircuit.active,
    });

    const sRunningCharge = runSim({
      ignitionOn: true,
      neutralGearOn: true,
      sideStandUp: true,
      engineRunning: true,
      rpm: 4500,
    });
    checks.push({
      label: 'Mesin menyala stabil & jalur Pengisian Aki (Spul Putih -> Kiprok) tetap bekerja!',
      passed: sRunningCharge.sparkActive && sRunningCharge.batteryCharging,
    });

    const sNoFuse = runSim(
      { ignitionOn: true, neutralGearOn: true, sideStandUp: true, kickStartActive: true },
      { fuseBlown: true }
    );
    usesFuseProtection = !sNoFuse.sparkActive;
  } else if (challenge.id === 'M3') {
    // Master Linked Full-Bike Challenge (Modul 1 + Modul 2 Unified!)
    checks.push({
      label: 'Sekring 10A utuh & tidak terjadi korsleting di jalur Bodi maupun Mesin',
      passed: !currentHealth.fuseBlown,
    });

    const sStartWithHiBeam = runSim({
      ignitionOn: true,
      sideStandUp: true,
      brakeFrontPressed: true,
      starterPressed: true,
      lightMainPos: 'HEAD',
      dimPos: 'HI',
    });
    checks.push({
      label: 'Mesin Matic hidup normal (Starter & Api Busi aktif) saat Lampu Jauh dinyalakan!',
      passed:
        sStartWithHiBeam.starterMotorSpinning &&
        sStartWithHiBeam.sparkActive &&
        !sStartWithHiBeam.shortCircuit.active,
    });

    const sNightRide = runSim({
      ignitionOn: true,
      sideStandUp: true,
      engineRunning: true,
      rpm: 4500,
      lightMainPos: 'HEAD',
      dimPos: 'HI',
    });
    const sNightLo = runSim({
      ignitionOn: true,
      sideStandUp: true,
      engineRunning: true,
      rpm: 4500,
      lightMainPos: 'HEAD',
      dimPos: 'LO',
    });
    checks.push({
      label: 'Modul 1 (Bodi): Lampu Dekat, Jauh, Senja & Indikator Dim menyala tanpa memutus sekring!',
      passed:
        sNightRide.loads.headHi >= 0.9 &&
        sNightRide.loads.indHighBeam >= 0.9 &&
        sNightRide.loads.senjaFront >= 0.9 &&
        sNightLo.loads.headLo >= 0.9 &&
        !sNightRide.shortCircuit.active,
    });

    checks.push({
      label: 'Modul 2 (Mesin): Pengisian Aki aktif & mesin mati aman saat Standar diturunkan',
      passed:
        sNightRide.batteryCharging &&
        !runSim({ ignitionOn: true, sideStandUp: false, engineRunning: true, rpm: 3000 })
          .sparkActive,
    });

    const sNoFuse = runSim(
      { ignitionOn: true, sideStandUp: true, lightMainPos: 'HEAD', dimPos: 'HI' },
      { fuseBlown: true }
    );
    usesFuseProtection = sNoFuse.loads.headHi === 0 && !sNoFuse.sparkActive;
  } else if (challenge.id === 'UKK_RANDOM') {
    const scope = challenge.randomScope || 'FULL_MOTOR';
    const checkBody = scope === 'BODY' || scope === 'FULL_MOTOR';
    const checkEngine = scope === 'ENGINE' || scope === 'FULL_MOTOR';

    const hasRemainingFaultyWire = wires.some((w) => w.fault && w.fault !== 'NONE');
    checks.push({
      label: 'Seluruh sekring utuh & tidak ada kabel rusak (putus dalam / lecet / korosi) tersisa',
      passed: !currentHealth.fuseBlown && !hasRemainingFaultyWire,
    });

    if (checkBody) {
      const sLightsLo = runSim({
        ignitionOn: true,
        engineRunning: true,
        rpm: 3500,
        lightMainPos: 'HEAD',
        dimPos: 'LO',
      });
      const sLightsHi = runSim({
        ignitionOn: true,
        engineRunning: true,
        rpm: 3500,
        lightMainPos: 'HEAD',
        dimPos: 'HI',
      });
      checks.push({
        label:
          'Penerangan Senja Depan/Belakang, Dekat (LO), Jauh (HI + Indikator Dim), & Pengisian Aki normal',
        passed:
          sLightsLo.loads.headLo >= 0.85 &&
          sLightsLo.loads.senjaFront >= 0.85 &&
          sLightsLo.loads.tailSenja >= 0.85 &&
          sLightsHi.loads.headHi >= 0.85 &&
          sLightsHi.loads.indHighBeam >= 0.85 &&
          sLightsLo.batteryCharging &&
          !sLightsLo.shortCircuit.active &&
          !sLightsHi.shortCircuit.active,
      });

      const sTurnL = runSim({ ignitionOn: true, turnPos: 'L' }, undefined, 100);
      const sTurnR = runSim({ ignitionOn: true, turnPos: 'R' }, undefined, 100);
      const sHorn = runSim({ ignitionOn: true, hornPressed: true });
      const sBrakeReleased = runSim({
        ignitionOn: true,
        brakeFrontPressed: false,
        brakeRearPressed: false,
      });
      const sBrakeFront = runSim({ ignitionOn: true, brakeFrontPressed: true });
      const sBrakeRear = runSim({ ignitionOn: true, brakeRearPressed: true });

      checks.push({
        label:
          'Sein Kiri/Kanan (Depan & Belakang), Klakson, & Rem Depan/Belakang bekerja normal tanpa korslet',
        passed:
          sTurnL.loads.turnFrontL >= 0.85 &&
          sTurnL.loads.turnRearL >= 0.85 &&
          sTurnL.loads.turnFrontR === 0 &&
          !sTurnL.flasherFastBlink &&
          sTurnR.loads.turnFrontR >= 0.85 &&
          sTurnR.loads.turnRearR >= 0.85 &&
          sTurnR.loads.turnFrontL === 0 &&
          !sTurnR.flasherFastBlink &&
          sHorn.loads.hornActive &&
          !sHorn.shortCircuit.active &&
          sBrakeReleased.loads.tailStop === 0 &&
          sBrakeFront.loads.tailStop >= 0.85 &&
          sBrakeRear.loads.tailStop >= 0.85 &&
          !sBrakeFront.shortCircuit.active &&
          !sBrakeRear.shortCircuit.active,
      });
    }

    if (checkEngine) {
      if (currentSlots.cdi === 'BEBEK_AC') {
        const sCrankBebek = runSim({
          ignitionOn: true,
          neutralGearOn: true,
          starterPressed: true,
        });
        const sInGear = runSim({
          ignitionOn: true,
          neutralGearOn: false,
          starterPressed: true,
        });
        const sKeyOffKick = runSim({
          ignitionOn: false,
          neutralGearOn: true,
          kickStartActive: true,
        });
        const sRunningCharge = runSim({
          ignitionOn: true,
          neutralGearOn: true,
          engineRunning: true,
          rpm: 4000,
        });
        checks.push({
          label:
            'Mesin Bebek AC: Starter Gigi Netral [N] kuat, Busi memercik, Pengisian aktif & Kill Kontak aman',
          passed:
            sCrankBebek.starterMotorSpinning &&
            !sCrankBebek.batteryCrankSag &&
            sCrankBebek.sparkActive &&
            !sCrankBebek.shortCircuit.active &&
            !sInGear.starterMotorSpinning &&
            !sKeyOffKick.sparkActive &&
            sRunningCharge.batteryCharging,
        });
      } else {
        const sCrankMatic = runSim({
          ignitionOn: true,
          sideStandUp: true,
          brakeFrontPressed: true,
          starterPressed: true,
        });
        const sStandDown = runSim({
          ignitionOn: true,
          sideStandUp: false,
          engineRunning: true,
          rpm: 2500,
        });
        const sKeyOffKick = runSim({
          ignitionOn: false,
          sideStandUp: true,
          kickStartActive: true,
        });
        const sRunningCharge = runSim({
          ignitionOn: true,
          sideStandUp: true,
          engineRunning: true,
          rpm: 4000,
        });
        checks.push({
          label:
            'Mesin Matic DC: Starter kuat (Aki sehat), Busi memercik, Pengisian aktif & Standar Samping aman',
          passed:
            sCrankMatic.starterMotorSpinning &&
            !sCrankMatic.batteryCrankSag &&
            sCrankMatic.sparkActive &&
            !sCrankMatic.shortCircuit.active &&
            !sStandDown.sparkActive &&
            !sKeyOffKick.sparkActive &&
            sRunningCharge.batteryCharging,
        });
      }
    }
  }

  const allFunctionalPassed = checks.length > 0 && checks.every((c) => c.passed);

  if (!allFunctionalPassed) {
    const passedCount = checks.filter((c) => c.passed).length;
    return {
      passed: false,
      stars: 0,
      score: Math.round((passedCount / Math.max(1, checks.length)) * 55),
      functionalChecks: checks,
      safetyPassed: false,
      safetyNote: 'Selesaikan seluruh fungsi utama kelistrikan terlebih dahulu.',
      proPassed: false,
      proNote: '-',
    };
  }

  const safetyPassed = usesFuseProtection && stats.blownFuseCount <= 1;
  const safetyNote = !usesFuseProtection
    ? 'Arus pengendali utama belum melewati pengaman Sekring 10A!'
    : stats.blownFuseCount > 1
      ? `Terjadi ${stats.blownFuseCount}x sekring putus saat pengerjaan.`
      : 'SOP Keamanan terpenuhi: Rangkaian diamankan Sekring 10A dengan benar.';

  let proPassed = false;
  let proNote = '';

  if (challenge.category === 'REPAIR' || challenge.category === 'RANDOM_UKK') {
    proPassed = stats.usedDiagnosticTool && stats.wastedPartsCount === 0 && !stats.hintUsed;
    const secretInfo = challenge.secretFaultSummary
      ? ` [Kasus: ${challenge.secretFaultSummary}]`
      : '';
    if (stats.wastedPartsCount > 0) {
      proNote = `Mengganti/servis ${stats.wastedPartsCount} part yang sebenarnya masih sehat.${secretInfo}`;
    } else if (!stats.usedDiagnosticTool) {
      proNote = `Berhasil diperbaiki, namun belum mengukur dengan AVO Meter / Tespen.${secretInfo}`;
    } else if (stats.hintUsed) {
      proNote = `Diagnosa tepat tanpa salah ganti part (memakai Hint).${secretInfo}`;
    } else {
      proNote = `Mekanik Pro! Diagnosa akurat dengan alat ukur & 0 kesalahan part.${secretInfo}`;
    }
  } else {
    proPassed = wireStandardOk && !stats.hintUsed;
    if (!wireStandardOk) {
      proNote = `Fungsi benar, tetapi beberapa warna kabel utama belum sesuai standar ${brand}.`;
    } else if (stats.hintUsed) {
      proNote = `Standar perakitan benar (menggunakan bantuan Hint).`;
    } else {
      proNote = `Sempurna! Perakitan rapi sesuai standar ${brand}.`;
    }
  }

  let stars: 1 | 2 | 3 = 1;
  if (safetyPassed && proPassed) stars = 3;
  else if (safetyPassed || proPassed) stars = 2;

  const baseScore = stars === 3 ? 100 : stars === 2 ? 85 : 70;
  const penalty = Math.min(15, stats.wastedPartsCount * 5 + Math.max(0, stats.blownFuseCount - 1) * 5);

  return {
    passed: true,
    stars,
    score: Math.max(60, baseScore - penalty),
    functionalChecks: checks,
    safetyPassed,
    safetyNote,
    proPassed,
    proNote,
  };
}
