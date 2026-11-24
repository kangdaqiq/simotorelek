import { CIRCUIT_PRESETS, makeSlots } from './presets';
import { createCleanHealth } from './randomUkkGenerator';
import { ChallengeDefinition } from '../types/challenge';
import { BrandStandard, PinId, SwitchStates, Wire, WireColorId } from '../types/circuit';

const byPresetId = (id: string) => CIRCUIT_PRESETS.find((p) => p.id === id)!;

const cleanHealth = createCleanHealth;

const defaultOffSwitches = (): SwitchStates => ({
  ignitionOn: false,
  lightMainPos: 'OFF',
  dimPos: 'LO',
  turnPos: 'OFF',
  hazardOn: false,
  hornPressed: false,
  brakeFrontPressed: false,
  brakeRearPressed: false,
  engineRunning: false,
  rpm: 1800,
  sideStandUp: true,
  neutralGearOn: true,
  starterPressed: false,
  kickStartActive: false,
});

function mkWires(list: Array<[PinId, PinId, WireColorId]>): Wire[] {
  return list.map(([from, to, color], idx) => ({
    id: `chal-w-${idx + 1}-${from}-${to}`,
    from,
    to,
    color,
  }));
}

export const CHALLENGES: ChallengeDefinition[] = [
  // ==================== WIRING CHALLENGES ====================
  {
    id: 'W1',
    code: 'SPK-W1',
    boardModule: 'BODY',
    category: 'WIRING',
    difficulty: 'Pemula',
    title: 'Instalasi Klakson & Lampu Rem Ganda (DC)',
    customerComplaint:
      'Unit motor baru selesai dirakit rangka. Pasang jalur kelistrikan Klakson serta Switch Rem Depan & Belakang sesuai SOP pabrikan!',
    objectives: [
      'Arus DC Aki wajib melewati Sekring 10A lalu dikontrol Kunci Kontak.',
      'Klakson berbunyi hanya saat Kunci Kontak ON dan tombol klakson ditekan.',
      'Lampu Rem Belakang menyala baik saat Rem Depan maupun Rem Belakang ditekan.',
    ],
    hint: 'Hubungkan Aki (-) ke GND. Tarik Aki (+) -> Sekring -> Kunci Kontak IN. Dari Kunci Kontak OUT, cabangkan ke Tombol Klakson serta Switch Rem Depan & Belakang secara paralel.',
    setup: () => ({
      slots: makeSlots('MATIC_DC'),
      wires: [],
      switches: defaultOffSwitches(),
      health: cleanHealth(),
    }),
  },
  {
    id: 'W2',
    code: 'SPK-W2',
    boardModule: 'BODY',
    category: 'WIRING',
    difficulty: 'Pemula',
    title: 'Instalasi Sistem Lampu Sein & Indikator Panel',
    customerComplaint:
      'Jalur Aki, Sekring, dan Kunci Kontak sudah terpasang. Lanjutkan merakit sistem Lampu Sein Kiri/Kanan lengkap dengan Flasher dan Indikator Speedometer!',
    objectives: [
      'Hubungkan Kunci Kontak OUT ke Flasher B, lalu Flasher L ke Saklar Sein IN.',
      'Sein Depan Kiri, Belakang Kiri, dan Indikator L berkedip bersamaan saat geser KIRI.',
      'Sein Depan Kanan, Belakang Kanan, dan Indikator R berkedip bersamaan saat geser KANAN.',
    ],
    hint: 'Pastikan semua pin negatif (-) lampu sein depan, belakang, dan massa panel speedometer sudah terhubung ke Terminal Massa Rangka (GND).',
    setup: (brand: BrandStandard) => {
      const gnd: WireColorId = brand === 'HONDA' ? 'green' : 'black';
      return {
        slots: makeSlots('MATIC_DC'),
        wires: mkWires([
          ['BAT_NEG', 'GND_1', gnd],
          ['BAT_POS', 'FUSE_IN', 'red'],
          ['FUSE_OUT', 'IGN_IN', 'red'],
        ]),
        switches: { ...defaultOffSwitches(), ignitionOn: true },
        health: cleanHealth(),
      };
    },
  },
  {
    id: 'W3',
    code: 'SPK-W3',
    boardModule: 'BODY',
    category: 'WIRING',
    difficulty: 'Menengah',
    title: 'Instalasi Penerangan Bebek AC + Kiprok 4-Pin & Pengisian',
    customerComplaint:
      'Rakit sistem Penerangan Lampu Kepala Motor Bebek AC dari Spul Kuning lengkap dengan regulasi Kiprok 4-Pin serta jalur Pengisian Aki!',
    objectives: [
      'Pastikan slot Spul & Kiprok bertipe BEBEK AC (memiliki pin Kuning Penerangan AC).',
      'Jalur Kuning Spul terhubung ke Saklar Lampu Kanan & diparalel ke Kiprok Kuning.',
      'Lampu Senja, Kota Belakang, Dekat (LO), Jauh (HI), & Pengisian Aki bekerja aman hingga 7800 RPM.',
    ],
    hint: 'Jangan lupa memasang Massa Spul & Massa Kiprok ke GND! Tanpa Kiprok Kuning + Massa Kiprok, bohlam depan akan putus saat diuji pada 7800 RPM.',
    setup: () => ({
      slots: makeSlots('BEBEK_AC'),
      wires: [],
      switches: { ...defaultOffSwitches(), engineRunning: true, rpm: 2200 },
      health: cleanHealth(),
    }),
  },
  {
    id: 'W4',
    code: 'SPK-W4',
    boardModule: 'ENGINE',
    category: 'WIRING',
    difficulty: 'Menengah',
    title: 'Instalasi Starter Elektrik Pengaman Matic (Rem + Standar)',
    customerComplaint:
      'Rakit sistem Starter Elektrik Motor Matic! Dinamo Starter hanya boleh berputar jika Kunci Kontak ON, Tuas Rem Ditarik, DAN Standar Samping Dinaikkan!',
    objectives: [
      'Kabel arus besar Dinamo Starter (~45A) wajib langsung dari Aki (+) -> Baut 30 Bendik -> Baut 87 -> Dinamo (+), TIDAK melewati Sekring 10A!',
      'Jalur pengendali Koil Bendik (85-86) wajib melewati Sekring 10A, Kunci Kontak, Switch Rem, Standar Samping, dan Tombol Starter.',
      'Dinamo Starter wajib terkunci mati jika Standar Samping diturunkan atau Rem dilepas.',
    ],
    hint: 'Tarik Aki (+) langsung ke Bendik 30, dan Bendik 87 ke Dinamo (+). Untuk koil pengendali: Kontak OUT -> Switch Rem -> Bendik 85, lalu Bendik 86 -> Tombol Starter -> Standar Samping -> GND.',
    setup: () => ({
      slots: makeSlots('MATIC_DC'),
      wires: [],
      switches: {
        ...defaultOffSwitches(),
        ignitionOn: true,
        sideStandUp: true,
        brakeFrontPressed: true,
      },
      health: cleanHealth(),
    }),
  },
  {
    id: 'W5',
    code: 'SPK-W5',
    boardModule: 'ENGINE',
    category: 'WIRING',
    difficulty: 'Menengah',
    title: 'Instalasi Pengapian CDI Matic DC + Pin SW Standar Samping',
    customerComplaint:
      'Jalur Starter Matic sudah terpasang. Rakit sistem Pengapian CDI Matic DC agar mesin hidup saat distarter DAN otomatis mati saat Standar Samping diturunkan!',
    objectives: [
      'Suplai +12V CDI Matic diambil dari Kunci Kontak OUT, dan Massa CDI ke GND.',
      'Pin khusus "SW Standar" pada CDI Matic wajib dihubungkan ke jalur Switch Standar Samping menuju GND!',
      'Hubungkan Sinyal Pulser ke CDI, Output CDI ke Koil Primer (+), dan Kabel Cop ke Busi.',
    ],
    hint: 'Sambungkan pin "SW Standar" pada CDI Matic ke Pin 1 Standar Samping (yang Pin 2-nya sudah ke GND), sehingga saat Standar Turun sinyal massa ke CDI terputus dan mematikan mesin!',
    setup: (brand: BrandStandard) => ({
      slots: makeSlots('MATIC_DC'),
      wires: byPresetId('starter_matic_safety').buildWires(brand),
      switches: {
        ...defaultOffSwitches(),
        ignitionOn: true,
        sideStandUp: true,
        brakeFrontPressed: true,
      },
      health: cleanHealth(),
    }),
  },

  // ==================== REPAIR CHALLENGES ====================
  {
    id: 'R1',
    code: 'SPK-R1',
    boardModule: 'BODY',
    category: 'REPAIR',
    difficulty: 'Pemula',
    title: 'Keluhan: Sein Kanan Berkedip Terlalu Cepat!',
    customerComplaint:
      '"Pak Mekanik, lampu sein kiri motor saya normal, tapi kalau sein kanan dinyalakan kedipannya cepat sekali dan sein belakang kanan mati."',
    objectives: [
      'Gunakan Tespen atau Multimeter untuk mencari penyebab sein belakang kanan mati.',
      'Perbaiki jalur kabel yang salah/putus tanpa mengganti part yang masih sehat.',
      'Pastikan keempat lampu sein & indikator berkedip dengan tempo normal.',
    ],
    hint: 'Periksa jalur positif dan jalur massa (-) pada Lampu Sein Belakang Kanan dengan Tespen/AVO. Apakah kabel massanya benar-benar terhubung ke GND?',
    hideCurrentFlowByDefault: true,
    setup: (brand: BrandStandard) => {
      const baseWires = byPresetId('turn_signal_dc').buildWires(brand);
      const faultyWires = baseWires.map((w) =>
        w.from === 'TURN_RR_GND' && w.to === 'GND_4'
          ? { ...w, to: 'TAIL_SENJA' as PinId }
          : w
      );
      return {
        slots: makeSlots('MATIC_DC'),
        wires: faultyWires,
        switches: { ...defaultOffSwitches(), ignitionOn: true, turnPos: 'R' },
        health: cleanHealth(),
      };
    },
  },
  {
    id: 'R2',
    code: 'SPK-R2',
    boardModule: 'BODY',
    category: 'REPAIR',
    difficulty: 'Menengah',
    title: 'Keluhan: Sekring Putus Terus Saat Lampu Dinyalakan!',
    customerComplaint:
      '"Motor habis dibongkar sendiri di rumah. Begitu saklar lampu kanan digeser ke SENJA atau UTAMA, sekring 10A langsung putus! Tolong lacak korsletnya."',
    objectives: [
      'Matikan kontak & gunakan Multimeter (Ohm/Beep) untuk melacak kabel yang korslet ke Massa.',
      'Lepas/perbaiki kabel penyebab hubung-singkat, lalu pasang Sekring 10A baru.',
      'Pastikan Lampu Senja, Kota Belakang, Dekat, & Jauh menyala normal tanpa putus sekring.',
    ],
    hint: 'Periksa cabang kabel dari Saklar Senja / Lampu Kota Belakang. Ada satu kabel yang bukannya masuk ke beban lampu malah langsung menempel ke Massa (GND)!',
    hideCurrentFlowByDefault: true,
    setup: (brand: BrandStandard) => {
      const gnd: WireColorId = brand === 'HONDA' ? 'green' : 'black';
      const ignOut: WireColorId = brand === 'HONDA' ? 'black' : 'brown';
      const loC: WireColorId = brand === 'HONDA' ? 'white' : 'green';
      const hiC: WireColorId = brand === 'HONDA' ? 'blue' : 'yellow';
      const senjaC: WireColorId = brand === 'HONDA' ? 'brown' : 'blue';
      return {
        slots: makeSlots('MATIC_DC'),
        wires: mkWires([
          ['BAT_NEG', 'GND_1', gnd],
          ['BAT_POS', 'FUSE_IN', 'red'],
          ['FUSE_OUT', 'IGN_IN', 'red'],
          ['IGN_OUT', 'SWR_LIGHT_IN', ignOut],
          ['SWR_SENJA_OUT', 'HEAD_SENJA', senjaC],
          ['SWR_SENJA_OUT', 'TAIL_GND', senjaC],
          ['TAIL_GND', 'GND_4', gnd],
          ['SWR_HEAD_OUT', 'SWL_DIM_IN', 'yellow'],
          ['SWL_LO_OUT', 'HEAD_LO', loC],
          ['SWL_HI_OUT', 'HEAD_HI', hiC],
          ['SWL_HI_OUT', 'IND_HI_IN', hiC],
          ['HEAD_GND', 'GND_3', gnd],
          ['IND_GND', 'GND_2', gnd],
        ]),
        switches: { ...defaultOffSwitches(), ignitionOn: true, lightMainPos: 'OFF' },
        health: { ...cleanHealth(), fuseBlown: true },
      };
    },
  },
  {
    id: 'R3',
    code: 'SPK-R3',
    boardModule: 'BODY',
    category: 'REPAIR',
    difficulty: 'Menengah',
    title: 'Keluhan: Bohlam Motor Bebek AC Putus Terus Saat Digas Tinggi!',
    customerComplaint:
      '"Kemarin baru ganti bohlam lampu depan, tapi begitu dipakai jalan kencang langsung putus lagi! Jangan cuma ganti bohlam, cari biang keladinya!"',
    objectives: [
      'Hidupkan mesin, naikkan RPM, dan ukur tegangan ACV pada jalur lampu kuning.',
      'Temukan komponen penstabil tegangan yang rusak, ganti part tersebut, lalu ganti bohlam.',
      'Lulus uji geber mesin hingga 7800 RPM tanpa bohlam putus lagi.',
    ],
    hint: 'Ukur tegangan ACV antara Kuning Kiprok dengan Massa saat digas 6000 RPM. Jika tembus >18V AC padahal kabel Kiprok terpasang benar, berarti unit Kiprok sudah jebol!',
    hideCurrentFlowByDefault: true,
    setup: (brand: BrandStandard) => ({
      slots: makeSlots('BEBEK_AC'),
      wires: byPresetId('lighting_ac_kiprok').buildWires(brand),
      switches: {
        ...defaultOffSwitches(),
        engineRunning: true,
        rpm: 2000,
        lightMainPos: 'HEAD',
        dimPos: 'LO',
      },
      health: {
        ...cleanHealth(),
        faultRegulatorBroken: true,
        headLoBlown: true,
      },
    }),
  },
  {
    id: 'R4',
    code: 'SPK-R4',
    boardModule: 'BODY',
    category: 'REPAIR',
    difficulty: 'Mahir',
    title: 'Keluhan: Sein & Klakson Mati Total, Lampu Rem Normal',
    customerComplaint:
      '"Lampu rem hidup normal, tapi lampu sein kiri-kanan dan klakson mati total. Tolong ukur komponen mana saja yang rusak, jangan asal ganti part yang sehat!"',
    objectives: [
      'Gunakan Multimeter (DCV & Ohm) untuk memeriksa Flasher, Saklar, dan Klakson.',
      'Ganti hanya komponen yang benar-benar rusak menggunakan tombol 🔧 Ganti Part.',
      'Pastikan Klakson, Sein Kiri/Kanan, dan Lampu Rem berfungsi 100% normal.',
    ],
    hint: 'Cek tegangan DC di pin B dan L Flasher (jika B ada 12V tapi L mati, Flasher rusak). Lalu matikan kontak dan ukur hambatan Ohm antara Pin 1 & Pin 2 Klakson!',
    hideCurrentFlowByDefault: true,
    setup: (brand: BrandStandard) => {
      const gnd: WireColorId = brand === 'HONDA' ? 'green' : 'black';
      const ignOut: WireColorId = brand === 'HONDA' ? 'black' : 'brown';
      const flsOut: WireColorId = brand === 'HONDA' ? 'gray' : 'brown_white';
      const leftC: WireColorId = brand === 'HONDA' ? 'orange' : 'dark_brown';
      const rightC: WireColorId = brand === 'HONDA' ? 'light_blue' : 'dark_green';
      const hornWire: WireColorId = brand === 'HONDA' ? 'light_green' : 'pink';
      return {
        slots: makeSlots('MATIC_DC'),
        wires: mkWires([
          ['BAT_NEG', 'GND_1', gnd],
          ['BAT_POS', 'FUSE_IN', 'red'],
          ['FUSE_OUT', 'IGN_IN', 'red'],
          ['IGN_OUT', 'FLS_B', ignOut],
          ['FLS_L', 'SWL_TURN_IN', flsOut],
          ['SWL_TURN_L', 'TURN_FL_POS', leftC],
          ['SWL_TURN_L', 'TURN_RL_POS', leftC],
          ['SWL_TURN_L', 'IND_L_IN', leftC],
          ['SWL_TURN_R', 'TURN_FR_POS', rightC],
          ['SWL_TURN_R', 'TURN_RR_POS', rightC],
          ['SWL_TURN_R', 'IND_R_IN', rightC],
          ['IGN_OUT', 'SWL_HORN_1', ignOut],
          ['SWL_HORN_2', 'HORN_A', hornWire],
          ['HORN_B', 'GND_3', gnd],
          ['IGN_OUT', 'SWR_BRAKE_IN', ignOut],
          ['IGN_OUT', 'BRK_REAR_IN', ignOut],
          ['SWR_BRAKE_OUT', 'TAIL_STOP', 'light_green'],
          ['BRK_REAR_OUT', 'TAIL_STOP', 'light_green'],
          ['TURN_FL_GND', 'GND_3', gnd],
          ['TURN_FR_GND', 'GND_3', gnd],
          ['TURN_RL_GND', 'GND_4', gnd],
          ['TURN_RR_GND', 'GND_4', gnd],
          ['TAIL_GND', 'GND_4', gnd],
          ['IND_GND', 'GND_2', gnd],
        ]),
        switches: { ...defaultOffSwitches(), ignitionOn: true },
        health: {
          ...cleanHealth(),
          faultFlasherBroken: true,
          faultHornBroken: true,
        },
      };
    },
  },
  {
    id: 'R5',
    code: 'SPK-R5',
    boardModule: 'ENGINE',
    category: 'REPAIR',
    difficulty: 'Menengah',
    title: 'Keluhan: Starter Elektrik Matic Mati Hening (Hanya Bisa Engkol)',
    customerComplaint:
      '"Motor matic kalau di-engkol manual langsung hidup normal, tapi kalau pencet tombol starter elektrik hening sama sekali padahal rem sudah ditarik & standar naik!"',
    objectives: [
      'Gunakan Multimeter (Ohm / DCV) untuk memeriksa jalur pemicu Bendik (85-86) & Standar Samping.',
      'Temukan komponen starter yang putus dalam tanpa salah mengganti CDI/Koil yang sehat!',
      'Pastikan Dinamo Starter kembali memutar mesin saat Rem ditarik + Tombol Starter ditekan.',
    ],
    hint: 'Matikan Kunci Kontak, lalu ukur hambatan Ohm antara pin Koil 85 dan 86 pada Bendik Starter (normalnya ~4.8 Ω). Jika OL (Putus), ganti Bendik Starter!',
    hideCurrentFlowByDefault: true,
    setup: (brand: BrandStandard) => ({
      slots: makeSlots('MATIC_DC'),
      wires: byPresetId('full_engine_matic_dc').buildWires(brand),
      switches: {
        ...defaultOffSwitches(),
        ignitionOn: true,
        sideStandUp: true,
        brakeFrontPressed: true,
      },
      health: {
        ...cleanHealth(),
        faultStarterRelayBroken: true,
      },
    }),
  },
  {
    id: 'R6',
    code: 'SPK-R6',
    boardModule: 'ENGINE',
    category: 'REPAIR',
    difficulty: 'Mahir',
    title: 'Keluhan: Dinamo Starter Berputar Kuat, Tapi Busi Hilang Api!',
    customerComplaint:
      '"Motor matic saya distarter berputar kencang, bensin penuh, tapi mesin tidak mau hidup karena busi tidak memercikkan api! Cek sistem pengapiannya."',
    objectives: [
      'Ukur sinyal Pulser, tegangan keluar CDI (ACV), serta hambatan Koil Primer (Ohm).',
      'Ganti hanya komponen pengapian yang rusak (jangan asal ganti semua part!).',
      'Pastikan Busi memercikkan api biru saat Standar Naik & mati saat Standar Turun.',
    ],
    hint: 'Sambil menekan tombol Starter, cek ACV di pin CDI Output ke Koil (jika keluar ~165V berarti CDI & Pulser sehat!). Lalu matikan kontak dan ukur Ohm antara Koil (+) dan Koil (-)!',
    hideCurrentFlowByDefault: true,
    setup: (brand: BrandStandard) => ({
      slots: makeSlots('MATIC_DC'),
      wires: byPresetId('full_engine_matic_dc').buildWires(brand),
      switches: {
        ...defaultOffSwitches(),
        ignitionOn: true,
        sideStandUp: true,
        brakeFrontPressed: true,
      },
      health: {
        ...cleanHealth(),
        faultCoilBroken: true,
      },
    }),
  },

  // ==================== UPGRADE & CROSS-MODULE CHALLENGES ====================
  {
    id: 'M1',
    code: 'SPK-M1',
    boardModule: 'BODY',
    category: 'UPGRADE',
    difficulty: 'Mahir',
    title: 'Modifikasi: Konversi Lampu Motor Bebek AC ke Full DC + Relay',
    customerComplaint:
      '"Lampu motor bebek saya masih AC ikut putaran mesin, jadi redup saat pelan. Ubah jadi sistem Full DC lewat Kunci Kontak + Penguat Relay 4 Kaki, dan pastikan pengisian Aki tetap jalan!"',
    objectives: [
      'Pisahkan jalur Saklar Lampu dari kabel Kuning Spul AC (atau ganti modul ke Matic DC!).',
      'Gunakan Kunci Kontak OUT untuk menyuplai Saklar Lampu & memicu Koil Relay (85-86).',
      'Suplai arus utama Relay (30 -> 87) dari jalur bersekring ke Saklar Dim agar terang meski mesin mati.',
      'Pastikan jalur Pengisian Aki (Spul Putih -> Kiprok -> Aki) tetap aktif saat mesin hidup.',
    ],
    hint: 'Cabut kabel Kuning dari Saklar Lampu IN! Sambungkan Kunci Kontak OUT ke Saklar Lampu IN, Saklar Utama OUT ke Relay 85 (86 ke GND), Sekring OUT ke Relay 30, dan Relay 87 ke Dim IN.',
    setup: (brand: BrandStandard) => ({
      slots: makeSlots('BEBEK_AC'),
      wires: byPresetId('lighting_ac_kiprok').buildWires(brand),
      switches: {
        ...defaultOffSwitches(),
        ignitionOn: true,
        engineRunning: false,
        rpm: 2000,
        lightMainPos: 'HEAD',
        dimPos: 'LO',
      },
      health: cleanHealth(),
    }),
  },
  {
    id: 'M2',
    code: 'SPK-M2',
    boardModule: 'ENGINE',
    category: 'UPGRADE',
    difficulty: 'Mahir',
    title: 'Konversi Modular: Spul Pengapian Bebek AC Mati -> Ganti Pakai CDI DC!',
    customerComplaint:
      '"Gulungan Hitam-Merah Spul pengapian motor bebek saya terbakar (0V), tapi pengisian Putih & Aki masih sehat! Tolong akali ganti modul CDI Bebek AC menjadi CDI DC ambil arus dari Kunci Kontak!"',
    objectives: [
      'Klik tombol 🔄 pada kotak Unit CDI untuk mengganti modul dari "BEBEK AC" menjadi "MATIC DC"!',
      'Sambungkan suplai +12V CDI dari Kunci Kontak OUT (lewat Sekring 10A) agar mati saat Kontak OFF.',
      'Berikan sinyal Massa pada pin "SW Stdr" & "Massa" CDI, serta sambungkan Pulser & Koil.',
      'Pastikan mesin bisa distarter pada Gigi Netral [N] dan mengisi Aki saat hidup!',
    ],
    hint: 'Setelah mengganti slot Unit CDI ke tipe MATIC DC: hubungkan +12V CDI ke Kunci Kontak ON, Pulser ke Pulser, Koil ke Koil Primer (+), serta pin SW Stdr & Massa CDI keduanya ke GND!',
    setup: (brand: BrandStandard) => ({
      slots: makeSlots('BEBEK_AC'),
      wires: byPresetId('full_engine_bebek_ac').buildWires(brand),
      switches: {
        ...defaultOffSwitches(),
        ignitionOn: true,
        neutralGearOn: true,
      },
      health: {
        ...cleanHealth(),
        faultSpulCdiBroken: true,
      },
    }),
  },
  {
    id: 'M3',
    code: 'SPK-M3',
    boardModule: 'ENGINE',
    requiresLinkedMode: true,
    category: 'REPAIR',
    difficulty: 'Mahir',
    title: '🔗 Kasus 1 Motor Utuh: Mesin Matic Mogok Begitu Lampu Malam Dinyalakan!',
    customerComplaint:
      '"Mesin motor matic saya normal kalau siang (lampu OFF). Tapi begitu malam hari Saklar Lampu digeser ke UTAMA (Jauh/HI), sekring langsung putus dan MESIN LANGSUNG MOGOK MATI di jalan!"',
    objectives: [
      'Buka kedua tab (💡 Modul 1: Bodi & ⚙️ Modul 2: Mesin) karena keduanya sekarang TERHUBUNG sebagai 1 motor!',
      'Lacak kabel korslet pada jalur Lampu Jauh (HI) / Indikator Dim di Modul 1 dengan AVO Meter.',
      'Perbaiki jalur lampu yang korslet, ganti Sekring 10A, hidupkan mesin di Modul 2, dan nyalakan Lampu Jauh di Modul 1 tanpa mesin mogok!',
    ],
    hint: 'Pindah ke tab 💡 Modul 1: Bodi! Periksa cabang dari Saklar Dim HI — ada kabel yang salah tancap langsung ke Massa Speedometer (IND_GND) bukannya ke IND_HI_IN!',
    hideCurrentFlowByDefault: true,
    setup: (brand: BrandStandard) => {
      const fullWires = byPresetId('linked_full_matic_dc').buildWires(brand);
      // Inject realistic cross-module road-stall fault: High beam indicator wire shorted to IND_GND instead of IND_HI_IN!
      const faulty = fullWires.map((w) =>
        w.from === 'SWL_HI_OUT' && w.to === 'IND_HI_IN'
          ? { ...w, to: 'IND_GND' as PinId }
          : w
      );
      return {
        slots: makeSlots('MATIC_DC'),
        wires: faulty,
        switches: {
          ...defaultOffSwitches(),
          ignitionOn: true,
          sideStandUp: true,
          brakeFrontPressed: true,
          lightMainPos: 'OFF',
          dimPos: 'HI',
        },
        health: cleanHealth(),
      };
    },
  },
];
