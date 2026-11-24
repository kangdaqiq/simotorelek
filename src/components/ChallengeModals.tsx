import React, { useState } from 'react';
import {
  ChallengeDefinition,
  ChallengeEvaluation,
  ChallengeSessionStats,
  LeaderboardEntry,
  RandomUkkScope,
} from '../types/challenge';
import { BrandStandard } from '../types/circuit';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface ChallengeResultModalProps {
  open: boolean;
  onClose: () => void;
  challenge: ChallengeDefinition | null;
  evaluation: ChallengeEvaluation | null;
  stats: ChallengeSessionStats;
  brand: BrandStandard;
  onSaveScore: (studentName: string, className: string) => void;
  onOpenLeaderboard: () => void;
  onExitToFreeMode: () => void;
  onRollNextRandomUkk: (scope: RandomUkkScope) => void;
}

const QUICK_GROUPS = [
  'Kelompok 1',
  'Kelompok 2',
  'Kelompok 3',
  'Kelompok 4',
  'Kelompok 5',
  'Kelompok 6',
];

export const ChallengeResultModal: React.FC<ChallengeResultModalProps> = ({
  open,
  onClose,
  challenge,
  evaluation,
  stats,
  brand,
  onSaveScore,
  onOpenLeaderboard,
  onExitToFreeMode,
  onRollNextRandomUkk,
}) => {
  const [studentName, setStudentName] = useState('Kelompok 1');
  const [className, setClassName] = useState('XI TBSM 1');
  const [saved, setSaved] = useState(false);

  if (!open || !challenge || !evaluation) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-5"
      onPointerDown={onClose}
    >
      <div
        className={`bg-slate-900 border-2 rounded-3xl max-w-2xl w-full p-6 shadow-2xl ${
          evaluation.passed ? 'border-emerald-400' : 'border-rose-500'
        }`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center border-b border-slate-800 pb-4 mb-4">
          {evaluation.passed ? (
            <>
              <div className="text-4xl mb-1 tracking-widest">
                {'⭐'.repeat(evaluation.stars)}
                {'☆'.repeat(3 - evaluation.stars)}
              </div>
              <h2 className="text-2xl font-black text-emerald-400">
                🎉 SERVIS UKK LULUS UJI SERAH TERIMA!
              </h2>
              <p className="text-sm text-slate-300 mt-0.5">
                {challenge.code}: {challenge.title} • Skor Akhir:{' '}
                <b className="text-amber-300">{evaluation.score}/100</b> • Waktu:{' '}
                <b className="font-mono">{formatTime(stats.elapsedSec)}</b>
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-1">🔧⚠️</div>
              <h2 className="text-2xl font-black text-rose-400">
                BELUM LULUS UJI FUNGSI — PERIKSA KEMBALI!
              </h2>
              <p className="text-sm text-slate-300 mt-0.5">
                Masih ada fungsi kelistrikan yang belum pulih normal. Lihat rincian uji di bawah ini:
              </p>
            </>
          )}
        </div>

        {/* Functional Checklist */}
        <div className="space-y-2 mb-4">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
            Hasil Meja Uji Otomatis (Auto Bench-Test):
          </div>
          {evaluation.functionalChecks.map((chk, idx) => (
            <div
              key={idx}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-between ${
                chk.passed
                  ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-500/70 text-rose-200'
              }`}
            >
              <span>{chk.label}</span>
              <span className="font-black">{chk.passed ? '✅ LULUS' : '❌ GAGAL'}</span>
            </div>
          ))}
        </div>

        {/* Star 2 & Star 3 Breakdown when passed */}
        {evaluation.passed && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-4">
            <div
              className={`p-3 rounded-xl border text-xs ${
                evaluation.safetyPassed
                  ? 'bg-sky-950/40 border-sky-500/60 text-sky-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <div className="font-black mb-0.5">
                {evaluation.safetyPassed ? '⭐ Bintang K3 Diraih' : '☆ Evaluasi K3 & Sekring'}
              </div>
              <div>{evaluation.safetyNote}</div>
            </div>

            <div
              className={`p-3 rounded-xl border text-xs ${
                evaluation.proPassed
                  ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <div className="font-black mb-0.5">
                {evaluation.proPassed ? '⭐ Bintang Mekanik Pro Diraih' : '☆ Evaluasi Standar Pro'}
              </div>
              <div>{evaluation.proNote}</div>
            </div>
          </div>
        )}

        {/* Save to Class Leaderboard (Touch friendly quick buttons for 70-inch LED!) */}
        {evaluation.passed && !saved && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 mb-4">
            <div className="text-xs font-extrabold text-amber-300 mb-2">
              🏅 Catat ke Rekap Nilai UKK Kelas (Sentuh Cepat Layar 70&quot;):
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {QUICK_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setStudentName(g)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    studentName === g
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Nama Siswa / Kelompok"
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
              />
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Kelas (misal: XI TBSM 1)"
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
              />
              <button
                type="button"
                onClick={() => {
                  onSaveScore(
                    studentName.trim() || 'Siswa SMK',
                    className.trim() || `TBSM (${brand})`
                  );
                  setSaved(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black cursor-pointer"
              >
                💾 Simpan Nilai UKK
              </button>
            </div>
          </div>
        )}

        {saved && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500 text-center text-xs font-bold text-emerald-300">
            ✅ Skor berhasil dicatat ke Rekap Nilai UKK!
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-extrabold text-slate-200 cursor-pointer"
          >
            {evaluation.passed ? '🔍 Lihat Kembali Rangkaian' : '🔧 Lanjutkan Perbaikan'}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {evaluation.passed && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLeaderboard();
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-xs font-black text-amber-300 cursor-pointer"
                >
                  🏅 Rekap Nilai
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSaved(false);
                    onRollNextRandomUkk(challenge.randomScope || 'FULL_MOTOR');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer shadow"
                >
                  🎲 Acak Soal Siswa Berikutnya
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSaved(false);
                    onExitToFreeMode();
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  ✓ Selesai
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface LeaderboardModalProps {
  open: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  onClearLeaderboard: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  open,
  onClose,
  entries,
  onClearLeaderboard,
}) => {
  if (!open) return null;

  const sorted = [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.elapsedSec - b.elapsedSec;
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-5"
      onPointerDown={onClose}
    >
      <div
        className="bg-slate-900 border-2 border-amber-400 rounded-3xl max-w-4xl w-full max-h-[88vh] flex flex-col p-6 shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <h2 className="text-2xl font-black text-amber-400">
              🏅 Rekap Nilai Praktik UKK — SiElekMotor
            </h2>
            <p className="text-sm text-slate-400">
              Simulasi Elektronik Sepeda Motor • Diurutkan berdasarkan Skor Tertinggi &amp; Waktu Tercepat
            </p>
          </div>
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-black text-white cursor-pointer"
              >
                🖨️ Cetak Rekap Nilai
              </button>
            )}
            {entries.length > 0 && (
              <button
                type="button"
                onClick={onClearLeaderboard}
                className="px-3.5 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-700 text-xs font-bold text-rose-200 cursor-pointer"
              >
                🗑️ Reset Sesi Kelas
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-200 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {sorted.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Belum ada catatan nilai UKK di sesi ini. Klik <b>🎲 UKK Acak</b> dan selesaikan kasus pertama!
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase text-slate-400">
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Siswa / Kelompok</th>
                  <th className="py-2 px-3">Kelas</th>
                  <th className="py-2 px-3">Kasus UKK</th>
                  <th className="py-2 px-3">Bintang</th>
                  <th className="py-2 px-3">Skor</th>
                  <th className="py-2 px-3">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {sorted.map((item, i) => (
                  <tr key={item.id} className="hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-black text-amber-300">
                      {i === 0 ? '🥇 1' : i === 1 ? '🥈 2' : i === 2 ? '🥉 3' : i + 1}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">{item.studentName}</td>
                    <td className="py-2.5 px-3 text-slate-300">{item.className}</td>
                    <td className="py-2.5 px-3 text-sky-300 font-semibold">
                      {item.challengeTitle}
                    </td>
                    <td className="py-2.5 px-3">{'⭐'.repeat(item.stars)}</td>
                    <td className="py-2.5 px-3 font-mono font-black text-emerald-400">
                      {item.score}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {formatTime(item.elapsedSec)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
