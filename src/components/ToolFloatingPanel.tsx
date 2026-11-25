import React, { useEffect, useRef, useState } from 'react';
import { PIN_LABELS } from '../data/wireStandards';
import { MultimeterMode, SimulationResult, ToolState } from '../types/circuit';
import { InstrumentJackCoords } from './InstrumentLeadsOverlay';

interface ToolFloatingPanelProps {
  tools: ToolState;
  setTools: React.Dispatch<React.SetStateAction<ToolState>>;
  sim: SimulationResult;
  boardContainerRef: React.RefObject<HTMLDivElement | null>;
  onUpdateJackCoords: (coords: InstrumentJackCoords) => void;
}

export const ToolFloatingPanel: React.FC<ToolFloatingPanelProps> = ({
  tools,
  setTools,
  sim,
  boardContainerRef,
  onUpdateJackCoords,
}) => {
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [holdValue, setHoldValue] = useState<{ display: string; unit: string } | null>(null);
  const [clampZero, setClampZero] = useState(false);
  const [clampHold, setClampHold] = useState<number | null>(null);
  const dragStartRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const redJackRef = useRef<HTMLDivElement | null>(null);
  const blackJackRef = useRef<HTMLDivElement | null>(null);
  const testClipRef = useRef<HTMLDivElement | null>(null);
  const testTipRef = useRef<HTMLDivElement | null>(null);

  const syncJacks = React.useCallback(() => {
    const container = boardContainerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const centerOf = (el: HTMLElement | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.left - cRect.left + r.width / 2,
        y: r.top - cRect.top + r.height / 2,
      };
    };

    onUpdateJackCoords({
      redJack: centerOf(redJackRef.current),
      blackJack: centerOf(blackJackRef.current),
      testClipOrigin: centerOf(testClipRef.current),
      testTipOrigin: centerOf(testTipRef.current),
    });
  }, [boardContainerRef, onUpdateJackCoords]);

  useEffect(() => {
    syncJacks();
    const id = window.requestAnimationFrame(syncJacks);
    window.addEventListener('resize', syncJacks);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('resize', syncJacks);
    };
  }, [syncJacks, tools.activeTool, offset]);

  // Clear HOLD when changing multimeter mode
  useEffect(() => {
    setHoldValue(null);
    setClampHold(null);
  }, [tools.multimeterMode, tools.activeTool]);

  if (
    tools.activeTool !== 'MULTIMETER' &&
    tools.activeTool !== 'TEST_LAMP' &&
    tools.activeTool !== 'CLAMP_METER'
  ) {
    return null;
  }

  const startDragHeader = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = {
      px: e.clientX,
      py: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };

  const moveDragHeader = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    e.stopPropagation();
    const dx = e.clientX - dragStartRef.current.px;
    const dy = e.clientY - dragStartRef.current.py;
    setOffset({
      x: dragStartRef.current.ox + dx,
      y: dragStartRef.current.oy + dy,
    });
  };

  const endDragHeader = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    e.stopPropagation();
    dragStartRef.current = null;
  };

  // ==================== TEST LAMP PANEL ====================
  if (tools.activeTool === 'TEST_LAMP') {
    const lit = sim.testLampBrightness > 0.05;
    const glowAlpha = Math.min(1, sim.testLampBrightness);

    return (
      <div
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-4 right-4 z-40 w-82 bg-slate-900/95 border-3 border-amber-500 rounded-3xl shadow-2xl p-3.5 text-slate-100 backdrop-blur-md"
      >
        {/* Draggable Header */}
        <div
          onPointerDown={startDragHeader}
          onPointerMove={moveDragHeader}
          onPointerUp={endDragHeader}
          className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2.5 cursor-grab active:cursor-grabbing"
        >
          <div>
            <div className="text-sm font-black text-amber-400 tracking-wide">
              ✥ 💡 TESPEN DC / AC (GESER PANEL)
            </div>
            <div className="text-[10px] text-slate-400">
              Kabel hijau ke Massa, sentuh soket dengan jarum tespen
            </div>
          </div>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setTools((t) => ({ ...t, activeTool: 'WIRE' }))}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Visual Test Pen Bulb */}
        <div className="flex items-center gap-3 bg-slate-950 rounded-2xl p-3 border border-slate-800 mb-2.5">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-75 shrink-0"
            style={{
              borderColor: lit ? '#fbbf24' : '#475569',
              backgroundColor: lit ? `rgba(251, 191, 36, ${0.35 + glowAlpha * 0.65})` : '#1e293b',
              boxShadow: lit ? `0 0 ${24 * glowAlpha}px rgba(251, 191, 36, 0.95)` : 'none',
            }}
          >
            <span className="text-xl">{lit ? '🔆' : '⚫'}</span>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400">Lampu Indikator Tespen:</div>
            <div className={`text-sm font-black ${lit ? 'text-amber-300' : 'text-slate-500'}`}>
              {lit
                ? sim.testLampBrightness > 1.15
                  ? 'MENYALA SANGAT TERANG!'
                  : sim.testLampBrightness < 0.7
                    ? 'MENYALA REDUP'
                    : 'MENYALA NORMAL (12V)'
                : 'MATI (TIDAK ADA ARUS)'}
            </div>
          </div>
        </div>

        {/* Probe Selection + Physical Cable Ports */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTools((t) => ({ ...t, testLampTargetNext: 'CLIP' }))}
            className={`p-2 rounded-2xl border-2 text-left transition cursor-pointer relative ${
              tools.testLampTargetNext === 'CLIP'
                ? 'bg-emerald-950/90 border-emerald-400 shadow-lg'
                : 'bg-slate-800/80 border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black text-emerald-400">1. JEPIT BUAYA (-)</span>
              <div
                ref={testClipRef}
                className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow"
              />
            </div>
            <div className="text-[11px] font-bold text-white truncate">
              {tools.testLampClipPin ? PIN_LABELS[tools.testLampClipPin] : 'Sentuh Massa...'}
            </div>
            <div className="text-[9px] text-emerald-300 mt-0.5">
              {tools.testLampTargetNext === 'CLIP' ? '👆 Sedang dipilih' : 'Klik untuk pindah'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTools((t) => ({ ...t, testLampTargetNext: 'TIP' }))}
            className={`p-2 rounded-2xl border-2 text-left transition cursor-pointer relative ${
              tools.testLampTargetNext === 'TIP'
                ? 'bg-amber-950/90 border-amber-400 shadow-lg'
                : 'bg-slate-800/80 border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black text-amber-400">2. JARUM TESPEN</span>
              <div
                ref={testTipRef}
                className="w-4 h-4 rounded-full bg-amber-400 border-2 border-white shadow"
              />
            </div>
            <div className="text-[11px] font-bold text-white truncate">
              {tools.testLampTipPin ? PIN_LABELS[tools.testLampTipPin] : 'Sentuh soket uji...'}
            </div>
            <div className="text-[9px] text-amber-300 mt-0.5">
              {tools.testLampTargetNext === 'TIP' ? '👆 Siap tusuk uji!' : 'Klik untuk pilih'}
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ==================== DC CLAMP METER (TANG AMPERE OTOMOTIF) ====================
  if (tools.activeTool === 'CLAMP_METER') {
    const rawAmps = sim.clampReading.currentAmps;
    const isHold = clampHold !== null;
    const displayVal = isHold ? clampHold : clampZero ? 0.0 : rawAmps;
    const mode = tools.clampMode || sim.clampReading.mode || 'DC';

    return (
      <div
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-4 right-4 z-40 w-84 bg-slate-900/95 border-3 border-amber-400 rounded-3xl shadow-2xl p-4 text-slate-100"
      >
        {/* Draggable Header */}
        <div
          onPointerDown={startDragHeader}
          onPointerMove={moveDragHeader}
          onPointerUp={endDragHeader}
          className="flex items-center justify-between border-b border-slate-700 pb-2 mb-3 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🧲</span>
            <div>
              <div className="text-sm font-black text-amber-400 tracking-wide">
                TANG AMPERE DC (CLAMP METER)
              </div>
              <div className="text-[10px] text-slate-400">
                Ukur Arus Beban & Pengisian Tanpa Lepas Kabel
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTools((t) => ({ ...t, activeTool: 'WIRE' }))}
            className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Realistic Digital LCD Screen */}
        <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-3 mb-3 shadow-inner relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400/80 mb-1">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 font-bold">
                {mode} A
              </span>
              <span>AUTO</span>
              {isHold && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black animate-pulse">
                  HOLD
                </span>
              )}
            </div>
            <span className="font-bold text-slate-400">HALL SENSOR</span>
          </div>

          <div className="flex items-baseline justify-end gap-1.5 my-1">
            <span className="text-4xl font-mono font-black text-emerald-300 tracking-wider">
              {displayVal.toFixed(2)}
            </span>
            <span className="text-lg font-mono font-black text-emerald-400">A</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-1 mt-1">
            <span>Range: 0.00 ~ 60.00 A</span>
            <span
              className={
                displayVal > 40
                  ? 'text-red-400 font-bold animate-pulse'
                  : displayVal > 2.0
                  ? 'text-emerald-400 font-bold'
                  : displayVal > 0.05
                  ? 'text-amber-400'
                  : 'text-slate-500'
              }
            >
              {displayVal > 40
                ? '⚡ ARUS CRANKING TINGGI!'
                : displayVal > 2.0
                ? '⚡ ARUS BEBAN AKTIF'
                : displayVal > 0.05
                ? '💡 ARUS KECIL / STANDBY'
                : 'STANDBY (0.00 A)'}
            </span>
          </div>
        </div>

        {/* Clamped Wire Status or Instruction */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 mb-3">
          {tools.clampWireId ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-semibold">Kabel Terjepit:</div>
                <div className="text-xs font-mono font-black text-yellow-300 truncate">
                  {sim.clampReading.activeWireLabel || tools.clampWireId}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTools((t) => ({ ...t, clampWireId: null }))}
                className="px-2 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-300 text-[10px] font-bold cursor-pointer shrink-0"
              >
                ✕ Lepas Clamp
              </button>
            </div>
          ) : (
            <div className="text-center py-1">
              <div className="text-xs font-black text-amber-300 animate-pulse">
                👉 Sentuh / Klik Kabel Jumper Mana Saja
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Rahang tang akan otomatis menjepit kabel yang Anda pilih
              </div>
            </div>
          )}
        </div>

        {/* Function Buttons: HOLD, ZERO, MODE */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setClampHold(isHold ? null : rawAmps)}
            className={`py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
              isHold
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isHold ? '🔓 UNHOLD' : '🔒 HOLD'}
          </button>

          <button
            type="button"
            onClick={() => setClampZero((z) => !z)}
            className={`py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
              clampZero
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {clampZero ? '✓ ZERO ON' : '⏚ ZERO / REL'}
          </button>

          <button
            type="button"
            onClick={() =>
              setTools((t) => ({
                ...t,
                clampMode: (t.clampMode || 'DC') === 'DC' ? 'AC' : 'DC',
              }))
            }
            className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-black transition cursor-pointer"
          >
            {mode === 'DC' ? '⚡ KE AC' : '🔋 KE DC'}
          </button>
        </div>
      </div>
    );
  }

  // ==================== DIGITAL MULTIMETER (AVO METER) ====================
  const modes: Array<{ id: MultimeterMode; label: string; sub: string }> = [
    { id: 'DCV', label: 'V⎓', sub: 'DC 20V' },
    { id: 'ACV', label: 'V~', sub: 'AC 200V' },
    { id: 'OHM', label: 'Ω / 🔊', sub: 'Hambatan' },
    { id: 'OFF', label: 'OFF', sub: 'Mati' },
  ];

  const shownDisplay = holdValue ? holdValue.display : sim.multimeterReading.display;
  const shownUnit = holdValue ? holdValue.unit : sim.multimeterReading.unit;

  const swapProbes = () => {
    setTools((t) => ({
      ...t,
      probeRedPin: t.probeBlackPin,
      probeBlackPin: t.probeRedPin,
    }));
  };

  return (
    <div
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute bottom-3 right-4 z-40 w-86 bg-gradient-to-b from-amber-500 via-amber-500 to-amber-600 p-1.5 rounded-[28px] shadow-2xl"
    >
      {/* Inner Dark Industrial Multimeter Body */}
      <div className="bg-slate-900 rounded-[22px] p-3 text-slate-100 border-2 border-slate-950">
        {/* Draggable Top Grip Bar */}
        <div
          onPointerDown={startDragHeader}
          onPointerMove={moveDragHeader}
          onPointerUp={endDragHeader}
          className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-amber-400 tracking-wider">
              ✥ AVO METER DIGITAL
            </span>
            <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold">
              Geser Posisi
            </span>
          </div>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setTools((t) => ({ ...t, activeTool: 'WIRE' }))}
            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-rose-700 text-xs font-black text-slate-200 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Backlit Digital LCD Screen */}
        <div className="bg-[#a8b892] text-slate-950 rounded-xl px-3.5 py-2.5 border-4 border-slate-950 shadow-inner mb-2 relative">
          <div className="flex items-center justify-between text-[10px] font-mono font-black opacity-75 mb-0.5">
            <span>MODE: {tools.multimeterMode}</span>
            <div className="flex items-center gap-1.5">
              {holdValue && (
                <span className="bg-slate-900 text-[#a8b892] px-1 rounded">HOLD</span>
              )}
              {sim.multimeterReading.buzzerBeep && (
                <span className="bg-slate-900 text-lime-300 px-1.5 rounded">🔊 BEEP</span>
              )}
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="font-mono text-4xl font-black tracking-wider leading-none">
              {shownDisplay}
            </div>
            <span className="font-mono text-sm font-extrabold">{shownUnit}</span>
          </div>
        </div>

        {sim.multimeterReading.warning && (
          <div className="mb-2 px-2.5 py-1 rounded-lg bg-red-950 border border-red-500 text-[10px] font-bold text-red-200">
            ⚠️ {sim.multimeterReading.warning}
          </div>
        )}

        {/* Utility Row: HOLD & Swap Polarity */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <button
            type="button"
            onClick={() =>
              setHoldValue((prev) =>
                prev
                  ? null
                  : { display: sim.multimeterReading.display, unit: sim.multimeterReading.unit }
              )
            }
            className={`py-1 rounded-lg text-[11px] font-black cursor-pointer border transition ${
              holdValue
                ? 'bg-sky-500 text-slate-950 border-white'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            ❄️ {holdValue ? 'HOLD AKTIF' : 'HOLD LAYAR'}
          </button>

          <button
            type="button"
            onClick={swapProbes}
            className="py-1 rounded-lg text-[11px] font-black bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
          >
            🔄 Tukar Probe (+/-)
          </button>
        </div>

        {/* Selector Dial Buttons */}
        <div className="grid grid-cols-4 gap-1.5 mb-2.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setTools((t) => ({ ...t, multimeterMode: m.id }))}
              className={`py-1.5 px-1 rounded-lg text-center transition cursor-pointer ${
                tools.multimeterMode === m.id
                  ? 'bg-amber-400 text-slate-950 shadow font-black'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 font-bold'
              }`}
            >
              <div className="text-xs leading-tight">{m.label}</div>
              <div className="text-[9px] opacity-80">{m.sub}</div>
            </button>
          ))}
        </div>

        {/* Physical Banana Input Jacks (COM Black on Left, +V/Ohm Red on Right!) */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
          {/* BLACK COM JACK */}
          <button
            type="button"
            onClick={() => setTools((t) => ({ ...t, probeTargetNext: 'BLACK' }))}
            className={`p-2 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
              tools.probeTargetNext === 'BLACK'
                ? 'bg-slate-800 border-white ring-2 ring-slate-300/50'
                : 'bg-slate-950 border-slate-800 opacity-85 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <div>
                <div className="text-[10px] font-black text-slate-200">⚫ COM (HITAM -)</div>
                <div className="text-[9px] text-slate-400">
                  {tools.probeTargetNext === 'BLACK' ? '👆 Sedang dipegang' : 'Klik untuk pindah'}
                </div>
              </div>
              {/* Physical Black Jack Port */}
              <div
                ref={blackJackRef}
                className="w-6 h-6 rounded-full bg-slate-950 border-4 border-slate-400 shadow-inner shrink-0"
              />
            </div>
            <div className="text-[11px] font-bold text-slate-200 truncate w-full bg-slate-900 px-1.5 py-0.5 rounded">
              {tools.probeBlackPin ? PIN_LABELS[tools.probeBlackPin] : 'Belum terpasang'}
            </div>
          </button>

          {/* RED V/OHM JACK */}
          <button
            type="button"
            onClick={() => setTools((t) => ({ ...t, probeTargetNext: 'RED' }))}
            className={`p-2 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
              tools.probeTargetNext === 'RED'
                ? 'bg-red-950/80 border-red-400 ring-2 ring-red-400/50'
                : 'bg-slate-950 border-slate-800 opacity-85 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <div>
                <div className="text-[10px] font-black text-red-400">🔴 VΩ (MERAH +)</div>
                <div className="text-[9px] text-red-200">
                  {tools.probeTargetNext === 'RED' ? '👆 Siap ukur soket!' : 'Klik untuk pilih'}
                </div>
              </div>
              {/* Physical Red Jack Port */}
              <div
                ref={redJackRef}
                className="w-6 h-6 rounded-full bg-slate-950 border-4 border-red-500 shadow-inner shrink-0"
              />
            </div>
            <div className="text-[11px] font-bold text-white truncate w-full bg-slate-900 px-1.5 py-0.5 rounded">
              {tools.probeRedPin ? PIN_LABELS[tools.probeRedPin] : 'Sentuh soket uji...'}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
