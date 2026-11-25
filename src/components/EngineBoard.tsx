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

interface EngineBoardProps {
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
  onTriggerKickStart: () => void;
  onPinTap: (pinId: PinId, e: React.PointerEvent) => void;
  onFocusPin: (pinId: PinId) => void;
  registerPinEl: (
    pinId: PinId,
    el: HTMLButtonElement | null,
    unmountedEl?: HTMLButtonElement | null
  ) => void;
}

export const EngineBoard: React.FC<EngineBoardProps> = React.memo(({
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
  onTriggerKickStart,
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

  const sock = (pinId: PinId, label: string, ringColor: string, subLabel?: string) => (
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
      labelPos="bottom"
    />
  );

  const rotorSpinning = sim.effectiveRpm > 0;

  return (
    <div className="w-full h-full grid grid-cols-12 gap-2.5 relative">
      {/* ==================== COLUMN 1: MODULAR SPUL, KIPROK, & PENGAMAN RANGKA/GIGI ==================== */}
      <div className="col-span-3 flex flex-col gap-2.5 min-h-0">
        {/* SLOT MODULAR 1: SPUL & PULSER (MATIC DC vs BEBEK AC) */}
        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 flex-1 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-black tracking-wider text-amber-300 uppercase">
              ⚡ Slot Spul & Pulser
            </span>
            <button
              type="button"
              onClick={() => onToggleSlot('spul')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black border cursor-pointer transition ${
                slots.spul === 'MATIC_DC'
                  ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                  : 'bg-amber-500/25 border-amber-400 text-amber-200'
              }`}
            >
              🔄 {slots.spul === 'MATIC_DC' ? 'MATIC DC' : 'BEBEK AC'}
            </button>
          </div>

          <div className="flex items-center gap-3 my-1 bg-slate-950/90 p-2 rounded-xl border border-slate-800">
            <div className="relative flex items-center shrink-0">
              <div
                className={`w-13 h-13 rounded-full border-4 border-dashed border-amber-400/90 flex items-center justify-center ${
                  rotorSpinning ? 'animate-spin' : ''
                }`}
                style={{
                  animationDuration: rotorSpinning
                    ? `${Math.max(0.14, 1.3 - (sim.effectiveRpm / 8500) * 1.1)}s`
                    : '0s',
                }}
              >
                <div className="w-5 h-5 rounded-full bg-amber-500/25 border border-amber-300" />
              </div>
              <div
                className={`ml-1 w-3 h-6 rounded border ${
                  sim.pulserACVoltage > 0.2
                    ? 'bg-blue-500 border-yellow-300 shadow-[0_0_10px_#3b82f6]'
                    : 'bg-slate-800 border-slate-600'
                }`}
                title="Sensor Pulser"
              />
            </div>

            <div className="text-[10px] text-slate-300 space-y-0.5 leading-tight">
              {slots.spul === 'BEBEK_AC' ? (
                <>
                  <div>
                    Spul CDI:{' '}
                    <b className="text-rose-300 font-mono">
                      {health.faultSpulCdiBroken ? '0V (PUTUS!)' : `${sim.spulCdiACVoltage} V~`}
                    </b>
                  </div>
                  <div>
                    Pulser: <b className="text-sky-300 font-mono">{sim.pulserACVoltage} V~</b>
                  </div>
                  <div className="text-amber-200/80">Ada gulungan 200V AC</div>
                </>
              ) : (
                <>
                  <div className="text-sky-300 font-bold">Spul Matic DC</div>
                  <div>
                    Pulser: <b className="text-sky-300 font-mono">{sim.pulserACVoltage} V~</b>
                  </div>
                  <div className="text-slate-400">Tanpa gulungan Spul CDI AC</div>
                </>
              )}
            </div>
          </div>

          {slots.spul === 'BEBEK_AC' ? (
            <div className="grid grid-cols-4 gap-1 justify-items-center">
              {sock('ALT_WHITE', 'Putih', '#f8fafc', 'Cas AC')}
              {sock('SPUL_CDI_AC', 'Htm-Mrh', '#ef4444', 'Spul CDI')}
              {sock('PULSER_POS', 'Biru-Kng', '#2563eb', 'Pulser +')}
              {sock('ALT_GND', 'Massa', '#22c55e', 'Ground')}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 justify-items-center">
              {sock('ALT_WHITE', 'Putih', '#f8fafc', 'Cas AC')}
              {sock('PULSER_POS', 'Biru-Kng', '#2563eb', 'Pulser +')}
              {sock('ALT_GND', 'Massa', '#22c55e', 'Ground')}
            </div>
          )}
        </div>

        {/* SLOT MODULAR 2: KIPROK */}
        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 shadow-lg">
          <div className="flex items-center justify-between mb-1.5 gap-1">
            <span className="text-[11px] font-black tracking-wider text-sky-300 uppercase">
              🛡️ Slot Kiprok
            </span>
            <div className="flex items-center gap-1">
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

          {slots.kiprok === 'BEBEK_AC' ? (
            <div className="grid grid-cols-4 gap-1 justify-items-center">
              {sock('REG_WHITE', '1.Putih', '#f8fafc', 'In Cas')}
              {sock('REG_YELLOW', '2.Kuning', '#eab308', 'Reg AC')}
              {sock('REG_RED', '3.Merah', '#ef4444', 'Out +DC')}
              {sock('REG_GND', '4.Massa', '#22c55e', 'Ground')}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 justify-items-center">
              {sock('REG_WHITE', '1.Putih', '#f8fafc', 'In AC')}
              {sock('REG_RED', '2.Merah', '#ef4444', 'Out +14V')}
              {sock('REG_GND', '3.Massa', '#22c55e', 'Ground')}
            </div>
          )}
        </div>

        {/* SLOT MODULAR 5: PENGAMAN MATIC (STANDAR SAMPING) vs BEBEK (GIGI NETRAL N) */}
        <div className="bg-slate-900/90 border-2 border-amber-600/50 rounded-2xl p-2.5 shadow-lg">
          <div className="flex items-center justify-between mb-1.5 gap-1">
            <span className="text-[11px] font-black text-amber-300 uppercase truncate">
              {slots.safety === 'MATIC_DC'
                ? '🦵 Standar Samping'
                : '⚙️ Switch Gigi Netral'}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {challengeActive && slots.safety === 'MATIC_DC' && (
                <button
                  type="button"
                  onClick={() => onReplacePart('SWITCH_SIDESTAND_CLEAN')}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-600 text-[9px] font-black cursor-pointer"
                >
                  🧴 Servis
                </button>
              )}
              <button
                type="button"
                onClick={() => onToggleSlot('safety')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black border cursor-pointer shrink-0 transition ${
                  slots.safety === 'MATIC_DC'
                    ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                    : 'bg-amber-500/25 border-amber-400 text-amber-200'
                }`}
              >
                🔄 {slots.safety === 'MATIC_DC' ? 'MATIC' : 'BEBEK'}
              </button>
            </div>
          </div>

          {slots.safety === 'MATIC_DC' ? (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSwitches((s) => ({ ...s, sideStandUp: !s.sideStandUp }))}
                className={`flex-1 py-2.5 px-2 rounded-xl font-black text-xs border-2 cursor-pointer transition shadow ${
                  switches.sideStandUp
                    ? 'bg-emerald-600 border-emerald-300 text-white'
                    : 'bg-rose-700 border-rose-300 text-white'
                }`}
              >
                {switches.sideStandUp ? '▲ NAIK (TERHUBUNG)' : '▼ TURUN (PUTUS)'}
              </button>

              <div className="flex gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
                {sock('SIDE_SW_1', 'Pin 1', '#84cc16')}
                {sock('SIDE_SW_2', 'Pin 2', '#22c55e')}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() =>
                    setSwitches((s) => ({ ...s, neutralGearOn: !s.neutralGearOn }))
                  }
                  className={`flex-1 py-1.5 px-2 rounded-xl font-black text-xs border cursor-pointer transition ${
                    switches.neutralGearOn
                      ? 'bg-emerald-600 border-emerald-300 text-white'
                      : 'bg-slate-800 border-slate-600 text-amber-300'
                  }`}
                >
                  {switches.neutralGearOn ? '🟢 POSISI: NETRAL (N)' : '⚙️ MASUK GIGI 1-4'}
                </button>
                {/* Green [N] Lamp */}
                <div
                  className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center font-black text-sm ${
                    sim.neutralLampBrightness > 0.1
                      ? 'bg-lime-500 text-slate-950 border-white shadow-[0_0_16px_#84cc16]'
                      : 'bg-slate-950 text-slate-600 border-slate-800'
                  }`}
                  title="Lampu Indikator Netral"
                >
                  N
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 justify-items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                {sock('NEUTRAL_IND_POS', 'Lampu N+', '#92400e')}
                {sock('NEUTRAL_SW_OUT', 'SW Netral', '#84cc16')}
                {sock('NEUTRAL_GND', 'Massa Bak', '#22c55e')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== COLUMN 2: AKI, SEKRING, MODULAR KUNCI KONTAK & MASSA ==================== */}
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
              {sock('BAT_POS', 'AKI (+)', '#ef4444', 'Arus Utama')}
              {sock('BAT_NEG', 'AKI (-)', '#334155', 'Massa')}
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
        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 flex-1 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between gap-1">
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
                🔄 {slots.keySwitch === 'MATIC_DC' ? '2-Pin (Matic DC)' : '4-Pin (Bebek AC)'}
              </button>
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">
              {slots.keySwitch === 'MATIC_DC'
                ? 'Tipe DC 2 Kabel: ON menyambung B ↔ ON, OFF memutus arus +12V.'
                : 'Tipe Bebek AC 4 Kabel: Saat OFF menyambung KILL ↔ KILL(-) untuk mematikan CDI AC!'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSwitches((s) => ({ ...s, ignitionOn: !s.ignitionOn }))}
            className={`w-full py-2.5 my-1 rounded-xl font-black text-sm border-2 transition active:scale-98 cursor-pointer shadow-md ${
              switches.ignitionOn
                ? 'bg-emerald-600 border-emerald-300 text-white shadow-emerald-500/30'
                : 'bg-slate-800 border-slate-600 text-slate-300'
            }`}
          >
            {switches.ignitionOn
              ? '🔑 KUNCI KONTAK: ON (HIDUP)'
              : '🔒 KUNCI KONTAK: OFF (MATI)'}
          </button>

          {slots.keySwitch === 'MATIC_DC' ? (
            <div className="grid grid-cols-2 gap-2 justify-items-center bg-slate-950 p-2 rounded-xl border border-slate-800">
              {sock('IGN_IN', 'B (+12V In)', '#ef4444', 'Dari Sekring')}
              {sock('IGN_OUT', 'ON (+12V Out)', '#92400e', 'Ke Beban/CDI')}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1 justify-items-center bg-slate-950 p-2 rounded-xl border border-slate-800">
              {sock('IGN_IN', 'B (+In)', '#ef4444', 'DC In')}
              {sock('IGN_OUT', 'ON (Out)', '#92400e', 'DC Out')}
              {sock('IGN_KILL', 'KILL', '#ef4444', 'Ke CDI Kill')}
              {sock('IGN_KILL_GND', 'KILL (-)', '#22c55e', 'Ke GND')}
            </div>
          )}
        </div>

        {/* TERMINAL MASSA RANGKA */}
        <div className="bg-slate-900/90 border-2 border-emerald-700/60 rounded-2xl p-2.5 shadow-lg">
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

      {/* ==================== COLUMN 3: SAKLAR STARTER, BENDIK, & MODULAR UNIT CDI ==================== */}
      <div className="col-span-3 flex flex-col gap-2.5 min-h-0">
        {/* HOLDER STANG STARTER, REM & ENGKOL */}
        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 shadow-lg">
          <div className="flex items-center justify-between mb-1.5 gap-1">
            <span className="text-[11px] font-black text-amber-300 uppercase truncate">
              🎛️ Rem, Starter & Engkol
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {challengeActive && (
                <button
                  type="button"
                  onClick={() => onReplacePart('SWITCH_STARTER_CLEAN')}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-600 text-[9px] font-black cursor-pointer"
                >
                  🧴 Servis Saklar
                </button>
              )}
              <button
                type="button"
                onClick={onTriggerKickStart}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black border cursor-pointer transition ${
                  switches.kickStartActive
                    ? 'bg-amber-400 text-slate-950 border-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
                }`}
              >
                🦶 Engkol
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-950 rounded-xl p-1.5 border border-slate-800 flex flex-col items-center">
              <button
                type="button"
                onClick={() =>
                  setSwitches((s) => ({ ...s, brakeFrontPressed: !s.brakeFrontPressed }))
                }
                className={`w-full py-1.5 rounded-lg text-[11px] font-black mb-1.5 cursor-pointer transition ${
                  switches.brakeFrontPressed
                    ? 'bg-red-600 text-white shadow'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {switches.brakeFrontPressed ? '🛑 REM: DITARIK' : 'REM: DILEPAS'}
              </button>
              <div className="flex gap-3">
                {sock('SWR_BRAKE_IN', 'Rem IN', '#334155')}
                {sock('SWR_BRAKE_OUT', 'Rem OUT', '#84cc16')}
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl p-1.5 border border-slate-800 flex flex-col items-center">
              <div className="flex gap-1 w-full mb-1.5">
                <button
                  type="button"
                  onPointerDown={() => setSwitches((s) => ({ ...s, starterPressed: true }))}
                  onPointerUp={() => setSwitches((s) => ({ ...s, starterPressed: false }))}
                  onPointerLeave={() => setSwitches((s) => ({ ...s, starterPressed: false }))}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-black cursor-pointer transition ${
                    switches.starterPressed
                      ? 'bg-yellow-400 text-slate-950 scale-95'
                      : 'bg-slate-800 text-yellow-300 border border-yellow-500/40'
                  }`}
                >
                  ⚡ START
                </button>
                <button
                  type="button"
                  title="Tahan tombol starter untuk ukur tegangan dengan AVO"
                  onClick={() =>
                    setSwitches((s) => ({ ...s, starterPressed: !s.starterPressed }))
                  }
                  className={`px-2 rounded-lg text-[10px] font-black border cursor-pointer ${
                    switches.starterPressed
                      ? 'bg-amber-400 text-slate-950 border-white'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  🔒
                </button>
              </div>
              <div className="flex gap-3">
                {sock('ST_BTN_1', 'Pin 1', '#eab308')}
                {sock('ST_BTN_2', 'Pin 2', '#22c55e')}
              </div>
            </div>
          </div>
        </div>

        {/* RELAY STARTER / BENDIK 4 KAKI */}
        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black text-rose-300 uppercase">
              🧲 Bendik / Relay Starter (45A)
            </span>
            <div className="flex items-center gap-1">
              {challengeActive && (
                <button
                  type="button"
                  onClick={() => onReplacePart('STARTER_RELAY')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 text-[9px] font-black cursor-pointer"
                >
                  🔧 Ganti Bendik
                </button>
              )}
              <span
                className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                  sim.starterRelayEnergized
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {sim.starterRelayEnergized ? 'KLIK! 30-87 ON' : 'TERBUKA'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 justify-items-center bg-slate-950 p-2 rounded-xl border border-slate-800">
            {sock('ST_RLY_30', 'Baut 30', '#ef4444', 'Ke Aki +')}
            {sock('ST_RLY_87', 'Baut 87', '#ef4444', 'Ke Dinamo')}
            {sock('ST_RLY_85', 'Koil 85', '#eab308', 'Pemicu')}
            {sock('ST_RLY_86', 'Koil 86', '#84cc16', 'Pemicu')}
          </div>
        </div>

        {/* SLOT MODULAR 4: UNIT CDI (CDI MATIC DC vs CDI BEBEK AC) */}
        <div
          className={`bg-slate-900/90 border rounded-2xl p-2.5 flex-1 flex flex-col justify-between shadow-lg ${
            health.faultCdiBroken ? 'border-red-500' : 'border-slate-700/90'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-black text-purple-300 uppercase">
              🧠 Slot Unit CDI
            </span>

            <div className="flex items-center gap-1">
              {(challengeActive || health.faultCdiBroken) && (
                <button
                  type="button"
                  onClick={() => onReplacePart('CDI_UNIT')}
                  className={`px-2 py-0.5 rounded text-[9px] font-black cursor-pointer ${
                    health.faultCdiBroken
                      ? 'bg-amber-400 text-slate-950 animate-bounce'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600'
                  }`}
                >
                  🔧 Ganti CDI
                </button>
              )}
              <button
                type="button"
                onClick={() => onToggleSlot('cdi')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black border cursor-pointer transition ${
                  slots.cdi === 'MATIC_DC'
                    ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                    : 'bg-amber-500/25 border-amber-400 text-amber-200'
                }`}
              >
                🔄 {slots.cdi === 'MATIC_DC' ? 'CDI MATIC DC' : 'CDI BEBEK AC'}
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 my-1 flex items-center justify-between text-[10px]">
            {health.faultCdiBroken ? (
              <span className="text-red-400 font-black">
                💥 UNIT CDI RUSAK / TERBAKAR! Ganti unit baru.
              </span>
            ) : slots.cdi === 'MATIC_DC' ? (
              <>
                <span className={sim.cdiPowered ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  ● 12V & Standar: {sim.cdiPowered ? 'AKTIF' : !sim.cdiSideStandOk ? 'TERKUNCI STANDAR' : 'OFF'}
                </span>
                <span className={sim.cdiTriggered ? 'text-sky-300 font-bold' : 'text-slate-500'}>
                  ● Pulser: {sim.cdiTriggered ? 'MEMICU!' : 'DIAM'}
                </span>
              </>
            ) : (
              <>
                <span className={sim.cdiPowered ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                  ● Spul 200V: {sim.cdiPowered ? 'AKTIF' : !sim.cdiSideStandOk ? 'DIMATIKAN KILL!' : 'OFF'}
                </span>
                <span className={sim.cdiTriggered ? 'text-sky-300 font-bold' : 'text-slate-500'}>
                  ● Pulser: {sim.cdiTriggered ? 'MEMICU!' : 'DIAM'}
                </span>
              </>
            )}
          </div>

          {slots.cdi === 'MATIC_DC' ? (
            <div className="grid grid-cols-5 gap-0.5 justify-items-center">
              {sock('CDI_PWR', '+12V', '#92400e', 'Kontak')}
              {sock('CDI_PULSER', 'Pulser', '#2563eb', 'Input')}
              {sock('CDI_COIL', 'Koil', '#f97316', 'Output')}
              {sock('CDI_SIDESTAND', 'SW Stdr', '#84cc16', 'Wajib -')}
              {sock('CDI_GND', 'Massa', '#22c55e', 'Ground')}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-0.5 justify-items-center">
              {sock('CDI_PWR', 'Spul AC', '#ef4444', 'Bl/R')}
              {sock('CDI_PULSER', 'Pulser', '#2563eb', 'Input')}
              {sock('CDI_COIL', 'Koil', '#f97316', 'Output')}
              {sock('CDI_KILL', 'Kill', '#cbd5e1', 'Mati=-')}
              {sock('CDI_GND', 'Massa', '#22c55e', 'Ground')}
            </div>
          )}
        </div>
      </div>

      {/* ==================== COLUMN 4: DINAMO STARTER, KOIL PENGAPIAN & BUSI ==================== */}
      <div className="col-span-3 flex flex-col gap-2.5 min-h-0">
        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black text-amber-300 uppercase">
              ⚙️ Dinamo Starter Elektrik
            </span>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded ${
                sim.starterMotorSpinning
                  ? 'bg-amber-400 text-slate-950 animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {sim.starterMotorSpinning ? 'BERPUTAR (CRANKING!)' : 'DIAM'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-11 h-11 rounded-full border-4 border-dotted flex items-center justify-center shrink-0 ${
                  sim.starterMotorSpinning
                    ? 'border-amber-400 bg-amber-500/20 animate-spin'
                    : 'border-slate-600 bg-slate-900'
                }`}
                style={{ animationDuration: '0.28s' }}
              >
                <span className="text-base">⚙️</span>
              </div>
              <div className="text-[10px] text-slate-300 leading-tight">
                Wajib disuplai dari <b>Baut 87 Bendik</b> (~45A).
              </div>
            </div>

            <div className="flex gap-3 shrink-0">
              {sock('ST_MOT_POS', 'Baut (+)', '#ef4444')}
              {sock('ST_MOT_GND', 'Bodi (-)', '#22c55e')}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black text-orange-300 uppercase">
              ⚡ Koil Pengapian (20.000V)
            </span>
            {challengeActive && (
              <button
                type="button"
                onClick={() => onReplacePart('IGNITION_COIL')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 text-[9px] font-black cursor-pointer"
              >
                🔧 Ganti Koil
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1 justify-items-center bg-slate-950 p-2 rounded-xl border border-slate-800">
            {sock('COIL_POS', 'Primer (+)', '#f97316', 'Dari CDI')}
            {sock('COIL_GND', 'Massa (-)', '#22c55e', 'Ground')}
            {sock('COP_OUT', 'Kabel Busi', '#e879f9', 'Out HV')}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-700/90 rounded-2xl p-2.5 flex-1 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-cyan-300 uppercase">
              🔥 Busi & Ruang Bakar Mesin
            </span>
            {challengeActive && (
              <button
                type="button"
                onClick={() => onReplacePart('SPARK_PLUG')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 text-[9px] font-black cursor-pointer"
              >
                🔧 Ganti Busi
              </button>
            )}
          </div>

          <div
            className="flex-1 my-2 rounded-2xl border-2 flex flex-col items-center justify-center p-2 relative overflow-hidden transition-all"
            style={{
              backgroundColor: '#020617',
              borderColor: sim.sparkActive ? '#38bdf8' : '#1e293b',
              boxShadow: sim.sparkActive
                ? 'inset 0 0 38px rgba(56, 189, 248, 0.45), 0 0 20px rgba(192, 132, 252, 0.5)'
                : 'none',
            }}
          >
            <div className="w-7 h-9 bg-slate-200 rounded-t-md border-2 border-slate-400 flex flex-col items-center justify-end">
              <div className="w-3 h-3 bg-slate-600" />
            </div>
            <div className="h-7 flex items-center justify-center">
              {sim.sparkActive ? (
                <div className="text-2xl animate-ping drop-shadow-[0_0_14px_#67e8f9]">⚡</div>
              ) : (
                <div className="text-xs font-bold text-slate-600">Tidak Ada Api</div>
              )}
            </div>
            <div className="w-8 h-2 border-b-4 border-l-4 border-slate-500 rounded-bl" />

            <div
              className={`mt-2 px-3 py-0.5 rounded-full text-[10px] font-black ${
                switches.engineRunning && sim.sparkActive
                  ? 'bg-emerald-500 text-slate-950'
                  : sim.sparkActive
                    ? 'bg-cyan-400 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
              }`}
            >
              {switches.engineRunning && sim.sparkActive
                ? `🔥 MESIN HIDUP (${switches.rpm} RPM)`
                : sim.sparkActive
                  ? '⚡ API BUSI MEMERCIK!'
                  : 'MESIN MATI'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 justify-items-center">
            {sock('PLUG_TOP', 'Cop Busi (HV)', '#e879f9', 'Dari Koil')}
            {sock('PLUG_GND', 'Ulir Busi (-)', '#22c55e', 'Massa Mesin')}
          </div>
        </div>
      </div>
    </div>
  );
});
