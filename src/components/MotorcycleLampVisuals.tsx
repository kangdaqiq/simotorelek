import React from 'react';
import { ComponentHealth, SimulationResult } from '../types/circuit';

interface HeadlampVisualProps {
  loads: SimulationResult['loads'];
  health: ComponentHealth;
}

export const HeadlampAssemblyVisual: React.FC<HeadlampVisualProps> = ({ loads, health }) => {
  const lo = Math.min(1, Math.max(0, loads.headLo));
  const hi = Math.min(1, Math.max(0, loads.headHi));
  const senja = Math.min(1, Math.max(0, loads.senjaFront));
  const turnL = Math.min(1, Math.max(0, loads.turnFrontL));
  const turnR = Math.min(1, Math.max(0, loads.turnFrontR));

  const loOn = lo > 0.05 && !health.headLoBlown;
  const hiOn = hi > 0.05 && !health.headHiBlown;
  const senjaOn = senja > 0.05 && !health.senjaFrontBlown;
  const turnLOn = turnL > 0.05;
  const turnROn = turnR > 0.05;
  const anyBlown = health.headLoBlown || health.headHiBlown || health.senjaFrontBlown;

  const statusText = anyBlown
    ? health.faultGroundHeadBroken
      ? '⚠️ FITTING MASSA PUTUS'
      : '💥 FILAMEN BOHLAM PUTUS!'
    : hiOn && loOn
      ? `HI + LO (${Math.round(Math.max(hi, lo) * 100)}%)`
      : hiOn
        ? `JAUH / HI (${Math.round(hi * 100)}%)`
        : loOn
          ? `DEKAT / LO (${Math.round(lo * 100)}%)`
          : senjaOn
            ? `SENJA ON (${Math.round(senja * 100)}%)`
            : 'LAMPU OFF';

  return (
    <div className="relative w-full h-full min-h-[175px] rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden px-2 py-1">
      {/* Ambient Road / Fairing Glow Behind Headlamp */}
      {(loOn || hiOn || senjaOn || turnLOn || turnROn) && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-75"
          style={{
            background: [
              loOn || hiOn
                ? `radial-gradient(circle at 50% 54%, rgba(254, 240, 138, ${
                    Math.max(lo, hi) * 0.42
                  }), transparent 66%)`
                : '',
              turnLOn
                ? `radial-gradient(circle at 16% 42%, rgba(249, 115, 22, ${
                    turnL * 0.45
                  }), transparent 45%)`
                : '',
              turnROn
                ? `radial-gradient(circle at 84% 42%, rgba(249, 115, 22, ${
                    turnR * 0.45
                  }), transparent 45%)`
                : '',
            ]
              .filter(Boolean)
              .join(', '),
          }}
        />
      )}

      <svg
        viewBox="0 0 360 230"
        className="w-full h-full max-h-[225px] select-none pointer-events-none drop-shadow-xl"
      >
        <defs>
          <linearGradient id="cowlBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="45%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="visorDark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="chromeRim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <radialGradient id="reflectorChrome" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="65%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#090d16" />
          </radialGradient>
          <radialGradient id="beamLoGrad" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#fef08a" />
            <stop offset="80%" stopColor="#facc15" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="beamHiGrad" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#e0f2fe" />
            <stop offset="78%" stopColor="#fde047" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
          </radialGradient>
          <filter id="lampBloom" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Handlebar Mirror Stalk Hints & Top Smoked Visor */}
        <path
          d="M 118 28 Q 180 6 242 28 L 230 56 Q 180 44 130 56 Z"
          fill="url(#visorDark)"
          stroke="#475569"
          strokeWidth="1.5"
        />
        <path
          d="M 136 26 Q 180 14 224 26"
          fill="none"
          stroke="#64748b"
          strokeWidth="1.2"
          opacity="0.6"
        />

        {/* Outer Batok / Front Fairing Shield Silhouette */}
        <path
          d="M 26 62 Q 68 32 124 38 L 180 46 L 236 38 Q 292 32 334 62 Q 344 108 308 156 L 246 196 Q 180 216 114 196 L 52 156 Q 16 108 26 62 Z"
          fill="url(#cowlBody)"
          stroke="#475569"
          strokeWidth="2.2"
        />

        {/* Inner Fairing Crease Lines */}
        <path
          d="M 46 68 L 106 178 M 314 68 L 254 178"
          stroke="#0f172a"
          strokeWidth="2.5"
          opacity="0.7"
        />

        {/* ==================== LEFT WING TURN SIGNAL (SEIN KIRI L) ==================== */}
        <g filter={turnLOn ? 'url(#lampBloom)' : undefined}>
          <path
            d="M 38 68 Q 74 48 104 60 L 95 128 Q 64 132 42 106 Z"
            fill={turnLOn ? `rgba(249, 115, 22, ${0.45 + turnL * 0.55})` : '#291d12'}
            stroke={turnLOn ? '#fed7aa' : '#78350f'}
            strokeWidth={turnLOn ? 2.4 : 1.6}
          />
          {/* Honeycomb Prism Ribs */}
          <path
            d="M 48 80 L 96 76 M 46 94 L 94 94 M 50 108 L 92 112"
            stroke={turnLOn ? '#ffedd5' : '#9a3412'}
            strokeWidth="1.1"
            opacity={turnLOn ? 0.85 : 0.45}
          />
          {/* Turn Bulb Core */}
          <circle
            cx="72"
            cy="92"
            r={turnLOn ? 11 : 7}
            fill={turnLOn ? '#fff7ed' : '#431407'}
            opacity={turnLOn ? Math.min(1, 0.5 + turnL * 0.5) : 0.8}
          />
        </g>
        <text
          x="67"
          y="144"
          textAnchor="middle"
          fill={turnLOn ? '#fdba74' : '#94a3b8'}
          fontSize="10"
          fontWeight="900"
        >
          ◀ SEIN L
        </text>

        {/* ==================== RIGHT WING TURN SIGNAL (SEIN KANAN R) ==================== */}
        <g filter={turnROn ? 'url(#lampBloom)' : undefined}>
          <path
            d="M 322 68 Q 286 48 256 60 L 265 128 Q 296 132 318 106 Z"
            fill={turnROn ? `rgba(249, 115, 22, ${0.45 + turnR * 0.55})` : '#291d12'}
            stroke={turnROn ? '#fed7aa' : '#78350f'}
            strokeWidth={turnROn ? 2.4 : 1.6}
          />
          {/* Honeycomb Prism Ribs */}
          <path
            d="M 312 80 L 264 76 M 314 94 L 266 94 M 310 108 L 268 112"
            stroke={turnROn ? '#ffedd5' : '#9a3412'}
            strokeWidth="1.1"
            opacity={turnROn ? 0.85 : 0.45}
          />
          {/* Turn Bulb Core */}
          <circle
            cx="288"
            cy="92"
            r={turnROn ? 11 : 7}
            fill={turnROn ? '#fff7ed' : '#431407'}
            opacity={turnROn ? Math.min(1, 0.5 + turnR * 0.5) : 0.8}
          />
        </g>
        <text
          x="293"
          y="144"
          textAnchor="middle"
          fill={turnROn ? '#fdba74' : '#94a3b8'}
          fontSize="10"
          fontWeight="900"
        >
          SEIN R ▶
        </text>

        {/* ==================== CENTER MULTI-REFLECTOR HEADLAMP SHIELD ==================== */}
        {/* Outer Chrome Bezel */}
        <path
          d="M 114 54 Q 180 42 246 54 L 256 132 Q 238 176 180 190 Q 122 176 104 132 Z"
          fill="url(#reflectorChrome)"
          stroke={anyBlown ? '#ef4444' : 'url(#chromeRim)'}
          strokeWidth="3.2"
        />

        {/* V-Shaped Position / DRL Eyebrows (LAMPU SENJA DEPAN) */}
        <g filter={senjaOn ? 'url(#lampBloom)' : undefined}>
          <path
            d="M 118 59 L 172 68 L 166 77 L 114 70 Z"
            fill={senjaOn ? `rgba(253, 230, 138, ${0.5 + senja * 0.5})` : '#1e293b'}
            stroke={senjaOn ? '#ffffff' : '#475569'}
            strokeWidth="1.2"
          />
          <path
            d="M 242 59 L 188 68 L 194 77 L 246 70 Z"
            fill={senjaOn ? `rgba(253, 230, 138, ${0.5 + senja * 0.5})` : '#1e293b'}
            stroke={senjaOn ? '#ffffff' : '#475569'}
            strokeWidth="1.2"
          />
        </g>

        {/* Reflector Facet Lines */}
        <path
          d="M 112 104 L 248 104 M 145 74 L 132 162 M 215 74 L 228 162 M 180 72 L 180 184"
          stroke="#64748b"
          strokeWidth="1"
          opacity="0.35"
        />

        {/* UPPER CHAMBER: LOW BEAM (LAMPU DEKAT / LO) */}
        <g filter={loOn ? 'url(#lampBloom)' : undefined}>
          <path
            d="M 116 76 Q 180 82 244 76 L 248 124 Q 180 130 112 124 Z"
            fill={loOn ? 'url(#beamLoGrad)' : 'rgba(15, 23, 42, 0.45)'}
            opacity={loOn ? Math.min(1, 0.35 + lo * 0.65) : 1}
          />
          {/* H4 Bulb Shield Cap (LO) */}
          <ellipse
            cx="180"
            cy="101"
            rx={loOn ? 22 : 12}
            ry={loOn ? 15 : 9}
            fill={health.headLoBlown ? '#450a0a' : loOn ? '#ffffff' : '#334155'}
            stroke={health.headLoBlown ? '#ef4444' : '#94a3b8'}
            strokeWidth="1.5"
          />
          <text
            x="180"
            y="104"
            textAnchor="middle"
            fill={loOn ? '#0f172a' : health.headLoBlown ? '#fca5a5' : '#cbd5e1'}
            fontSize="8.5"
            fontWeight="900"
          >
            {health.headLoBlown ? 'PUTUS' : 'LO'}
          </text>
        </g>

        {/* Horizontal Chrome Divider Bar */}
        <path d="M 109 125 Q 180 132 251 125" stroke="#94a3b8" strokeWidth="2.5" fill="none" />

        {/* LOWER CHAMBER: HIGH BEAM (LAMPU JAUH / HI) */}
        <g filter={hiOn ? 'url(#lampBloom)' : undefined}>
          <path
            d="M 112 127 Q 180 133 248 127 Q 233 172 180 185 Q 127 172 112 127 Z"
            fill={hiOn ? 'url(#beamHiGrad)' : 'rgba(15, 23, 42, 0.55)'}
            opacity={hiOn ? Math.min(1, 0.4 + hi * 0.6) : 1}
          />
          {/* High Beam Projection Rays when HI is ON */}
          {hiOn && (
            <g stroke="#ffffff" strokeWidth="1.6" opacity={0.55 * hi}>
              <line x1="180" y1="152" x2="128" y2="142" />
              <line x1="180" y1="152" x2="232" y2="142" />
              <line x1="180" y1="152" x2="145" y2="174" />
              <line x1="180" y1="152" x2="215" y2="174" />
            </g>
          )}
          <ellipse
            cx="180"
            cy="153"
            rx={hiOn ? 24 : 11}
            ry={hiOn ? 15 : 8}
            fill={health.headHiBlown ? '#450a0a' : hiOn ? '#ffffff' : '#334155'}
            stroke={health.headHiBlown ? '#ef4444' : '#94a3b8'}
            strokeWidth="1.5"
          />
          <text
            x="180"
            y="156"
            textAnchor="middle"
            fill={hiOn ? '#0f172a' : health.headHiBlown ? '#fca5a5' : '#cbd5e1'}
            fontSize="8.5"
            fontWeight="900"
          >
            {health.headHiBlown ? 'PUTUS' : 'HI'}
          </text>
        </g>

        {/* Bottom Chin Status Pill */}
        <rect
          x="112"
          y="202"
          width="136"
          height="20"
          rx="10"
          fill={anyBlown ? '#7f1d1d' : loOn || hiOn ? '#fef08a' : senjaOn ? '#fde68a' : '#0f172a'}
          stroke={anyBlown ? '#f87171' : '#475569'}
          strokeWidth="1.4"
        />
        <text
          x="180"
          y="215.5"
          textAnchor="middle"
          fill={anyBlown ? '#ffffff' : loOn || hiOn || senjaOn ? '#0f172a' : '#94a3b8'}
          fontSize="9.5"
          fontWeight="900"
        >
          {statusText}
        </text>
      </svg>
    </div>
  );
};

interface TaillampVisualProps {
  loads: SimulationResult['loads'];
  health: ComponentHealth;
}

export const TaillampAssemblyVisual: React.FC<TaillampVisualProps> = ({ loads, health }) => {
  const kota = Math.min(1, Math.max(0, loads.tailSenja));
  const stop = Math.min(1, Math.max(0, loads.tailStop));
  const turnL = Math.min(1, Math.max(0, loads.turnRearL));
  const turnR = Math.min(1, Math.max(0, loads.turnRearR));

  const kotaOn = kota > 0.05 && !health.tailSenjaBlown;
  const stopOn = stop > 0.05 && !health.tailStopBlown;
  const turnLOn = turnL > 0.05;
  const turnROn = turnR > 0.05;
  const anyBlown = health.tailSenjaBlown || health.tailStopBlown;

  const tailStatus = anyBlown
    ? health.tailStopBlown && health.tailSenjaBlown
      ? '💥 BOHLAM PUTUS'
      : health.tailStopBlown
        ? '💥 FILAMEN REM PUTUS'
        : '💥 FILAMEN KOTA PUTUS'
    : stopOn && kotaOn
      ? 'KOTA + REM MENYALA!'
      : stopOn
        ? '🛑 REM MENYALA TERANG!'
        : kotaOn
          ? '🔴 LAMPU KOTA ON'
          : 'STOPLAMP OFF';

  return (
    <div className="relative w-full flex-1 min-h-[135px] rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden px-2 py-1 mb-2">
      {/* Ambient Rear Glow */}
      {(kotaOn || stopOn || turnLOn || turnROn) && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-75"
          style={{
            background: [
              stopOn
                ? `radial-gradient(circle at 50% 48%, rgba(239, 68, 68, ${
                    0.35 + stop * 0.35
                  }), transparent 65%)`
                : kotaOn
                  ? `radial-gradient(circle at 50% 48%, rgba(220, 38, 38, ${
                      0.22 * kota
                    }), transparent 58%)`
                  : '',
              turnLOn
                ? `radial-gradient(circle at 18% 48%, rgba(249, 115, 22, ${
                    0.4 * turnL
                  }), transparent 45%)`
                : '',
              turnROn
                ? `radial-gradient(circle at 82% 48%, rgba(249, 115, 22, ${
                    0.4 * turnR
                  }), transparent 45%)`
                : '',
            ]
              .filter(Boolean)
              .join(', '),
          }}
        />
      )}

      <svg
        viewBox="0 0 360 175"
        className="w-full h-full max-h-[175px] select-none pointer-events-none drop-shadow-xl"
      >
        <defs>
          <linearGradient id="rearBodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <radialGradient id="stopBlaze" cx="50%" cy="46%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="28%" stopColor="#fecaca" />
            <stop offset="68%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>
          <filter id="rearBloom" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="5.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Top Rear Behel / Grab Rail Silhouette */}
        <path
          d="M 68 30 Q 180 6 292 30 L 278 44 Q 180 24 82 44 Z"
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1.8"
        />

        {/* Rear Tail Cowl Fairing */}
        <path
          d="M 28 52 Q 180 28 332 52 L 306 116 Q 180 138 54 116 Z"
          fill="url(#rearBodyGrad)"
          stroke="#475569"
          strokeWidth="2"
        />

        {/* Rear Spakbor / Fender Neck + Red Cat-Eye Reflector */}
        <path d="M 142 124 L 218 124 L 208 148 L 152 148 Z" fill="#090d16" stroke="#334155" />
        <rect x="163" y="131" width="34" height="7" rx="2" fill="#7f1d1d" stroke="#dc2626" strokeWidth="0.8" />

        {/* ==================== LEFT REAR TURN SIGNAL WING (SEIN KIRI L) ==================== */}
        <g filter={turnLOn ? 'url(#rearBloom)' : undefined}>
          <path
            d="M 38 58 L 106 52 L 98 106 L 54 104 Q 34 86 38 58 Z"
            fill={turnLOn ? `rgba(249, 115, 22, ${0.45 + turnL * 0.55})` : '#291d12'}
            stroke={turnLOn ? '#fed7aa' : '#78350f'}
            strokeWidth={turnLOn ? 2.2 : 1.5}
          />
          <path
            d="M 45 72 L 100 68 M 48 86 L 98 86"
            stroke={turnLOn ? '#ffedd5' : '#9a3412'}
            strokeWidth="1.1"
            opacity={turnLOn ? 0.85 : 0.45}
          />
          <circle
            cx="73"
            cy="79"
            r={turnLOn ? 10 : 6.5}
            fill={turnLOn ? '#fff7ed' : '#431407'}
          />
        </g>
        <text
          x="68"
          y="124"
          textAnchor="middle"
          fill={turnLOn ? '#fdba74' : '#94a3b8'}
          fontSize="9.5"
          fontWeight="900"
        >
          ◀ SEIN L
        </text>

        {/* ==================== RIGHT REAR TURN SIGNAL WING (SEIN KANAN R) ==================== */}
        <g filter={turnROn ? 'url(#rearBloom)' : undefined}>
          <path
            d="M 322 58 L 254 52 L 262 106 L 306 104 Q 326 86 322 58 Z"
            fill={turnROn ? `rgba(249, 115, 22, ${0.45 + turnR * 0.55})` : '#291d12'}
            stroke={turnROn ? '#fed7aa' : '#78350f'}
            strokeWidth={turnROn ? 2.2 : 1.5}
          />
          <path
            d="M 315 72 L 260 68 M 312 86 L 262 86"
            stroke={turnROn ? '#ffedd5' : '#9a3412'}
            strokeWidth="1.1"
            opacity={turnROn ? 0.85 : 0.45}
          />
          <circle
            cx="287"
            cy="79"
            r={turnROn ? 10 : 6.5}
            fill={turnROn ? '#fff7ed' : '#431407'}
          />
        </g>
        <text
          x="292"
          y="124"
          textAnchor="middle"
          fill={turnROn ? '#fdba74' : '#94a3b8'}
          fontSize="9.5"
          fontWeight="900"
        >
          SEIN R ▶
        </text>

        {/* ==================== CENTER RUBY STOPLAMP (KOTA & REM) ==================== */}
        <g filter={stopOn || kotaOn ? 'url(#rearBloom)' : undefined}>
          {/* Main Ruby Lens */}
          <path
            d="M 112 48 Q 180 38 248 48 L 254 108 Q 180 126 106 108 Z"
            fill={
              stopOn
                ? 'url(#stopBlaze)'
                : kotaOn
                  ? `rgba(220, 38, 38, ${0.42 + kota * 0.45})`
                  : '#2a0e13'
            }
            stroke={anyBlown ? '#f59e0b' : stopOn ? '#fecaca' : kotaOn ? '#f87171' : '#64748b'}
            strokeWidth={stopOn ? 2.8 : 1.8}
          />

          {/* LED / U-Bar Tail Position Guide (Lampu Kota Contour) */}
          <path
            d="M 124 58 L 146 98 L 180 108 L 214 98 L 236 58"
            fill="none"
            stroke={kotaOn || stopOn ? '#fecaca' : '#7f1d1d'}
            strokeWidth={kotaOn ? 4 : 2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={kotaOn || stopOn ? 0.95 : 0.45}
          />

          {/* Dual-Filament Center Brake Bulb */}
          <ellipse
            cx="180"
            cy="77"
            rx={stopOn ? 26 : kotaOn ? 15 : 11}
            ry={stopOn ? 16 : kotaOn ? 10 : 8}
            fill={stopOn ? '#ffffff' : kotaOn ? '#fca5a5' : '#450a0a'}
            opacity={stopOn ? 0.95 : kotaOn ? 0.85 : 0.7}
          />
          <text
            x="180"
            y="80.5"
            textAnchor="middle"
            fill={stopOn ? '#7f1d1d' : kotaOn ? '#450a0a' : '#fda4af'}
            fontSize="8.5"
            fontWeight="900"
          >
            {stopOn ? 'STOP!' : kotaOn ? 'KOTA' : 'OFF'}
          </text>
        </g>

        {/* Bottom Status Badge */}
        <rect
          x="108"
          y="151"
          width="144"
          height="19"
          rx="9.5"
          fill={anyBlown ? '#78350f' : stopOn ? '#ef4444' : kotaOn ? '#991b1b' : '#0f172a'}
          stroke={anyBlown ? '#fbbf24' : stopOn ? '#fecaca' : '#475569'}
          strokeWidth="1.2"
        />
        <text
          x="180"
          y="163.5"
          textAnchor="middle"
          fill={stopOn || kotaOn || anyBlown ? '#ffffff' : '#94a3b8'}
          fontSize="9"
          fontWeight="900"
        >
          {tailStatus}
        </text>
      </svg>
    </div>
  );
};
