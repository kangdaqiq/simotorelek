import React from 'react';
import { PinId, ToolState } from '../types/circuit';

interface BananaSocketProps {
  pinId: PinId;
  label: string;
  subLabel?: string;
  ringColor?: string;
  selectedPin: PinId | null;
  focusedPin?: PinId | null;
  wireCount: number;
  tools: ToolState;
  onPinTap: (pinId: PinId, e: React.PointerEvent) => void;
  onFocusPin?: (pinId: PinId) => void;
  registerPinEl: (
    pinId: PinId,
    el: HTMLButtonElement | null,
    unmountedEl?: HTMLButtonElement | null
  ) => void;
  labelPos?: 'top' | 'bottom' | 'left' | 'right';
}

export const BananaSocket: React.FC<BananaSocketProps> = ({
  pinId,
  label,
  subLabel,
  ringColor = '#cbd5e1',
  selectedPin,
  focusedPin,
  wireCount,
  tools,
  onPinTap,
  onFocusPin,
  registerPinEl,
  labelPos = 'bottom',
}) => {
  const btnRef = React.useRef<HTMLButtonElement | null>(null);

  React.useLayoutEffect(() => {
    const el = btnRef.current;
    registerPinEl(pinId, el);
    return () => {
      registerPinEl(pinId, null, el);
    };
  }, [pinId, registerPinEl]);

  const isSelected = selectedPin === pinId;
  const isFocused = focusedPin === pinId;
  const hasRedProbe = tools.activeTool === 'MULTIMETER' && tools.probeRedPin === pinId;
  const hasBlackProbe = tools.activeTool === 'MULTIMETER' && tools.probeBlackPin === pinId;
  const hasClip = tools.activeTool === 'TEST_LAMP' && tools.testLampClipPin === pinId;
  const hasTip = tools.activeTool === 'TEST_LAMP' && tools.testLampTipPin === pinId;

  const layoutClass =
    labelPos === 'left'
      ? 'flex-row-reverse gap-1.5 items-center'
      : labelPos === 'right'
        ? 'flex-row gap-1.5 items-center'
        : labelPos === 'top'
          ? 'flex-col-reverse gap-0.5 items-center'
          : 'flex-col gap-0.5 items-center';

  return (
    <div className={`inline-flex ${layoutClass} relative group`}>
      <button
        ref={btnRef}
        type="button"
        onPointerDown={(e) => {
          e.stopPropagation();
          onPinTap(pinId, e);
        }}
        title={`${label} (${pinId})`}
        className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-md ${
          isSelected
            ? 'ring-4 ring-amber-400 scale-115 animate-pulse'
            : isFocused
              ? 'ring-4 ring-sky-400 scale-110'
              : 'hover:scale-110'
        }`}
        style={{
          backgroundColor: '#0f172a',
          border: `3.5px solid ${ringColor}`,
          boxShadow: isSelected
            ? '0 0 18px rgba(251, 191, 36, 0.9)'
            : 'inset 0 2px 5px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.5)',
        }}
      >
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center"
          style={{
            background:
              'radial-gradient(circle, #020617 38%, #d97706 46%, #f59e0b 75%, #78350f 100%)',
          }}
        />

        {wireCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-[9px] font-bold text-slate-950 flex items-center justify-center shadow">
            {wireCount}
          </span>
        )}

        {hasRedProbe && (
          <span className="absolute -bottom-2 -left-2 px-1 py-0.5 rounded bg-red-600 text-[8px] font-extrabold text-white shadow-lg border border-white">
            +V
          </span>
        )}
        {hasBlackProbe && (
          <span className="absolute -bottom-2 -right-2 px-1 py-0.5 rounded bg-slate-900 text-[8px] font-extrabold text-white shadow-lg border border-slate-300">
            COM
          </span>
        )}
        {hasClip && (
          <span className="absolute -bottom-2 -left-2 px-1 py-0.5 rounded bg-emerald-700 text-[8px] font-extrabold text-white shadow-lg border border-emerald-200">
            JEPIT
          </span>
        )}
        {hasTip && (
          <span className="absolute -bottom-2 -right-2 px-1 py-0.5 rounded bg-amber-500 text-[8px] font-extrabold text-slate-950 shadow-lg border border-white">
            TESPEN
          </span>
        )}
      </button>

      <div
        onPointerDown={
          wireCount > 0 && onFocusPin
            ? (e) => {
                e.stopPropagation();
                onFocusPin(pinId);
              }
            : undefined
        }
        title={wireCount > 0 ? `Klik label "${label}" untuk menyorot jalur kabelnya` : label}
        className={`socket-label-pill leading-tight transition ${
          wireCount > 0 ? 'pointer-events-auto cursor-pointer' : ''
        } ${
          isFocused ? 'ring-2 ring-sky-400 bg-sky-950/95' : ''
        } ${
          labelPos === 'left'
            ? 'text-right'
            : labelPos === 'right'
              ? 'text-left'
              : 'text-center'
        }`}
      >
        <div className="text-[10.5px] font-bold text-slate-100 tracking-tight whitespace-nowrap">
          {label}
        </div>
        {subLabel && (
          <div className="text-[8.5px] font-medium text-slate-300 whitespace-nowrap">
            {subLabel}
          </div>
        )}
      </div>
    </div>
  );
};
