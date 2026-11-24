import React from 'react';
import { WIRE_COLORS } from '../data/wireStandards';
import { PinId, ToolState, Wire, WireColorId, WireFlowState } from '../types/circuit';

export interface Point {
  x: number;
  y: number;
}

export type WireRoutingStyle = 'TRUNKING' | 'CURVED';
export type WireVisibilityMode = 'FULL' | 'GHOST' | 'HIDDEN';

const CHASSIS_GND_PINS = new Set<PinId>(['GND_1', 'GND_2', 'GND_3', 'GND_4']);

interface WireOverlayProps {
  wires: Wire[];
  pinCoords: Record<string, Point>;
  boardSize: { width: number; height: number };
  wireFlows: Record<string, WireFlowState>;
  selectedWireId: string | null;
  focusedPin: PinId | null;
  onSelectWire: (wireId: string | null) => void;
  onDeleteWire: (wireId: string) => void;
  activeTool: ToolState['activeTool'];
  pendingFromPin: PinId | null;
  pointerPos: Point | null;
  activeWireColor: WireColorId;
  wireVisibility: WireVisibilityMode;
  wireStyle: WireRoutingStyle;
  compactGround: boolean;
  showCurrentFlow: boolean;
}

function buildCurvedCablePath(p1: Point, p2: Point): { d: string; mid: Point } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  const sag = Math.min(70, Math.max(20, dist * 0.15));
  const cx1 = p1.x + dx * 0.25;
  const cy1 = p1.y + dy * 0.25 + sag;
  const cx2 = p1.x + dx * 0.75;
  const cy2 = p1.y + dy * 0.75 + sag;

  const mx = 0.125 * p1.x + 0.375 * cx1 + 0.375 * cx2 + 0.125 * p2.x;
  const my = 0.125 * p1.y + 0.375 * cy1 + 0.375 * cy2 + 0.125 * p2.y;

  return {
    d: `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`,
    mid: { x: mx, y: my },
  };
}

function roundedOrthoPolyline(pts: Point[], radius = 9): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const len1 = Math.hypot(v1x, v1y);

    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len2 = Math.hypot(v2x, v2y);

    if (len1 < 2 || len2 < 2) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const r = Math.min(radius, len1 * 0.45, len2 * 0.45);
    const inX = curr.x - (v1x / len1) * r;
    const inY = curr.y - (v1y / len1) * r;
    const outX = curr.x + (v2x / len2) * r;
    const outY = curr.y + (v2y / len2) * r;

    d += ` L ${inX} ${inY} Q ${curr.x} ${curr.y} ${outX} ${outY}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function buildTrunkingPath(
  p1: Point,
  p2: Point,
  wireIdx: number,
  boardW: number,
  boardH: number
): { d: string; mid: Point } {
  const w = Math.max(800, boardW);
  const h = Math.max(500, boardH);

  // Spread parallel wires neatly across 7 lanes (-12px .. +12px)
  const lane = ((wireIdx % 7) - 3) * 4;
  const stubDrop = 26 + ((wireIdx % 5) - 2) * 3.5;

  const col1 = Math.min(3, Math.max(0, Math.floor((p1.x / w) * 4)));
  const col2 = Math.min(3, Math.max(0, Math.floor((p2.x / w) * 4)));

  // Short same-panel connection: clean U-channel right below sockets
  if (col1 === col2 && Math.abs(p1.y - p2.y) < 75) {
    const yChannel = Math.min(h - 10, Math.max(p1.y, p2.y) + stubDrop);
    const pts: Point[] = [
      p1,
      { x: p1.x, y: yChannel },
      { x: p2.x, y: yChannel },
      p2,
    ];
    return {
      d: roundedOrthoPolyline(pts),
      mid: { x: (p1.x + p2.x) / 2, y: yChannel },
    };
  }

  // Vertical gutters lie cleanly in the gaps between the 4 columns (25%, 50%, 75% of board width!)
  const gutters = [w * 0.25, w * 0.5, w * 0.75];

  let gutterX: number;
  if (col1 === col2) {
    // Pick nearest column boundary gutter
    if (col1 === 0) gutterX = gutters[0] + lane;
    else if (col1 === 3) gutterX = gutters[2] + lane;
    else {
      const leftG = gutters[col1 - 1];
      const rightG = gutters[col1];
      gutterX = (Math.abs(p1.x - leftG) < Math.abs(p1.x - rightG) ? leftG : rightG) + lane;
    }
  } else {
    // Pick gutter adjacent to destination or between columns
    const minC = Math.min(col1, col2);
    const maxC = Math.max(col1, col2);
    const gIdx = col1 < col2 ? maxC - 1 : minC;
    gutterX = gutters[Math.min(2, Math.max(0, gIdx))] + lane;
  }

  const y1 = Math.min(h - 12, p1.y + stubDrop);
  const y2 = Math.min(h - 12, p2.y + stubDrop);

  const pts: Point[] = [
    p1,
    { x: p1.x, y: y1 },
    { x: gutterX, y: y1 },
    { x: gutterX, y: y2 },
    { x: p2.x, y: y2 },
    p2,
  ];

  return {
    d: roundedOrthoPolyline(pts),
    mid: { x: gutterX, y: (y1 + y2) / 2 },
  };
}

export const WireOverlay: React.FC<WireOverlayProps> = ({
  wires,
  pinCoords,
  boardSize,
  wireFlows,
  selectedWireId,
  focusedPin,
  onSelectWire,
  onDeleteWire,
  activeTool,
  pendingFromPin,
  pointerPos,
  activeWireColor,
  wireVisibility,
  wireStyle,
  compactGround,
  showCurrentFlow,
}) => {
  const colorMap = React.useMemo(() => {
    const m = new Map<WireColorId, (typeof WIRE_COLORS)[number]>();
    for (const c of WIRE_COLORS) m.set(c.id, c);
    return m;
  }, []);

  // Build connected-net highlight set strictly by CLICK (tapped wire, tapped socket label, or active pending pin)
  const highlightedWireIds = React.useMemo(() => {
    const activePin = pendingFromPin || focusedPin;
    if (!activePin && !selectedWireId) return null;

    const adj = new Map<PinId, Array<{ to: PinId; id: string }>>();
    for (const w of wires) {
      if (!adj.has(w.from)) adj.set(w.from, []);
      if (!adj.has(w.to)) adj.set(w.to, []);
      adj.get(w.from)!.push({ to: w.to, id: w.id });
      adj.get(w.to)!.push({ to: w.from, id: w.id });
    }

    const activeSet = new Set<string>();
    const startPins: PinId[] = [];

    if (selectedWireId) {
      activeSet.add(selectedWireId);
      const sw = wires.find((w) => w.id === selectedWireId);
      if (sw) {
        if (!CHASSIS_GND_PINS.has(sw.from)) startPins.push(sw.from);
        if (!CHASSIS_GND_PINS.has(sw.to)) startPins.push(sw.to);
      }
    }
    if (activePin) {
      startPins.push(activePin);
    }

    // Traverse connected net (stopping at GND bus unless GND itself was clicked so GND doesn't highlight the entire bike!)
    const visited = new Set<PinId>(startPins);
    const q = [...startPins];
    while (q.length > 0) {
      const u = q.shift()!;
      for (const edge of adj.get(u) || []) {
        activeSet.add(edge.id);
        if (
          !visited.has(edge.to) &&
          (!CHASSIS_GND_PINS.has(edge.to) || (activePin !== null && CHASSIS_GND_PINS.has(activePin)))
        ) {
          visited.add(edge.to);
          q.push(edge.to);
        }
      }
    }
    return activeSet;
  }, [wires, pendingFromPin, focusedPin, selectedWireId]);

  // Bring highlighted/selected wires to the front (top z-order in SVG) when Smart Focus is active!
  const orderedWires = React.useMemo(() => {
    const indexed = wires.map((w, idx) => ({ w, idx }));
    if (!highlightedWireIds) return indexed;
    return indexed.sort((a, b) => {
      const aScore = a.w.id === selectedWireId ? 2 : highlightedWireIds.has(a.w.id) ? 1 : 0;
      const bScore = b.w.id === selectedWireId ? 2 : highlightedWireIds.has(b.w.id) ? 1 : 0;
      return aScore - bScore;
    });
  }, [wires, highlightedWireIds, selectedWireId]);

  if (wireVisibility === 'HIDDEN') return null;

  const activeColorDef = colorMap.get(activeWireColor) || WIRE_COLORS[0];
  const pendingStart = pendingFromPin ? pinCoords[pendingFromPin] : null;
  const isGhost = wireVisibility === 'GHOST';
  const wireInteractive =
    !isGhost && (activeTool === 'WIRE' || activeTool === 'DELETE_WIRE');

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
      <defs>
        <filter id="wireShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.6" />
        </filter>
      </defs>

      {orderedWires.map(({ w, idx }) => {
        const p1 = pinCoords[w.from];
        const p2 = pinCoords[w.to];
        if (!p1 || !p2) return null;

        const cDef = colorMap.get(w.color) || WIRE_COLORS[0];
        const flow = wireFlows[w.id];
        const isSelected = selectedWireId === w.id;
        const isFlowing = showCurrentFlow && flow && flow.mode !== 'NONE' && flow.intensity > 0.05;

        const isHighlighted = highlightedWireIds ? highlightedWireIds.has(w.id) : true;
        const wireOpacity = isGhost
          ? 0.24
          : highlightedWireIds
            ? isHighlighted
              ? 1.0
              : 0.15
            : 0.88;

        // Check Compact Chassis Ground rendering (Solusi 4: Ringkas Kabel Massa!)
        const fromIsGnd = CHASSIS_GND_PINS.has(w.from);
        const toIsGnd = CHASSIS_GND_PINS.has(w.to);
        if (compactGround && (fromIsGnd !== toIsGnd) && !isSelected) {
          const loadPt = fromIsGnd ? p2 : p1;
          const stubY = loadPt.y + 30;
          return (
            <g
              key={w.id}
              opacity={wireOpacity}
              className={wireInteractive ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (activeTool === 'DELETE_WIRE') {
                  onDeleteWire(w.id);
                } else {
                  onSelectWire(w.id);
                }
              }}
            >
              {/* Short neat local ground stub + standard automotive ⏚ symbol */}
              <line
                x1={loadPt.x}
                y1={loadPt.y}
                x2={loadPt.x}
                y2={stubY}
                stroke={cDef.primaryHex}
                strokeWidth={4}
                strokeLinecap="round"
              />
              <circle
                cx={loadPt.x}
                cy={stubY + 7}
                r={9}
                fill="#052e16"
                stroke="#22c55e"
                strokeWidth={1.8}
              />
              <text
                x={loadPt.x}
                y={stubY + 11}
                textAnchor="middle"
                fill="#4ade80"
                fontSize={11}
                fontWeight="bold"
              >
                ⏚
              </text>
            </g>
          );
        }

        const { d, mid } =
          wireStyle === 'TRUNKING'
            ? buildTrunkingPath(p1, p2, idx, boardSize.width, boardSize.height)
            : buildCurvedCablePath(p1, p2);

        return (
          <g
            key={w.id}
            opacity={wireOpacity}
            className={wireInteractive ? 'pointer-events-auto' : 'pointer-events-none'}
          >
            {/* Touch hit path */}
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={18}
              strokeLinecap="round"
              className="cursor-pointer"
              onPointerDown={(e) => {
                e.stopPropagation();
                if (activeTool === 'DELETE_WIRE') {
                  onDeleteWire(w.id);
                } else {
                  onSelectWire(isSelected ? null : w.id);
                }
              }}
            />

            {/* Outer dark jacket */}
            <path
              d={d}
              fill="none"
              stroke={isSelected ? '#fbbf24' : '#020617'}
              strokeWidth={isSelected ? 8.5 : 6}
              strokeLinecap="round"
              filter="url(#wireShadow)"
              className="pointer-events-none"
            />

            {/* Main insulated wire color */}
            <path
              d={d}
              fill="none"
              stroke={cDef.primaryHex}
              strokeWidth={isSelected ? 5 : 3.8}
              strokeLinecap="round"
              className="pointer-events-none"
            />

            {/* Dual-color stripe */}
            {cDef.stripeHex && (
              <path
                d={d}
                fill="none"
                stroke={cDef.stripeHex}
                strokeWidth={2.4}
                strokeDasharray="7 9"
                strokeLinecap="butt"
                className="pointer-events-none"
              />
            )}

            {/* Animated Electrical Current Flow */}
            {isFlowing && (
              <path
                d={d}
                fill="none"
                stroke={
                  flow.mode === 'HV'
                    ? '#e879f9'
                    : flow.mode === 'AC'
                      ? '#fde047'
                      : '#38bdf8'
                }
                strokeWidth={flow.mode === 'HV' ? 3.8 : 2.8}
                strokeDasharray={flow.mode === 'HV' ? '4 14' : '6 22'}
                strokeLinecap="round"
                className={`pointer-events-none ${
                  flow.mode === 'AC' || flow.mode === 'HV' ? 'wire-flow-ac' : 'wire-flow-dc'
                }`}
              />
            )}

            {/* Midpoint quick-remove button when wire is tapped */}
            {isSelected && (
              <g
                transform={`translate(${mid.x}, ${mid.y})`}
                className="cursor-pointer"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onDeleteWire(w.id);
                }}
              >
                <rect
                  x={-48}
                  y={-16}
                  width={96}
                  height={32}
                  rx={16}
                  fill="#dc2626"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={12}
                  fontWeight="bold"
                >
                  ✕ Lepas Kabel
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Live rubber-band cable preview while connecting */}
      {pendingStart && pointerPos && (
        <path
          d={
            wireStyle === 'TRUNKING'
              ? buildTrunkingPath(
                  pendingStart,
                  pointerPos,
                  wires.length,
                  boardSize.width,
                  boardSize.height
                ).d
              : buildCurvedCablePath(pendingStart, pointerPos).d
          }
          fill="none"
          stroke={activeColorDef.primaryHex}
          strokeWidth={4.5}
          strokeDasharray="8 6"
          strokeLinecap="round"
          opacity={0.9}
        />
      )}
    </svg>
  );
};
