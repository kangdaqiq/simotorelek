import React from 'react';
import { SimulationResult, ToolState } from '../types/circuit';
import { Point } from './WireOverlay';

export interface InstrumentJackCoords {
  redJack: Point | null;
  blackJack: Point | null;
  testClipOrigin: Point | null;
  testTipOrigin: Point | null;
}

interface InstrumentLeadsOverlayProps {
  tools: ToolState;
  pinCoords: Record<string, Point>;
  jackCoords: InstrumentJackCoords;
  sim: SimulationResult;
}

function buildLeadCurve(from: Point, to: Point, bowSide = 1): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const droop = Math.min(110, Math.max(35, dist * 0.22));
  // Smooth S-curve / natural silicone multimeter test lead drape
  const cx1 = from.x + dx * 0.2 + bowSide * 18;
  const cy1 = from.y + droop;
  const cx2 = from.x + dx * 0.72;
  const cy2 = to.y + Math.min(70, droop * 0.65);
  return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
}

export const InstrumentLeadsOverlay: React.FC<InstrumentLeadsOverlayProps> = ({
  tools,
  pinCoords,
  jackCoords,
  sim,
}) => {
  if (tools.activeTool !== 'MULTIMETER' && tools.activeTool !== 'TEST_LAMP') {
    return null;
  }

  if (tools.activeTool === 'MULTIMETER') {
    const redTarget = tools.probeRedPin ? pinCoords[tools.probeRedPin] : null;
    const blackTarget = tools.probeBlackPin ? pinCoords[tools.probeBlackPin] : null;

    // Probe tip handle offset (angled upwards-right / upwards-left so tip touches exact socket center)
    const renderProbeStick = (pt: Point, isRed: boolean, isSelectedNext: boolean) => {
      const angleDeg = isRed ? -32 : 32;
      const bodyColor = isRed ? '#ef4444' : '#1e293b';
      const accentColor = isRed ? '#fca5a5' : '#94a3b8';

      // Cable attaches to top tail of the probe handle!
      const rad = ((angleDeg - 90) * Math.PI) / 180;
      const tailX = pt.x + Math.cos(rad) * 54;
      const tailY = pt.y + Math.sin(rad) * 54;

      return {
        tail: { x: tailX, y: tailY },
        node: (
          <g transform={`translate(${pt.x}, ${pt.y}) rotate(${angleDeg})`}>
            {/* Glowing ring if this probe is currently selected in hand */}
            {isSelectedNext && (
              <circle
                cx={0}
                cy={0}
                r={15}
                fill="none"
                stroke={isRed ? '#f87171' : '#e2e8f0'}
                strokeWidth={2.5}
                strokeDasharray="4 3"
              />
            )}
            {/* Stainless needle tip */}
            <polygon points="-2.2,-14 2.2,-14 0,0" fill="#e2e8f0" stroke="#0f172a" strokeWidth={0.8} />
            {/* Protective finger guard collar */}
            <rect x={-7} y={-18} width={14} height={4.5} rx={2} fill={bodyColor} stroke="#ffffff" strokeWidth={1} />
            {/* Insulated ergonomic probe handle */}
            <rect
              x={-5}
              y={-54}
              width={10}
              height={36}
              rx={4}
              fill={bodyColor}
              stroke="#020617"
              strokeWidth={1.5}
            />
            {/* Grip ribs */}
            <line x1={-3} y1={-26} x2={3} y2={-26} stroke={accentColor} strokeWidth={1.3} />
            <line x1={-3} y1={-31} x2={3} y2={-31} stroke={accentColor} strokeWidth={1.3} />
            <line x1={-3} y1={-36} x2={3} y2={-36} stroke={accentColor} strokeWidth={1.3} />
            {/* + / - label on probe body */}
            <text
              x={0}
              y={-42}
              textAnchor="middle"
              fill="#ffffff"
              fontSize={9}
              fontWeight="bold"
            >
              {isRed ? '+' : '-'}
            </text>
          </g>
        ),
      };
    };

    const blackStick = blackTarget
      ? renderProbeStick(blackTarget, false, tools.probeTargetNext === 'BLACK')
      : null;
    const redStick = redTarget
      ? renderProbeStick(redTarget, true, tools.probeTargetNext === 'RED')
      : null;

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-45 overflow-visible">
        <defs>
          <filter id="probeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.75" />
          </filter>
        </defs>

        {/* BLACK COM TEST LEAD */}
        {jackCoords.blackJack && blackStick && (
          <g filter="url(#probeShadow)">
            <path
              d={buildLeadCurve(jackCoords.blackJack, blackStick.tail, -1)}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth={7.5}
              strokeLinecap="round"
              opacity={0.35}
            />
            <path
              d={buildLeadCurve(jackCoords.blackJack, blackStick.tail, -1)}
              fill="none"
              stroke="#1e293b"
              strokeWidth={5.5}
              strokeLinecap="round"
            />
            <circle
              cx={jackCoords.blackJack.x}
              cy={jackCoords.blackJack.y}
              r={6}
              fill="#0f172a"
              stroke="#94a3b8"
              strokeWidth={2}
            />
            {blackStick.node}
          </g>
        )}

        {/* RED (+) V/OHM TEST LEAD */}
        {jackCoords.redJack && redStick && (
          <g filter="url(#probeShadow)">
            <path
              d={buildLeadCurve(jackCoords.redJack, redStick.tail, 1)}
              fill="none"
              stroke="#020617"
              strokeWidth={8}
              strokeLinecap="round"
            />
            <path
              d={buildLeadCurve(jackCoords.redJack, redStick.tail, 1)}
              fill="none"
              stroke="#ef4444"
              strokeWidth={5.5}
              strokeLinecap="round"
            />
            <circle
              cx={jackCoords.redJack.x}
              cy={jackCoords.redJack.y}
              r={6}
              fill="#dc2626"
              stroke="#fecaca"
              strokeWidth={2}
            />
            {redStick.node}
          </g>
        )}
      </svg>
    );
  }

  // ==================== TEST LAMP (TESPEN DC/AC) LEADS & PROBE ====================
  const clipTarget = tools.testLampClipPin ? pinCoords[tools.testLampClipPin] : null;
  const tipTarget = tools.testLampTipPin ? pinCoords[tools.testLampTipPin] : null;
  const lit = sim.testLampBrightness > 0.05;
  const glow = Math.min(1, sim.testLampBrightness);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-45 overflow-visible">
      <defs>
        <filter id="tespenShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.75" />
        </filter>
      </defs>

      {/* ALLIGATOR CLIP GROUND WIRE */}
      {jackCoords.testClipOrigin && clipTarget && (
        <g filter="url(#tespenShadow)">
          <path
            d={buildLeadCurve(jackCoords.testClipOrigin, clipTarget, -1)}
            fill="none"
            stroke="#020617"
            strokeWidth={7.5}
            strokeLinecap="round"
          />
          <path
            d={buildLeadCurve(jackCoords.testClipOrigin, clipTarget, -1)}
            fill="none"
            stroke="#10b981"
            strokeWidth={4.8}
            strokeLinecap="round"
          />
          {/* Alligator Clip Icon at target socket */}
          <g transform={`translate(${clipTarget.x}, ${clipTarget.y}) rotate(35)`}>
            <polygon points="-5,-26 5,-26 3,-2 -3,-2" fill="#059669" stroke="#ffffff" strokeWidth={1.2} />
            <polygon points="-3,-2 3,-2 1.5,0 -1.5,0" fill="#cbd5e1" />
          </g>
        </g>
      )}

      {/* BRASS / TRANSPARENT GLOWING TEST PEN PROBE */}
      {jackCoords.testTipOrigin && tipTarget && (
        <g filter="url(#tespenShadow)">
          <path
            d={buildLeadCurve(
              jackCoords.testTipOrigin,
              { x: tipTarget.x + 26, y: tipTarget.y - 48 },
              1
            )}
            fill="none"
            stroke="#020617"
            strokeWidth={7.5}
            strokeLinecap="round"
          />
          <path
            d={buildLeadCurve(
              jackCoords.testTipOrigin,
              { x: tipTarget.x + 26, y: tipTarget.y - 48 },
              1
            )}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={4.8}
            strokeLinecap="round"
          />

          <g transform={`translate(${tipTarget.x}, ${tipTarget.y}) rotate(28)`}>
            {/* Glow aura when Test Lamp lights up right at the socket! */}
            {lit && (
              <circle
                cx={0}
                cy={-34}
                r={22}
                fill={`rgba(251, 191, 36, ${0.45 * glow})`}
              />
            )}
            {/* Sharp steel probe needle */}
            <polygon points="-2,-15 2,-15 0,0" fill="#f8fafc" stroke="#0f172a" strokeWidth={0.8} />
            {/* Brass ferrule */}
            <rect x={-6} y={-21} width={12} height={6} rx={1.5} fill="#d97706" stroke="#fef3c7" strokeWidth={0.8} />
            {/* Clear acrylic handle with glowing festoon bulb inside! */}
            <rect
              x={-6}
              y={-56}
              width={12}
              height={35}
              rx={5}
              fill={lit ? '#fef08a' : 'rgba(30, 41, 59, 0.92)'}
              stroke={lit ? '#f59e0b' : '#94a3b8'}
              strokeWidth={1.8}
            />
            <circle
              cx={0}
              cy={-38}
              r={3.5}
              fill={lit ? '#ffffff' : '#64748b'}
            />
          </g>
        </g>
      )}
    </svg>
  );
};
