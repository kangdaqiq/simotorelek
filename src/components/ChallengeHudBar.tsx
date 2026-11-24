import React, { useState } from 'react';
import { ChallengeDefinition, ChallengeSessionStats } from '../types/challenge';

interface ChallengeHudBarProps {
  challenge: ChallengeDefinition;
  stats: ChallengeSessionStats;
  leaderboardCount: number;
  onShowHint: () => void;
  onResetChallenge: () => void;
  onRunBenchTest: () => void;
  onOpenLeaderboard: () => void;
  onExitChallenge: () => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const ChallengeHudBar: React.FC<ChallengeHudBarProps> = ({
  challenge,
  stats,
  leaderboardCount,
  onShowHint,
  onResetChallenge,
  onRunBenchTest,
  onOpenLeaderboard,
  onExitChallenge,
}) => {
  const [expanded, setExpanded] = useState(false);

  const catBadge =
    challenge.category === 'RANDOM_UKK'
      ? 'bg-emerald-500 text-slate-950'
      : challenge.category === 'WIRING'
        ? 'bg-sky-500 text-slate-950'
        : challenge.category === 'REPAIR'
          ? 'bg-amber-400 text-slate-950'
          : 'bg-purple-500 text-white';

  return (
    <div className="bg-slate-900/95 border-b-2 border-amber-500/70 px-4 py-1.5 shrink-0 z-35 relative">
      <div className="flex items-center justify-between gap-3">
        {/* Left: SPK Code & Complaint */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-black shrink-0 ${catBadge}`}>
            📋 {challenge.code}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-300 truncate">
                {challenge.title}
              </span>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 shrink-0 cursor-pointer"
              >
                {expanded ? '▲ Tutup Rincian SPK' : '▼ Lihat Target SPK'}
              </button>
            </div>
            <div className="text-[11px] text-slate-200 truncate">{challenge.customerComplaint}</div>
          </div>
        </div>

        {/* Center: Live Telemetry Badges */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-black text-white">
            ⏱️ {formatDuration(stats.elapsedSec)}
          </div>

          {(challenge.category === 'REPAIR' || challenge.category === 'RANDOM_UKK') && (
            <>
              <div
                className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold ${
                  stats.usedDiagnosticTool
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                📟 Alat Ukur: {stats.usedDiagnosticTool ? 'Sudah Dipakai ✓' : 'Belum'}
              </div>

              <div
                className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold ${
                  stats.wastedPartsCount > 0
                    ? 'bg-red-950/80 border-red-500 text-red-300'
                    : 'bg-slate-950 border-slate-800 text-emerald-300'
                }`}
              >
                🔧 Salah Ganti Part: {stats.wastedPartsCount}x
              </div>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-bold cursor-pointer"
            title="Lihat Rekap Nilai Praktik UKK"
          >
            🏅 ({leaderboardCount})
          </button>

          <button
            type="button"
            onClick={() => {
              onShowHint();
              setExpanded(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 text-xs font-bold cursor-pointer"
          >
            💡 Hint
          </button>

          <button
            type="button"
            onClick={onResetChallenge}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
            title="Ulangi Misi Ini dari Awal"
          >
            🔄 Ulang
          </button>

          <button
            type="button"
            onClick={onRunBenchTest}
            className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/25 cursor-pointer"
          >
            ✅ Uji & Serahkan Motor
          </button>

          <button
            type="button"
            onClick={onExitChallenge}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900 text-slate-300 text-xs font-bold cursor-pointer"
            title="Keluar ke Mode Bebas"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expandable SPK Objectives & Hint Drawer */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
          <div className="md:col-span-8">
            <div className="font-extrabold text-slate-300 mb-1">
              Target Pemeriksaan Serah Terima (Auto Bench-Test):
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-300">
              {challenge.objectives.map((obj, i) => (
                <li key={i}>{obj}</li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-4 bg-amber-950/40 border border-amber-500/40 rounded-xl p-2.5">
            <div className="font-extrabold text-amber-300 mb-0.5">💡 Petunjuk Kepala Bengkel:</div>
            <div className="text-slate-200 leading-relaxed">
              {stats.hintUsed
                ? challenge.hint
                : 'Klik tombol "💡 Hint" di kanan atas jika membutuhkan petunjuk langkah kerja (mengurangi peluang Bintang 3).'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
