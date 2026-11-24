import React from 'react';
import { CIRCUIT_PRESETS, CircuitPreset } from '../data/presets';
import { createCleanHealth } from '../data/randomUkkGenerator';
import { BoardModule, BrandStandard, ComponentHealth } from '../types/circuit';

interface PresetModalProps {
  open: boolean;
  onClose: () => void;
  brand: BrandStandard;
  activeModule: BoardModule;
  linkedMode: boolean;
  onApplyPreset: (preset: CircuitPreset) => void;
  onClearAll: () => void;
}

export const PresetModal: React.FC<PresetModalProps> = ({
  open,
  onClose,
  brand,
  activeModule,
  linkedMode,
  onApplyPreset,
  onClearAll,
}) => {
  if (!open) return null;

  const fullBikePresets = CIRCUIT_PRESETS.filter((p) => p.linkedFullBike);
  const bodyPresets = CIRCUIT_PRESETS.filter((p) => !p.linkedFullBike && p.boardModule === 'BODY');
  const enginePresets = CIRCUIT_PRESETS.filter(
    (p) => !p.linkedFullBike && p.boardModule === 'ENGINE'
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-5"
      onPointerDown={onClose}
    >
      <div
        className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col p-6 shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 shrink-0">
          <div>
            <h2 className="text-xl font-black text-white">
              📚 Pilih Contoh Rangkaian / Job Sheet ({brand})
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Otomatis membuka papan Modul 1 (Bodi) atau Modul 2 (Starter & Pengapian) sesuai pilihan
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-200 cursor-pointer"
          >
            Tutup
          </button>
        </div>

        <div className="overflow-y-auto space-y-5 pr-1">
          <button
            type="button"
            onClick={() => {
              onClearAll();
              onClose();
            }}
            className="w-full p-3.5 rounded-2xl border-2 border-dashed border-rose-500/60 bg-rose-950/30 hover:bg-rose-950/50 text-left transition cursor-pointer"
          >
            <div className="text-sm font-extrabold text-rose-300">
              🧹 Kosongkan Perkabelan (
              {linkedMode
                ? 'Seluruh Motor: Modul 1 & Modul 2'
                : activeModule === 'BODY'
                  ? 'Modul 1: Bodi saja'
                  : 'Modul 2: Mesin saja'}
              )
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              Lepas seluruh kabel jumper agar siswa mulai merakit dari nol.
            </div>
          </button>

          {/* Full Linked Motorcycle Presets */}
          <div>
            <div className="text-sm font-black text-emerald-400 uppercase tracking-wider mb-2">
              🔗 Paket 1 Unit Motor Utuh (Modul 1 Bodi + Modul 2 Mesin Terhubung!)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {fullBikePresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onApplyPreset(p);
                    onClose();
                  }}
                  className="p-3.5 rounded-2xl border-2 border-emerald-500/50 bg-emerald-950/25 hover:bg-emerald-950/45 hover:border-emerald-400 text-left transition cursor-pointer"
                >
                  <div className="text-sm font-extrabold text-emerald-300">{p.title}</div>
                  <div className="text-xs text-slate-300 mt-0.5">{p.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Modul 1 */}
          <div>
            <div className="text-sm font-black text-sky-300 uppercase tracking-wider mb-2">
              💡 Modul 1: Sistem Sinyal & Penerangan Bodi (AC / DC)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {bodyPresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onApplyPreset(p);
                    onClose();
                  }}
                  className="p-3.5 rounded-2xl border border-slate-700 bg-slate-800/70 hover:bg-slate-800 hover:border-sky-400 text-left transition cursor-pointer"
                >
                  <div className="text-sm font-extrabold text-sky-300">{p.title}</div>
                  <div className="text-xs text-slate-300 mt-0.5">{p.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Modul 2 */}
          <div>
            <div className="text-sm font-black text-amber-300 uppercase tracking-wider mb-2">
              ⚙️ Modul 2: Sistem Starter Elektrik Matic & Pengapian CDI
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {enginePresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onApplyPreset(p);
                    onClose();
                  }}
                  className="p-3.5 rounded-2xl border border-slate-700 bg-slate-800/70 hover:bg-slate-800 hover:border-amber-400 text-left transition cursor-pointer"
                >
                  <div className="text-sm font-extrabold text-amber-300">{p.title}</div>
                  <div className="text-xs text-slate-300 mt-0.5">{p.subtitle}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FaultModalProps {
  open: boolean;
  onClose: () => void;
  activeModule: BoardModule;
  health: ComponentHealth;
  setHealth: React.Dispatch<React.SetStateAction<ComponentHealth>>;
}

export const FaultModal: React.FC<FaultModalProps> = ({
  open,
  onClose,
  activeModule,
  health,
  setHealth,
}) => {
  if (!open) return null;

  const toggleFault = (key: keyof ComponentHealth) => {
    setHealth((h) => ({ ...h, [key]: !h[key] }));
  };

  const resetAllHealth = () => {
    setHealth(createCleanHealth());
  };

  const bodyItems: Array<{ key: keyof ComponentHealth; title: string; desc: string }> = [
    {
      key: 'faultBrakeSwitchStuck',
      title: 'Switch Rem Depan Macet Menyala Terus (Stuck Closed)',
      desc: 'Lampu rem belakang menyala terus menguras Aki walau tuas rem sudah dilepas.',
    },
    {
      key: 'faultHornSwitchDirty',
      title: 'Kontak Tombol Klakson Berkerak Kotor (OL)',
      desc: 'Tombol klakson ditekan tetapi plat kontak dalamnya berjamur tidak menyambung.',
    },
    {
      key: 'faultTurnSwitchDirty',
      title: 'Saklar Geser Sein Kiri/Kanan Berkerak Aus',
      desc: 'Flasher sehat, namun arus terputus di dalam saklar geser sein stang kiri.',
    },
    {
      key: 'faultFlasherBroken',
      title: 'Flasher Sein Rusak / Putus Dalam',
      desc: 'Kunci kontak ON & saklar sein digeser tapi lampu sein mati total.',
    },
    {
      key: 'faultRegulatorBroken',
      title: 'Kiprok (Regulator AC) Jebol',
      desc: 'Saat digas tinggi (>4000 RPM) pada penerangan AC, voltase tembus >20V dan memutus bohlam.',
    },
    {
      key: 'faultGroundHeadBroken',
      title: 'Fitting Massa Dalam Lampu Kepala Putus',
      desc: 'Arus + masuk ke lampu depan, tetapi bohlam mati karena massa dalam putus.',
    },
    {
      key: 'faultHornBroken',
      title: 'Kumparan Klakson Putus (OL)',
      desc: 'Tombol klakson ditekan tidak bunyi; hambatan Ohm klakson menjadi OL.',
    },
  ];

  const engineItems: Array<{ key: keyof ComponentHealth; title: string; desc: string }> = [
    {
      key: 'faultBatteryWeak',
      title: 'Aki Soak (Drop Tegangan 5.8V Saat Starter)',
      desc: 'Diukur tanpa beban 12.25V tampak normal, tapi begitu tekan Start anjlok ke 5.8V (gagal memutar dinamo)!',
    },
    {
      key: 'faultStarterSwitchDirty',
      title: 'Tombol Starter Berkerak Karbon (OL)',
      desc: 'Tombol starter ditekan tetapi arus tidak tersambung ke koil Bendik.',
    },
    {
      key: 'faultSideStandSwitchDirty',
      title: 'Switch Standar Samping Kotor / Macet Terbuka',
      desc: 'Standar samping sudah dinaikkan namun kontak tetap putus sehingga mesin matic terkunci mati!',
    },
    {
      key: 'faultSpulCdiBroken',
      title: 'Gulungan Spul Pengapian Hitam-Merah Terbakar (0V)',
      desc: 'Khusus Spul Bebek AC: tidak mengeluarkan 200V AC, namun pengisian Putih tetap normal.',
    },
    {
      key: 'faultStarterRelayBroken',
      title: 'Koil Bendik / Relay Starter Putus (OL)',
      desc: 'Rem ditarik & tombol starter ditekan tidak ada bunyi klik dan dinamo tidak berputar.',
    },
    {
      key: 'faultCdiBroken',
      title: 'Unit CDI Mati Total',
      desc: 'Sumber daya & sinyal Pulser masuk ke CDI, tetapi CDI tidak mengeluarkan tegangan ke Koil.',
    },
    {
      key: 'faultCoilBroken',
      title: 'Kumparan Primer Koil Pengapian Putus (OL)',
      desc: 'Output CDI keluar normal (~165V), tetapi busi tidak memercikkan api karena koil putus.',
    },
    {
      key: 'faultSparkPlugFouled',
      title: 'Busi Mati / Keramik Bocor',
      desc: 'Koil sehat, namun elektroda busi tidak memercikkan bunga api.',
    },
  ];

  const items = activeModule === 'BODY' ? bodyItems : engineItems;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6"
      onPointerDown={onClose}
    >
      <div
        className="bg-slate-900 border-2 border-amber-500/70 rounded-3xl max-w-2xl w-full p-6 shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <h2 className="text-xl font-black text-amber-400">
              🔧 Panel Guru: Simulasi Kerusakan ({activeModule === 'BODY' ? 'Modul 1: Bodi' : 'Modul 2: Mesin'})
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Aktifkan kerusakan tersembunyi untuk didemonstrasikan di layar 70 inci
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-200 cursor-pointer"
          >
            Selesai
          </button>
        </div>

        {/* Simulasi Kapasitas Aki (State of Charge) untuk Guru */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 mb-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔋</span>
              <div>
                <div className="text-sm font-extrabold text-amber-300">
                  Simulasi Kapasitas Aki (Isi Aki / State of Charge)
                </div>
                <div className="text-[11px] text-slate-400">
                  Uji respon starter & kelistrikan saat aki tekor vs terisi penuh di layar 70 inci
                </div>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg border ${
                  (health.batteryLevel ?? 96) >= 70
                    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-700/60'
                    : (health.batteryLevel ?? 96) >= 30
                    ? 'bg-amber-950/70 text-amber-400 border-amber-700/60'
                    : 'bg-rose-950/80 text-rose-400 border-rose-600 animate-pulse'
                }`}
              >
                {(health.batteryLevel ?? 96).toFixed(0)}% (
                {(health.batteryLevel ?? 96) < 22 ? 'TEKOR' : (health.batteryLevel ?? 96) < 70 ? 'SEDANG' : 'PRIMA'})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setHealth((h) => ({ ...h, batteryLevel: 100, faultBatteryWeak: false }))}
              className="px-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 text-emerald-300 text-xs font-bold cursor-pointer transition text-center"
            >
              ⚡ Penuh (100%)
            </button>
            <button
              type="button"
              onClick={() => setHealth((h) => ({ ...h, batteryLevel: 75 }))}
              className="px-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition text-center"
            >
              🔋 Normal (75%)
            </button>
            <button
              type="button"
              onClick={() => setHealth((h) => ({ ...h, batteryLevel: 18 }))}
              className="px-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/50 text-amber-300 text-xs font-bold cursor-pointer transition text-center"
            >
              ⚠️ Tekor (18%)
            </button>
            <button
              type="button"
              onClick={() => setHealth((h) => ({ ...h, batteryLevel: 5 }))}
              className="px-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-rose-500/50 text-rose-300 text-xs font-bold cursor-pointer transition text-center"
            >
              🪫 Kosong (5%)
            </button>
          </div>
        </div>

        <div className="space-y-2.5 mb-5 max-h-[380px] overflow-y-auto pr-1">
          {items.map((it) => {
            const active = health[it.key];
            return (
              <button
                key={it.key}
                type="button"
                onClick={() => toggleFault(it.key)}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-4 transition cursor-pointer ${
                  active
                    ? 'bg-red-950/60 border-red-500'
                    : 'bg-slate-800/70 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div>
                  <div className="text-sm font-extrabold text-white">{it.title}</div>
                  <div className="text-xs text-slate-300 mt-0.5">{it.desc}</div>
                </div>
                <span
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 ${
                    active ? 'bg-red-500 text-white' : 'bg-emerald-600/30 text-emerald-300'
                  }`}
                >
                  {active ? 'RUSAK (AKTIF)' : 'NORMAL'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={resetAllHealth}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-extrabold text-white cursor-pointer"
          >
            ✨ Normalkan Semua Komponen
          </button>
          <span className="text-xs text-slate-400">
            Untuk uji kompetensi acak bengkel, gunakan tombol 🎲 UKK Acak di topbar.
          </span>
        </div>
      </div>
    </div>
  );
};
