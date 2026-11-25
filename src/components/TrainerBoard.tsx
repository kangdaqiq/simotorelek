import React from 'react';
import { ReplaceablePartId } from '../types/challenge';
import {
  ComponentHealth,
  ComponentSlots,
  ModularSlotKey,
  PinId,
  SimulationResult,
  SwitchStates,
  ToolState,
  Wire,
} from '../types/circuit';
import { BananaSocket } from './BananaSocket';
import { HeadlampAssemblyVisual, TaillampAssemblyVisual } from './MotorcycleLampVisuals';

interface TrainerBoardProps {
  wires: Wire[];
  slots: ComponentSlots;
  onToggleSlot: (slot: ModularSlotKey) => void;
  switches: SwitchStates;
  setSwitches: React.Dispatch<React.SetStateAction<SwitchStates>>;
  health: ComponentHealth;
  sim: SimulationResult;
  tools: ToolState;
  pendingFromPin: PinId | null;
  focusedPin: PinId | null;
  challengeActive: boolean;
  onReplacePart: (part: ReplaceablePartId) => void;
  onPinTap: (pinId: PinId, e: React.PointerEvent) => void;
  onFocusPin: (pinId: PinId) => void;
  registerPinEl: (
    pinId: PinId,
    el: HTMLButtonElement | null,
    unmountedEl?: HTMLButtonElement | null
  ) => void;
}

export const TrainerBoard: React.FC<TrainerBoardProps> = React.memo(({
  wires,
  slots,
  onToggleSlot,
  switches,
  setSwitches,
  health,
  sim,
  tools,
  pendingFromPin,
  focusedPin,
  challengeActive,
  onReplacePart,
  onPinTap,
  onFocusPin,
  registerPinEl,
}) => {
  const wireCounts = React.useMemo(() => {
    const counts: Partial<Record<PinId, number>> = {};
    for (const w of wires) {
      counts[w.from] = (counts[w.from] || 0) + 1;
      counts[w.to] = (counts[w.to] || 0) + 1;
    }
    return counts;
  }, [wires]);

  const sock = (
    pinId: PinId,
    label: string,
    ringColor: string,
    labelPos: 'top' | 'bottom' | 'left' | 'right' = 'bottom',
    subLabel?: string
  ) => (
    <BananaSocket
      pinId={pinId}
      label={label}
      subLabel={subLabel}
      ringColor={ringColor}
      selectedPin={pendingFromPin}
      focusedPin={focusedPin}
      wireCount={wireCounts[pinId] || 0}
      tools={tools}
      onPinTap={onPinTap}
      onFocusPin={onFocusPin}
      registerPinEl={registerPinEl}
      labelPos={labelPos}
    />
  );

  const anyHeadBlown = health.headLoBlown || health.headHiBlown || health.senjaFrontBlown;
  const anyTailBlown = health.tailSenjaBlown || health.tailStopBlown;

  return (
    <div className="w-full h-full grid grid-cols-12 gap-2.5 relative">
      {/* ==================== COLUMN 1: BELAKANG & MODULAR SPUL + KIPROK ==================== */}
      <div className="col-span-3 flex flex-col gap-2.5 min-h-0">
        {/* LAMPU BELAKANG & SEIN BELAKANG (REALISTIC REAR COWL + STOPLAMP + WINGS) */}
        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 flex-1 min-h-0 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <span className="text-[11px] font-black tracking-wider text-rose-300 uppercase">
              🚨 Stoplamp & Sein Belakang
            </span>
            {(anyTailBlown || challengeActive) && (
              <button
                type="button"
                onClick={() => onReplacePart('TAILLIGHT_UNIT')}
                className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer transition ${
                  anyTailBlown
                    ? 'bg-amber-400 text-slate-950 animate-bounce'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600'
                }`}
              >
                🔧 Ganti Bohlam
              </button>
            )}
          </div>

          <TaillampAssemblyVisual loads={sim.loads} health={health} />

          <div className="shrink-0">
            <div className="grid grid-cols-4 gap-y-1.5 justify-items-center pt-0.5">
              {sock('TURN_RL_POS', 'Sein L+', '#f97316')}
              {sock('TURN_RL_GND', 'Sein L-', '#22c55e')}
              {sock('TURN_RR_POS', 'Sein R+', '#38bdf8')}
              {sock('TURN_RR_GND', 'Sein R-', '#22c55e')}
            </div>
            <div className="grid grid-cols-3 gap-1 justify-items-center mt-1.5 pt-1.5 border-t border-slate-800">
              {sock('TAIL_SENJA', 'Kota', '#92400e')}
              {sock('TAIL_STOP', 'Rem', '#84cc16')}
              {sock('TAIL_GND', 'Massa', '#22c55e')}
            </div>
          </div>
        </div>

        {/* SLOT MODULAR 1: SPUL MAGNET (COMPACT, NO WASTED SPACE) */}
        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 shrink-0 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-black tracking-wider text-amber-300 uppercase">
              ⚡ Slot Spul Magnet
            </span>
            <button
              type="button"
              onClick={() => onToggleSlot('spul')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black border cursor-pointer transition ${
                slots.spul === 'MATIC_DC'
                  ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                  : 'bg-amber-500/25 border-amber-400 text-amber-200'
              }`}
              title="Sentuh untuk mengganti tipe komponen Spul"
            >
              🔄 {slots.spul === 'MATIC_DC' ? 'MATIC DC' : 'BEBEK AC'}
            </button>
          </div>

          <div className="flex items-center gap-2.5 my-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <div
              className={`w-8 h-8 rounded-full border-3 border-dashed border-amber-500/80 flex items-center justify-center shrink-0 ${
                switches.engineRunning ? 'animate-spin' : ''
              }`}
              style={{
                animationDuration: switches.engineRunning
                  ? `${Math.max(0.16, 1.4 - (switches.rpm / 8500) * 1.2)}s`
                  : '0s',
              }}
            >
              <div className="w-3 h-3 rounded-full bg-amber-500/30 border border-amber-300" />
            </div>
            <div className="text-[9.5px] text-slate-300 leading-tight">
              {slots.spul === 'BEBEK_AC' ? (
                <>
                  <b>Spul Bebek AC:</b> Jalur <b className="text-yellow-300">Kuning</b> Lampu AC (
                  {switches.engineRunning ? `${sim.spulACVoltage.toFixed(1)}V~` : '0V'}).
                </>
              ) : (
                <>
                  <b>Spul Matic DC:</b> Fokus cas Aki. Lampu kepala dirakit jalur <b>DC Kontak</b>!
                </>
              )}
            </div>
          </div>

          {slots.spul === 'BEBEK_AC' ? (
            <div className="grid grid-cols-3 gap-1 justify-items-center">
              {sock('ALT_WHITE', 'Putih', '#f8fafc', 'bottom', 'Cas AC')}
              {sock('ALT_YELLOW', 'Kuning', '#eab308', 'bottom', 'Lampu AC')}
              {sock('ALT_GND', 'Massa', '#22c55e', 'bottom', 'Ground')}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 justify-items-center">
              {sock('ALT_WHITE', 'Putih', '#f8fafc', 'bottom', 'Cas ke Kiprok')}
              {sock('ALT_GND', 'Massa', '#22c55e', 'bottom', 'Ground Spul')}
            </div>
          )}
        </div>

        {/* SLOT MODULAR 2: KIPROK (MATIC DC 3-PIN vs BEBEK AC 4-PIN) */}
        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-1 gap-1">
            <span className="text-[11px] font-black tracking-wider text-sky-300 uppercase truncate">
              🛡️ Slot Kiprok
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {challengeActive && (
                <button
                  type="button"
                  onClick={() => onReplacePart('REGULATOR')}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 text-[9px] font-black cursor-pointer"
                >
                  🔧 Ganti
                </button>
              )}
              <button
                type="button"
                onClick={() => onToggleSlot('kiprok')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black border cursor-pointer transition ${
                  slots.kiprok === 'MATIC_DC'
                    ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                    : 'bg-amber-500/25 border-amber-400 text-amber-200'
                }`}
              >
                🔄 {slots.kiprok === 'MATIC_DC' ? 'MATIC DC' : 'BEBEK 4P'}
              </button>
            </div>
          </div>

          <div className="h-5 rounded-lg bg-gradient-to-r from-slate-700 via-slate-500 to-slate-700 p-1 flex gap-1 mb-1.5 shadow-inner relative">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div key={idx} className="flex-1 bg-slate-900/65 rounded-xs" />
            ))}
          </div>

          {slots.kiprok === 'BEBEK_AC' ? (
            <div className="grid grid-cols-4 gap-1 justify-items-center">
              {sock('REG_WHITE', '1.Putih', '#f8fafc', 'bottom', 'In Cas')}
              {sock('REG_YELLOW', '2.Kuning', '#eab308', 'bottom', 'Reg AC')}
              {sock('REG_RED', '3.Merah', '#ef4444', 'bottom', 'Out +DC')}
              {sock('REG_GND', '4.Massa', '#22c55e', 'bottom', 'Ground')}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 justify-items-center">
              {sock('REG_WHITE', '1.Putih', '#f8fafc', 'bottom', 'In AC')}
              {sock('REG_RED', '2.Merah', '#ef4444', 'bottom', 'Out +14V')}
              {sock('REG_GND', '3.Massa', '#22c55e', 'bottom', 'Ground')}
            </div>
          )}
        </div>
      </div>

      {/* ==================== COLUMN 2: AKI, SEKRING, MODULAR KUNCI KONTAK, FLASHER, RELAY, MASSA ==================== */}
      <div className="col-span-3 flex flex-col gap-2.5 min-h-0">
        {/* AKI 12V & SEKRING */}
        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 shadow-lg">
          <div className="flex items-center justify-between mb-1.5 gap-1">
            <span className="text-[11px] font-black tracking-wider text-rose-400 uppercase truncate">
              🔋 Aki 12V & Sekring
            </span>
            {challengeActive && (
              <button
                type="button"
                onClick={() => onReplacePart('BATTERY')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 text-[10px] font-black cursor-pointer"
              >
                ⚡ Cas/Ganti Aki
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 items-center">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 flex justify-around items-center">
              {sock('BAT_POS', 'AKI (+)', '#ef4444')}
              {sock('BAT_NEG', 'AKI (-)', '#334155')}
            </div>

            <div
              className={`border rounded-xl p-2 flex flex-col items-center justify-between ${
                health.fuseBlown
                  ? 'bg-red-950/60 border-red-500'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="w-full flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-300">FUSE 10A:</span>
                {health.fuseBlown ? (
                  <button
                    type="button"
                    onClick={() => onReplacePart('FUSE')}
                    className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-black cursor-pointer animate-pulse"
                  >
                    🔧 Ganti Baru
                  </button>
                ) : (
                  <span className="text-[10px] font-extrabold text-emerald-400">UTUH</span>
                )}
              </div>
              <div className="flex justify-around w-full">
                {sock('FUSE_IN', 'IN', '#ef4444')}
                {sock('FUSE_OUT', 'OUT', '#ef4444')}
              </div>
            </div>
          </div>
        </div>

        {/* SLOT MODULAR 3: KUNCI KONTAK (2-PIN MATIC DC vs 4-PIN BEBEK AC) */}
        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black text-slate-200 uppercase">
              🔑 Slot Kunci Kontak
            </span>
            <button
              type="button"
              onClick={() => onToggleSlot('keySwitch')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black border cursor-pointer transition ${
                slots.keySwitch === 'MATIC_DC'
                  ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                  : 'bg-amber-500/25 border-amber-400 text-amber-200'
              }`}
            >
              🔄 {slots.keySwitch === 'MATIC_DC' ? '2-Pin (DC)' : '4-Pin (AC)'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSwitches((s) => ({ ...s, ignitionOn: !s.ignitionOn }))}
              className={`w-22 py-2.5 rounded-xl font-black text-xs border-2 transition active:scale-95 cursor-pointer shadow-md shrink-0 ${
                switches.ignitionOn
                  ? 'bg-emerald-600 border-emerald-300 text-white shadow-emerald-500/30'
                  : 'bg-slate-800 border-slate-600 text-slate-300'
              }`}
            >
              {switches.ignitionOn ? 'ON' : 'OFF'}
            </button>

            {slots.keySwitch === 'MATIC_DC' ? (
              <div className="flex-1 flex justify-around bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                {sock('IGN_IN', 'B (+In)', '#ef4444')}
                {sock('IGN_OUT', 'ON (Out)', '#92400e')}
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-4 gap-0.5 justify-items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                {sock('IGN_IN', 'B', '#ef4444')}
                {sock('IGN_OUT', 'ON', '#92400e')}
                {sock('IGN_KILL', 'KILL', '#ef4444')}
                {sock('IGN_KILL_GND', 'GND', '#22c55e')}
              </div>
            )}
          </div>
        </div>

        {/* FLASHER & RELAY 4 KAKI */}
        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 flex-1 flex flex-col justify-between shadow-lg">
          <div className="grid grid-cols-5 gap-2 h-full">
            <div className="col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-2 flex flex-col justify-between items-center">
              <div className="text-center w-full">
                <div className="text-[11px] font-black text-amber-300">FLASHER SEIN</div>
                <div className="text-[9px] text-slate-400">
                  {sim.flasherClicking
                    ? sim.flasherFastBlink
                      ? '⚡ Kedip Cepat!'
                      : '🔊 Tik-Tak Normal'
                    : 'Diam'}
                </div>
                {challengeActive && (
                  <button
                    type="button"
                    onClick={() => onReplacePart('FLASHER')}
                    className="mt-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 text-[9px] font-black cursor-pointer"
                  >
                    🔧 Ganti Flasher
                  </button>
                )}
              </div>
              <div className="flex gap-3 justify-center w-full">
                {sock('FLS_B', 'B (+)', '#334155')}
                {sock('FLS_L', 'L (Out)', '#94a3b8')}
              </div>
            </div>

            <div className="col-span-3 bg-slate-950 border border-slate-800 rounded-xl p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-sky-300">RELAY 4 KAKI</span>
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                    sim.relayEnergized
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {sim.relayEnergized ? '30-87 ON' : 'TERBUKA'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 justify-items-center">
                {sock('RLY_30', '30 (Arus)', '#ef4444')}
                {sock('RLY_87', '87 (Beban)', '#eab308')}
                {sock('RLY_85', '85 (Koil)', '#38bdf8')}
                {sock('RLY_86', '86 (Koil)', '#22c55e')}
              </div>
            </div>
          </div>
        </div>

        {/* TERMINAL MASSA RANGKA */}
        <div className="bg-slate-900/90 border-2 border-emerald-700/60 rounded-2xl p-2 shadow-lg">
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-[11px] font-black text-emerald-400 uppercase">
              ⏚ Terminal Massa Rangka (Ground Sasis)
            </span>
          </div>
          <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl py-1.5 px-2 grid grid-cols-4 justify-items-center">
            {sock('GND_1', 'GND 1', '#22c55e')}
            {sock('GND_2', 'GND 2', '#22c55e')}
            {sock('GND_3', 'GND 3', '#22c55e')}
            {sock('GND_4', 'GND 4', '#22c55e')}
          </div>
        </div>
      </div>

      {/* ==================== COLUMN 3: SPEEDOMETER & SAKLAR KIRI / KANAN ==================== */}
      <div className="col-span-3 flex flex-col gap-2.5 min-h-0">
        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 shadow-lg">
          <div className="text-[11px] font-black text-slate-300 uppercase mb-1.5 text-center">
            📟 Panel Indikator Speedometer
          </div>

          <div className="bg-slate-950 rounded-xl p-2 border border-slate-800 flex items-center justify-around mb-2">
            <div
              className={`px-2.5 py-1 rounded-lg font-black text-xs border transition-all ${
                sim.loads.indTurnL > 0.05
                  ? 'bg-emerald-500 text-slate-950 border-emerald-200 shadow-[0_0_16px_#10b981]'
                  : 'bg-slate-900 text-slate-600 border-slate-800'
              }`}
            >
              ◀ L
            </div>

            <div className="text-center px-2">
              <div className="font-mono text-sm font-black text-sky-300">
                {switches.engineRunning ? `${switches.rpm} RPM` : 'MESIN OFF'}
              </div>
            </div>

            <div
              className={`px-2 py-1 rounded-lg font-black text-xs border transition-all ${
                sim.loads.indHighBeam > 0.05
                  ? 'bg-blue-600 text-white border-blue-300 shadow-[0_0_16px_#3b82f6]'
                  : 'bg-slate-900 text-slate-600 border-slate-800'
              }`}
            >
              ≡D
            </div>

            <div
              className={`px-2.5 py-1 rounded-lg font-black text-xs border transition-all ${
                sim.loads.indTurnR > 0.05
                  ? 'bg-emerald-500 text-slate-950 border-emerald-200 shadow-[0_0_16px_#10b981]'
                  : 'bg-slate-900 text-slate-600 border-slate-800'
              }`}
            >
              R ▶
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 justify-items-center">
            {sock('IND_L_IN', 'Sein L+', '#f97316')}
            {sock('IND_HI_IN', 'Dim Hi+', '#2563eb')}
            {sock('IND_R_IN', 'Sein R+', '#38bdf8')}
            {sock('IND_GND', 'Massa -', '#22c55e')}
          </div>
        </div>

        {/* SAKLAR STANG KANAN & REM */}
        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black text-amber-300 uppercase">
              🎛️ Saklar Kanan & Switch Rem
            </span>
            {challengeActive && (
              <button
                type="button"
                onClick={() => onReplacePart('SWITCH_RIGHT_CLEAN')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-600 text-[9px] font-black cursor-pointer"
              >
                🧴 Servis Saklar
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-2">
            {(['OFF', 'SENJA', 'HEAD'] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setSwitches((s) => ({ ...s, lightMainPos: pos }))}
                className={`py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  switches.lightMainPos === pos
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {pos === 'OFF' ? '● OFF' : pos === 'SENJA' ? '☀ SENJA' : '💡 UTAMA'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1 justify-items-center mb-2 pb-2 border-b border-slate-800">
            {sock('SWR_LIGHT_IN', 'IN Sumber', '#eab308')}
            {sock('SWR_SENJA_OUT', 'Out Senja', '#92400e')}
            {sock('SWR_HEAD_OUT', 'Out Utama', '#eab308')}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-950 rounded-xl p-1.5 border border-slate-800 flex flex-col items-center">
              <button
                type="button"
                onClick={() =>
                  setSwitches((s) => ({ ...s, brakeFrontPressed: !s.brakeFrontPressed }))
                }
                className={`w-full py-1 rounded-lg text-[11px] font-black mb-1.5 cursor-pointer transition ${
                  switches.brakeFrontPressed
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {switches.brakeFrontPressed ? '🛑 REM DPN: ON' : 'REM DPN: LEPAS'}
              </button>
              <div className="flex gap-3">
                {sock('SWR_BRAKE_IN', 'IN', '#334155')}
                {sock('SWR_BRAKE_OUT', 'OUT', '#84cc16')}
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl p-1.5 border border-slate-800 flex flex-col items-center">
              <button
                type="button"
                onClick={() =>
                  setSwitches((s) => ({ ...s, brakeRearPressed: !s.brakeRearPressed }))
                }
                className={`w-full py-1 rounded-lg text-[11px] font-black mb-1.5 cursor-pointer transition ${
                  switches.brakeRearPressed
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {switches.brakeRearPressed ? '🛑 REM BLK: ON' : 'REM BLK: LEPAS'}
              </button>
              <div className="flex gap-3">
                {sock('BRK_REAR_IN', 'IN', '#334155')}
                {sock('BRK_REAR_OUT', 'OUT', '#84cc16')}
              </div>
            </div>
          </div>
        </div>

        {/* SAKLAR STANG KIRI */}
        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 flex-1 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-sky-300 uppercase">
              🎛️ Saklar Stang Kiri
            </span>
            {challengeActive && (
              <button
                type="button"
                onClick={() => onReplacePart('SWITCH_LEFT_CLEAN')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-600 text-[9px] font-black cursor-pointer"
              >
                🧴 Servis Saklar
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 my-1">
            <button
              type="button"
              onClick={() =>
                setSwitches((s) => ({ ...s, dimPos: s.dimPos === 'LO' ? 'HI' : 'LO' }))
              }
              className={`py-1.5 px-2 rounded-xl font-black text-xs border cursor-pointer transition ${
                switches.dimPos === 'HI'
                  ? 'bg-blue-600 border-blue-300 text-white'
                  : 'bg-slate-800 border-slate-600 text-slate-200'
              }`}
            >
              {switches.dimPos === 'HI' ? '≡D JAUH (HI)' : '≡D DEKAT (LO)'}
            </button>

            <div className="flex gap-1">
              <button
                type="button"
                onPointerDown={() => setSwitches((s) => ({ ...s, hornPressed: true }))}
                onPointerUp={() => setSwitches((s) => ({ ...s, hornPressed: false }))}
                onPointerLeave={() => setSwitches((s) => ({ ...s, hornPressed: false }))}
                className={`flex-1 py-1.5 px-1.5 rounded-xl font-black text-xs border cursor-pointer transition ${
                  switches.hornPressed
                    ? 'bg-lime-500 border-white text-slate-950 scale-95'
                    : 'bg-slate-800 border-lime-500/50 text-lime-300'
                }`}
              >
                📯 KLAKSON
              </button>
              <button
                type="button"
                title="Kunci tombol klakson agar bisa diukur sambil bunyi"
                onClick={() => setSwitches((s) => ({ ...s, hornPressed: !s.hornPressed }))}
                className={`px-2 rounded-xl text-[10px] font-black border cursor-pointer ${
                  switches.hornPressed
                    ? 'bg-amber-400 text-slate-950 border-white'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}
              >
                🔒
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-1.5">
            {(['L', 'OFF', 'R'] as const).map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => setSwitches((s) => ({ ...s, turnPos: tp, hazardOn: false }))}
                className={`py-1 rounded-lg text-xs font-black cursor-pointer transition ${
                  !switches.hazardOn && switches.turnPos === tp
                    ? tp === 'OFF'
                      ? 'bg-slate-700 text-white'
                      : 'bg-orange-500 text-slate-950'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {tp === 'L' ? '◀ KIRI' : tp === 'OFF' ? '● OFF' : 'KANAN ▶'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSwitches((s) => ({ ...s, hazardOn: !s.hazardOn }))}
              className={`py-1 rounded-lg text-xs font-black cursor-pointer transition ${
                switches.hazardOn
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'text-rose-400 hover:bg-slate-800'
              }`}
            >
              ⚠️ HZD
            </button>
          </div>

          <div className="grid grid-cols-4 gap-y-1.5 justify-items-center">
            {sock('SWL_DIM_IN', 'Dim IN', '#eab308')}
            {sock('SWL_LO_OUT', 'Out LO', '#f8fafc')}
            {sock('SWL_HI_OUT', 'Out HI', '#2563eb')}
            {sock('SWL_HORN_1', 'Klksn 1', '#334155')}
            {sock('SWL_TURN_IN', 'Sein IN', '#94a3b8')}
            {sock('SWL_TURN_L', 'Sein L', '#f97316')}
            {sock('SWL_TURN_R', 'Sein R', '#38bdf8')}
            {sock('SWL_HORN_2', 'Klksn 2', '#84cc16')}
          </div>
        </div>
      </div>

      {/* ==================== COLUMN 4: BATOK HEADLAMP + SEIN DEPAN TERPADU & KLAKSON ==================== */}
      <div className="col-span-3 flex flex-col gap-2.5 min-h-0">
        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 flex-1 min-h-0 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between shrink-0 mb-1.5">
            <span className="text-[11px] font-black tracking-wider text-yellow-300 uppercase">
              💡 Headlamp & Sein Depan
            </span>
            {(anyHeadBlown || challengeActive) && (
              <button
                type="button"
                onClick={() => onReplacePart('HEADLIGHT_UNIT')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition ${
                  anyHeadBlown
                    ? 'bg-amber-400 text-slate-950 animate-bounce'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600'
                }`}
              >
                🔧 Ganti Bohlam/Fitting
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 mb-2">
            <HeadlampAssemblyVisual loads={sim.loads} health={health} />
          </div>

          {/* Integrated Socket Bay: Headlamp Center Pins + Left/Right Front Turn Signal Pins */}
          <div className="shrink-0 space-y-1.5">
            <div className="grid grid-cols-4 gap-1 justify-items-center bg-slate-950/70 py-1.5 px-1 rounded-xl border border-slate-800">
              {sock('HEAD_LO', 'Dekat (LO)', '#f8fafc')}
              {sock('HEAD_HI', 'Jauh (HI)', '#2563eb')}
              {sock('HEAD_SENJA', 'Senja', '#92400e')}
              {sock('HEAD_GND', 'Massa (-)', '#22c55e')}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950/70 rounded-xl py-1.5 px-2 border border-slate-800 flex items-center justify-around">
                {sock('TURN_FL_POS', 'Sein L+', '#f97316')}
                {sock('TURN_FL_GND', 'Sein L-', '#22c55e')}
              </div>
              <div className="bg-slate-950/70 rounded-xl py-1.5 px-2 border border-slate-800 flex items-center justify-around">
                {sock('TURN_FR_POS', 'Sein R+', '#38bdf8')}
                {sock('TURN_FR_GND', 'Sein R-', '#22c55e')}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 shadow-lg flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-11 h-11 rounded-full border-4 flex items-center justify-center transition-transform shrink-0 ${
                sim.loads.hornActive
                  ? 'border-lime-400 bg-lime-500/30 scale-110 shadow-[0_0_24px_#84cc16]'
                  : 'border-slate-600 bg-slate-950'
              }`}
            >
              <span className="text-lg">{sim.loads.hornActive ? '🔊' : '📯'}</span>
            </div>
            <div>
              <div className="text-[11px] font-black text-lime-300 uppercase">Klakson 12V</div>
              {challengeActive ? (
                <button
                  type="button"
                  onClick={() => onReplacePart('HORN')}
                  className="mt-0.5 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 text-[9px] font-black cursor-pointer"
                >
                  🔧 Ganti Klakson
                </button>
              ) : (
                <div className="text-[10px] font-bold text-slate-400">
                  {sim.loads.hornActive ? 'BERBUNYI NYARING!' : 'Siap (Non-Polar)'}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
            {sock('HORN_A', 'Pin 1', '#84cc16')}
            {sock('HORN_B', 'Pin 2', '#22c55e')}
          </div>
        </div>
      </div>
    </div>
  );
});
