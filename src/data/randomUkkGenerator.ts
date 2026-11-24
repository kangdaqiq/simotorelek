import { CIRCUIT_PRESETS, makeSlots } from './presets';
import { ChallengeDefinition, RandomUkkScope } from '../types/challenge';
import {
  BikeSystemVariant,
  BrandStandard,
  ComponentHealth,
  PinId,
  SwitchStates,
  Wire,
  WireFaultType,
} from '../types/circuit';

export const createCleanHealth = (): ComponentHealth => ({
  fuseBlown: false,
  headLoBlown: false,
  headHiBlown: false,
  senjaFrontBlown: false,
  tailSenjaBlown: false,
  tailStopBlown: false,
  faultFlasherBroken: false,
  faultRegulatorBroken: false,
  faultGroundHeadBroken: false,
  faultHornBroken: false,
  faultStarterRelayBroken: false,
  faultCdiBroken: false,
  faultCoilBroken: false,
  faultSparkPlugFouled: false,
  faultSpulCdiBroken: false,
  faultBatteryWeak: false,
  batteryLevel: 96,
  faultHornSwitchDirty: false,
  faultStarterSwitchDirty: false,
  faultLightSwitchDirty: false,
  faultTurnSwitchDirty: false,
  faultSideStandSwitchDirty: false,
  faultBrakeSwitchStuck: false,
});

const baseUkkSwitches = (): SwitchStates => ({
  ignitionOn: true,
  lightMainPos: 'OFF',
  dimPos: 'LO',
  turnPos: 'OFF',
  hazardOn: false,
  hornPressed: false,
  brakeFrontPressed: false,
  brakeRearPressed: false,
  engineRunning: false,
  rpm: 2200,
  sideStandUp: true,
  neutralGearOn: true,
  starterPressed: false,
  kickStartActive: false,
});

function injectWireFault(
  wires: Wire[],
  a: PinId,
  b: PinId,
  fault: WireFaultType
): Wire[] {
  return wires.map((w) =>
    (w.from === a && w.to === b) || (w.from === b && w.to === a)
      ? { ...w, fault }
      : w
  );
}

function rewireEndpoint(
  wires: Wire[],
  a: PinId,
  b: PinId,
  newFrom: PinId,
  newTo: PinId
): Wire[] {
  return wires.map((w) =>
    (w.from === a && w.to === b) || (w.from === b && w.to === a)
      ? { ...w, from: newFrom, to: newTo }
      : w
  );
}

interface UkkFaultRecipe {
  recipeId: string;
  scopes: RandomUkkScope[];
  bikeVariant?: BikeSystemVariant;
  difficulty: 'Pemula' | 'Menengah' | 'Mahir';
  symptomTitle: string;
  customerComplaint: string;
  hint: string;
  secretSummary: string;
  apply: (
    wires: Wire[],
    health: ComponentHealth,
    switches: SwitchStates
  ) => { wires: Wire[]; health: ComponentHealth; switches: SwitchStates };
}

export const UKK_RECIPES: UkkFaultRecipe[] = [
  // ==================== A. KABEL PUTUS DI DALAM ISOLASI (OPEN WIRE: #1 - #12) ====================
  {
    recipeId: 'ukk_01_wire_open_horn',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Pemula',
    symptomTitle: 'Gejala: Klakson Mati Total (Komponen Lain Normal)',
    customerComplaint:
      '"Lampu dan sein normal semua Pak, tapi klakson dipencet diam seribu bahasa. Kabel terlihat utuh dari luar, tolong cek apa yang bermasalah!"',
    hint: 'Jangan langsung ganti Klakson! Ukur hambatan (Ohm) pada kabel penghubung dari Tombol Klakson ke Klakson — tembaga kabel bisa putus di dalam kulit!',
    secretSummary: 'Kabel dari Tombol Klakson menuju Klakson putus di dalam isolasi (Open Wire).',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'SWL_HORN_2', 'HORN_A', 'OPEN'),
      health,
      switches,
    }),
  },
  {
    recipeId: 'ukk_02_wire_open_flasher_in',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Menengah',
    symptomTitle: 'Gejala: Lampu Sein Kiri & Kanan Mati Total',
    customerComplaint:
      '"Lampu sein kiri maupun kanan mati total. Tolong ukur dulu jalurnya dengan AVO Meter / Tespen sebelum menvonis Flasher rusak!"',
    hint: 'Cek apakah ada arus +12V sampai di pin B Flasher! Jika di Kunci Kontak ON ada 12V tapi di Flasher B 0V, berarti kabel penghubungnya putus dalam!',
    secretSummary: 'Kabel suplai dari Kunci Kontak ON ke Flasher B putus di dalam kulit (Open Wire).',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'IGN_OUT', 'FLS_B', 'OPEN'),
      health,
      switches,
    }),
  },
  {
    recipeId: 'ukk_03_wire_open_flasher_out',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Menengah',
    symptomTitle: 'Gejala: Flasher Dapat Setrum 12V, Tapi Sein Kiri & Kanan Gelap',
    customerComplaint:
      '"Di kaki B Flasher sudah ada arus 12V dan Flasher sudah dites bagus, tapi digeser sein kiri maupun kanan tetap mati total!"',
    hint: 'Matikan kontak lalu ukur kontinuitas (Ohm/Beep) pada kabel keluaran Flasher L menuju Sein IN di Saklar Kiri!',
    secretSummary: 'Kabel keluaran Flasher (FLS_L ke SWL_TURN_IN) putus di dalam isolasi.',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'FLS_L', 'SWL_TURN_IN', 'OPEN'),
      health,
      switches: { ...switches, turnPos: 'L' },
    }),
  },
  {
    recipeId: 'ukk_04_wire_open_turn_rear_l',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Menengah',
    symptomTitle: 'Gejala: Sein Kiri Berkedip Terlalu Cepat (Sein Belakang Kiri Mati)',
    customerComplaint:
      '"Waktu sein kanan normal, tapi waktu geser sein KIRI kedipannya jadi 2x lebih cepat dan lampu sein belakang kiri mati padahal bohlamnya bagus!"',
    hint: 'Kedipan cepat menandakan beban berkurang! Ukur Ohm pada kabel positif dari Saklar Sein L menuju Sein Belakang Kiri (TURN_RL_POS).',
    secretSummary: 'Kabel positif menuju Lampu Sein Belakang Kiri putus di dalam isolasi (memicu Hyper-Flash).',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'SWL_TURN_L', 'TURN_RL_POS', 'OPEN'),
      health,
      switches: { ...switches, turnPos: 'L' },
    }),
  },
  {
    recipeId: 'ukk_05_wire_open_turn_front_r',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Menengah',
    symptomTitle: 'Gejala: Sein Kanan Berkedip Cepat & Sein Depan Kanan Padam',
    customerComplaint:
      '"Habis parkir senggolan di pasar, sein kanan motor saya kedipnya jadi ngebut sekali dan sein depan kanan tidak menyala!"',
    hint: 'Periksa kontinuitas (Ohm) kabel dari Saklar Sein R menuju Lampu Sein Depan Kanan (TURN_FR_POS)!',
    secretSummary: 'Kabel positif menuju Lampu Sein Depan Kanan putus di dalam kulit (Open Wire).',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'SWL_TURN_R', 'TURN_FR_POS', 'OPEN'),
      health,
      switches: { ...switches, turnPos: 'R' },
    }),
  },
  {
    recipeId: 'ukk_06_wire_open_high_beam',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Menengah',
    symptomTitle: 'Gejala: Indikator Biru Dim Menyala, Tapi Lampu Jauh (HI) Gelap!',
    customerComplaint:
      '"Lampu dekat normal. Waktu saklar Dim ditekan ke JAUH (HI), indikator biru di speedometer nyala, tapi bohlam depan jauhnya gelap padahal bohlam baru!"',
    hint: 'Karena indikator biru menyala, Saklar Dim HI sehat! Ukur Ohm pada kabel cabang dari Out HI menuju soket Jauh (HI) Lampu Kepala!',
    secretSummary: 'Kabel dari Saklar Dim HI menuju Lampu Kepala Jauh (HEAD_HI) putus di dalam isolasi.',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'SWL_HI_OUT', 'HEAD_HI', 'OPEN'),
      health,
      switches: { ...switches, lightMainPos: 'HEAD', dimPos: 'HI', engineRunning: true },
    }),
  },
  {
    recipeId: 'ukk_07_wire_open_charging_white',
    scopes: ['BODY', 'ENGINE', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala: Mesin Hidup Normal, Tapi Sistem Pengisian Aki Mati!',
    customerComplaint:
      '"Aki saya baru beli seminggu lalu tapi sering tekor karena tidak mengisi saat mesin jalan. Tolong cek jalur pengisian Spul ke Kiprok!"',
    hint: 'Ukur tegangan ACV langsung di pin Putih Spul vs di pin Putih Kiprok saat mesin hidup (atau ukur Ohm kabel Putih Spul ke Kiprok saat mesin mati)!',
    secretSummary: 'Kabel Putih pengisian dari Spul menuju Kiprok (ALT_WHITE -> REG_WHITE) putus di dalam isolasi.',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'ALT_WHITE', 'REG_WHITE', 'OPEN'),
      health,
      switches: { ...switches, engineRunning: true, rpm: 3500 },
    }),
  },
  {
    recipeId: 'ukk_08_wire_open_pulser',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala: Starter Kuat Berputar, Tapi Busi Tidak Memercikkan Api',
    customerComplaint:
      '"Motor matic distarter berputar lancar, tapi mesin tidak mau menyala sama sekali. Jangan asal ganti CDI atau Koil, lacak dulu jalurnya!"',
    hint: 'Cek sinyal ACV Pulser di Spul vs di pin Input Pulser CDI! Jika di Spul keluar tegangan tapi di CDI 0V, berarti kabel Pulser putus di tengah jalan!',
    secretSummary: 'Kabel sinyal Pulser menuju CDI putus di dalam isolasi (Open Wire).',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'PULSER_POS', 'CDI_PULSER', 'OPEN'),
      health,
      switches: { ...switches, brakeFrontPressed: true },
    }),
  },
  {
    recipeId: 'ukk_09_wire_open_cdi_pwr',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    difficulty: 'Menengah',
    symptomTitle: 'Gejala: Dinamo Starter Berputar, Namun CDI Tidak Mendapat Tegangan +12V',
    customerComplaint:
      '"Motor matic tiba-tiba mati mendadak di jalan. Distarter suaranya kencang tapi tidak mau hidup."',
    hint: 'Saat Kontak ON, ukur tegangan DCV di pin +12V CDI! Jika di Out Kontak ada 12V namun di pin +12V CDI 0V, kabel suplainya putus dalam!',
    secretSummary: 'Kabel arus +12V dari Kunci Kontak ke CDI (IGN_OUT -> CDI_PWR) putus di dalam isolasi.',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'IGN_OUT', 'CDI_PWR', 'OPEN'),
      health,
      switches: { ...switches, brakeFrontPressed: true },
    }),
  },
  {
    recipeId: 'ukk_10_wire_open_starter_trig',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    difficulty: 'Menengah',
    symptomTitle: 'Gejala: Pencet Starter Hening (Hanya Hidup Kalau Di-Engkol)',
    customerComplaint:
      '"Kalau di-engkol motor langsung nyala, tapi tombol starter elektrik dipencet hening tidak ada bunyi klik sama sekali!"',
    hint: 'Ukur kontinuitas (Ohm) kabel antara Koil Bendik 86 ke Tombol Starter, serta cek kondisi Bendik & Tombol Starter.',
    secretSummary: 'Kabel pemicu antara Koil Bendik 86 dan Tombol Starter putus dalam isolasi.',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'ST_RLY_86', 'ST_BTN_1', 'OPEN'),
      health,
      switches: { ...switches, brakeFrontPressed: true },
    }),
  },
  {
    recipeId: 'ukk_11_wire_open_hv_cop',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala: CDI & Koil Primer Normal, Busi Baru, Tapi Tidak Ada Percikan Api!',
    customerComplaint:
      '"Busi sudah saya belikan baru, CDI dan Koil kata teman saya masih bagus, tapi busi tetap tidak memercikkan api biru!"',
    hint: 'Jangan lupa periksa kabel tegangan tinggi dari Output Cop Koil (COP_OUT) menuju Kepala Busi (PLUG_TOP) dengan Ohmmeter!',
    secretSummary: 'Kabel tegangan tinggi Cop Busi (COP_OUT -> PLUG_TOP) putus arang/karbon di dalam.',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'COP_OUT', 'PLUG_TOP', 'OPEN'),
      health,
      switches: { ...switches, brakeFrontPressed: true },
    }),
  },
  {
    recipeId: 'ukk_12_wire_open_bebek_neutral',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    bikeVariant: 'BEBEK_AC',
    difficulty: 'Menengah',
    symptomTitle: 'Gejala Motor Bebek: Lampu [N] Hijau Nyala, Tapi Tombol Starter Mati!',
    customerComplaint:
      '"Motor bebek saya posisi gigi sudah Netral dan lampu hijau [N] menyala terang, di-engkol langsung hidup, tapi dipencet tombol starter hening!"',
    hint: 'Lampu [N] menyala berarti Switch Netral sehat! Ukur Ohm pada kabel penghubung dari Tombol Starter ke pin Switch Netral (ST_BTN_2 -> NEUTRAL_SW_OUT).',
    secretSummary: 'Kabel massa pengaman dari Tombol Starter ke Switch Gigi Netral putus di dalam isolasi.',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'ST_BTN_2', 'NEUTRAL_SW_OUT', 'OPEN'),
      health,
      switches: { ...switches, neutralGearOn: true },
    }),
  },

  // ==================== B. KABEL LECET KORSLET KE RANGKA (SHORT TO GND: #13 - #18) ====================
  {
    recipeId: 'ukk_13_wire_short_horn',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala: Setiap Pencet Tombol Klakson, Sekring Langsung Putus!',
    customerComplaint:
      '"Aneh sekali Pak, motor jalan normal, tapi begitu saya pencet tombol klakson langsung terdengar bunyi CTAK dan sekring 10A putus!"',
    hint: 'Berarti ada kabel setelah Tombol Klakson yang kulitnya lecet menempel rangka (Massa)! Matikan kontak, ukur Ohm kabel dari Tombol Klakson ke Klakson terhadap GND.',
    secretSummary: 'Kabel dari Tombol Klakson ke Klakson lecet menempel Massa Rangka (Short-to-Ground).',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'SWL_HORN_2', 'HORN_A', 'SHORT_GND'),
      health,
      switches,
    }),
  },
  {
    recipeId: 'ukk_14_wire_short_head_lo',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala: Geser Saklar ke Lampu Dekat (LO) Langsung Korslet!',
    customerComplaint:
      '"Saat posisi lampu Jauh (HI) aman menyala, tapi begitu saklar Dim digeser ke lampu Dekat (LO), langsung terjadi hubung singkat!"',
    hint: 'Matikan kontak/mesin, lalu periksa kabel dari Saklar Dim LO menuju Lampu Kepala Dekat — kulit kabelnya terjepit komstir hingga bocor ke Massa!',
    secretSummary: 'Kabel Lampu Dekat (SWL_LO_OUT -> HEAD_LO) lecet menempel Massa (Short-to-Ground).',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'SWL_LO_OUT', 'HEAD_LO', 'SHORT_GND'),
      health,
      switches: { ...switches, dimPos: 'HI' },
    }),
  },
  {
    recipeId: 'ukk_15_wire_short_turn_left',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala: Geser Sein Kiri Langsung Putus Sekring!',
    customerComplaint:
      '"Sein kanan berkedip normal, tapi setiap kali geser saklar sein ke KIRI, sekring 10A langsung putus!"',
    hint: 'Salah satu kabel cabang Sein Kiri (menuju Sein Depan Kiri) lecet menempel bodi massa! Ukur Ohm ke GND lalu ganti kabel yang bocor.',
    secretSummary: 'Kabel positif Sein Depan Kiri lecet menempel Massa Rangka (Short-to-Ground).',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'SWL_TURN_L', 'TURN_FL_POS', 'SHORT_GND'),
      health,
      switches,
    }),
  },
  {
    recipeId: 'ukk_16_wire_short_turn_right',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala: Geser Sein Kanan Langsung Putus Sekring 10A!',
    customerComplaint:
      '"Habis pasang baut behel jok belakang, sekarang setiap nyalakan sein KANAN sekring langsung putus! Sein kiri aman."',
    hint: 'Petunjuk kuat dari keluhan pelanggan: baut behel jok belakang! Cek kabel menuju Sein Belakang Kanan (TURN_RR_POS) terhadap hubungan singkat ke GND!',
    secretSummary: 'Kabel positif Sein Belakang Kanan terjepit baut behel jok ke Massa (Short-to-Ground).',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'SWL_TURN_R', 'TURN_RR_POS', 'SHORT_GND'),
      health,
      switches,
    }),
  },
  {
    recipeId: 'ukk_17_wire_short_brake_stop',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala: Begitu Tarik / Injak Tuas Rem, Sekring 10A Langsung Putus!',
    customerComplaint:
      '"Motor jalan lancar, sein dan klakson aman, tapi begitu saya menarik rem untuk berhenti, tiba-tiba mati semua karena sekring 10A putus!"',
    hint: 'Matikan kontak, pastikan tuas rem dilepas, lalu ukur Ohm dari soket Lampu Rem Belakang (TAIL_STOP) ke GND! Cek kabel dari Switch Rem Belakang ke Lampu Rem.',
    secretSummary: 'Kabel dari Switch Rem Belakang ke Lampu Stop (BRK_REAR_OUT -> TAIL_STOP) lecet menempel rangka.',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'BRK_REAR_OUT', 'TAIL_STOP', 'SHORT_GND'),
      health,
      switches: { ...switches, brakeFrontPressed: false, brakeRearPressed: false },
    }),
  },
  {
    recipeId: 'ukk_18_wire_short_bebek_kill',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    bikeVariant: 'BEBEK_AC',
    difficulty: 'Mahir',
    symptomTitle: 'Gejala Motor Bebek AC: Kontak Sudah ON & Starter Kuat, Tapi Api Busi Hilang!',
    customerComplaint:
      '"Motor bebek saya sekringnya utuh, klakson dan starter hidup kencang, Spul & CDI baru dicek bagus, tapi api busi hilang total walaupun kontak sudah ON!"',
    hint: 'Ingat cara kerja CDI AC! Jika kabel Kill Switch (CDI_KILL -> IGN_KILL) lecet menyentuh rangka, CDI akan mengira Kunci Kontak sedang OFF terus! Ukur Ohm pin KILL CDI ke GND saat Kontak ON!',
    secretSummary: 'Kabel Kill Switch CDI Bebek AC (CDI_KILL -> IGN_KILL) terjepit rangka (Short-to-Ground) sehingga mematikan pengapian.',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'CDI_KILL', 'IGN_KILL', 'SHORT_GND'),
      health,
      switches: { ...switches, ignitionOn: true, neutralGearOn: true },
    }),
  },

  // ==================== C. SOKET BERJAMUR / KOROSI DROP TEGANGAN (~18.5 OHM: #19 - #23) ====================
  {
    recipeId: 'ukk_19_wire_corroded_head_gnd',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala: Lampu Depan Menyala Sangat Redup Kekuningan!',
    customerComplaint:
      '"Aki penuh dan bohlam depan masih baru, tapi kok nyala lampu dekat maupun jauh redup sekali seperti lilin!"',
    hint: 'Kasus klasik Voltage Drop! Ukur hambatan (Ohm) pada kabel Massa Lampu Kepala (HEAD_GND ke GND) — jika terbaca ~18.5 Ω (tidak bunyi Beep), soketnya berjamur! Ganti kabel tersebut.',
    secretSummary: 'Kabel Massa Lampu Kepala mengalami korosi/jamuran (hambatan tinggi ~18.5 Ω).',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'HEAD_GND', 'GND_3', 'CORRODED'),
      health,
      switches: { ...switches, lightMainPos: 'HEAD', engineRunning: true },
    }),
  },
  {
    recipeId: 'ukk_20_wire_corroded_horn_gnd',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala: Klakson Tidak Kuat Bunyi Padahal Ada Tegangan 12V!',
    customerComplaint:
      '"Sudah dicek pakai tespen ada setrum masuk ke klakson, klaksonnya juga bagus, tapi waktu dipencet tidak kuat berbunyi!"',
    hint: 'Waspada jebakan soket berjamur! Matikan kontak dan ukur Ohm kabel Massa Klakson (HORN_B ke GND) — jika ~18.5 Ω (bukan 0.1 Ω), berarti soket kabel korosi!',
    secretSummary: 'Kabel Massa Klakson berjamur/korosi (~18.5 Ω) sehingga tegangan drop saat dibebani.',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'HORN_B', 'GND_3', 'CORRODED'),
      health,
      switches,
    }),
  },
  {
    recipeId: 'ukk_21_wire_corroded_tail_gnd',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala: Lampu Kota & Lampu Rem Belakang Menyala Sangat Redup!',
    customerComplaint:
      '"Bohlam belakang sudah diganti baru, tapi baik lampu senja maupun waktu direm nyalanya cuma membara redup sekali!"',
    hint: 'Karena kedua filamen (Kota & Rem) sama-sama redup, curigai jalur sekutu mereka: Massa Lampu Belakang (TAIL_GND ke GND_4)! Ukur hambatannya dengan Ohmmeter.',
    secretSummary: 'Kabel Massa Lampu Belakang berkarat kena lumpur spakbor (~18.5 Ω Voltage Drop).',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'TAIL_GND', 'GND_4', 'CORRODED'),
      health,
      switches: { ...switches, lightMainPos: 'SENJA', engineRunning: true },
    }),
  },
  {
    recipeId: 'ukk_22_wire_corroded_bendik_trig',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala: Bendik Starter Tidak Kuat Klik Padahal Saklar Rem Normal',
    customerComplaint:
      '"Rem sudah ditarik dan tombol starter bagus, tapi bendik starter tidak kuat menarik kontak!"',
    hint: 'Matikan kontak dan ukur hambatan Ohm pada kabel dari Switch Rem OUT menuju Koil Bendik 85 — jika terbaca ~18.5 Ω (bukan 0.1 Ω), soket kabelnya berjamur!',
    secretSummary: 'Kabel Switch Rem ke Koil Bendik 85 korosi (~18.5 Ω) sehingga tegangan koil drop.',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'SWR_BRAKE_OUT', 'ST_RLY_85', 'CORRODED'),
      health,
      switches: { ...switches, brakeFrontPressed: true },
    }),
  },
  {
    recipeId: 'ukk_23_wire_corroded_coil_primary',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala: Output CDI Normal, Koil & Busi Sehat, Tapi Api Busi Hilang!',
    customerComplaint:
      '"Motor mogok sehabis menerjang banjir. CDI, Koil, dan Busi dicek satu-satu bagus, tapi waktu dipasang tidak keluar api!"',
    hint: 'Ukur hambatan (Ohm) kabel penghubung dari Output CDI (CDI_COIL) menuju skun Primer Koil (COIL_POS)! Skun yang berkarat hijau (~18.5 Ω) menahan kejutan arus CDI.',
    secretSummary: 'Skun kabel Output CDI ke Primer Koil berjamur/korosi (~18.5 Ω).',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'CDI_COIL', 'COIL_POS', 'CORRODED'),
      health,
      switches: { ...switches, brakeFrontPressed: true },
    }),
  },

  // ==================== D. KONTAK SAKLAR KOTOR / BERKERAK / MACET (#24 - #29) ====================
  {
    recipeId: 'ukk_24_sw_dirty_horn',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Pemula',
    symptomTitle: 'Gejala: Klakson Mati Setelah Motor Kehujanan',
    customerComplaint:
      '"Kemarin habis dicuci dan kehujanan, sekarang tombol klakson dipencet tidak mau bunyi sama sekali."',
    hint: 'Kunci tombol klakson (🔒) dalam keadaan Kontak OFF, lalu ukur Ohm antara Pin 1 dan Pin 2 Tombol Klakson! Jika OL, semprot dengan 🧴 Servis Saklar Kiri!',
    secretSummary: 'Kontak dalam Tombol Klakson berkerak kotor sehingga tidak menyambung.',
    apply: (wires, health, switches) => ({
      wires,
      health: { ...health, faultHornSwitchDirty: true },
      switches,
    }),
  },
  {
    recipeId: 'ukk_25_sw_dirty_starter',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    difficulty: 'Pemula',
    symptomTitle: 'Gejala: Pencet Tombol Starter Hening Tidak Ada Respon',
    customerComplaint:
      '"Aki baru cas dan motor bisa di-engkol hidup, tapi dipencet tombol starter elektrik tidak bereaksi."',
    hint: 'Tahan tombol Starter (🔒) saat Kontak OFF, lalu ukur Ohm antara Pin 1 & Pin 2 Tombol Starter! Jika OL (Putus), klik 🧴 Servis Saklar Starter.',
    secretSummary: 'Plat kontak dalam Tombol Starter berkerak karbon (tidak menyambung).',
    apply: (wires, health, switches) => ({
      wires,
      health: { ...health, faultStarterSwitchDirty: true },
      switches: { ...switches, brakeFrontPressed: true },
    }),
  },
  {
    recipeId: 'ukk_26_sw_dirty_sidestand',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    difficulty: 'Menengah',
    symptomTitle: 'Gejala: Standar Samping Sudah Naik, Tapi Mesin & Starter Tetap Terkunci Mati!',
    customerComplaint:
      '"Standar samping sudah saya naikkan penuh, tapi motor matic saya tetap tidak bisa distarter dan tidak mau hidup seperti standar masih turun!"',
    hint: 'Matikan kontak dan ukur Ohm antara Pin 1 dan Pin 2 Switch Standar Samping saat posisi NAIK! Jika tetap OL (Putus), bersihkan dengan 🧴 Servis Switch Standar.',
    secretSummary: 'Switch Standar Samping Matic kotor/macet terbuka oleh lumpur jalanan.',
    apply: (wires, health, switches) => ({
      wires,
      health: { ...health, faultSideStandSwitchDirty: true },
      switches: { ...switches, sideStandUp: true, brakeFrontPressed: true },
    }),
  },
  {
    recipeId: 'ukk_27_sw_stuck_brake',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Menengah',
    symptomTitle: 'Gejala: Lampu Rem Belakang Menyala Terus Padahal Rem Tidak Ditekan!',
    customerComplaint:
      '"Lampu belakang motor saya menyala terang terus menerus bikin aki cepat tekor, padahal tuas rem depan & belakang tidak disentuh!"',
    hint: 'Matikan kontak, pastikan kedua rem posisi LEPAS, lalu ukur Ohm pada Switch Rem Depan (IN ke OUT). Jika bunyi BEEP padahal rem dilepas, berarti Switch Rem macet — klik 🧴 Servis Saklar Kanan!',
    secretSummary: 'Switch Rem Depan macet terhubung terus (Stuck Closed).',
    apply: (wires, health, switches) => ({
      wires,
      health: { ...health, faultBrakeSwitchStuck: true, batteryLevel: 38 },
      switches: { ...switches, brakeFrontPressed: false, brakeRearPressed: false },
    }),
  },
  {
    recipeId: 'ukk_28_sw_dirty_turn',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Menengah',
    symptomTitle: 'Gejala: Flasher Sehat, Tapi Sein Kiri & Kanan Tidak Mau Menyala',
    customerComplaint:
      '"Sudah dicek arus sampai ke saklar sein, tapi digeser ke kiri maupun kanan lampunya tetap tidak mau berkedip."',
    hint: 'Geser saklar sein ke KIRI (Kontak OFF), lalu ukur Ohm antara Sein IN dan Sein L pada Saklar Stang Kiri! Jika OL, gunakan 🧴 Servis Saklar Kiri.',
    secretSummary: 'Kontak geser Saklar Sein Kiri berkerak aus sehingga arus terputus.',
    apply: (wires, health, switches) => ({
      wires,
      health: { ...health, faultTurnSwitchDirty: true },
      switches: { ...switches, turnPos: 'L' },
    }),
  },
  {
    recipeId: 'ukk_29_sw_dirty_light_right',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Menengah',
    symptomTitle: 'Gejala: Geser Saklar Lampu Kanan ke SENJA & UTAMA Tetap Gelap Total!',
    customerComplaint:
      '"Bohlam depan dan belakang utuh semua, arus masuk ke Saklar Kanan juga ada, tapi digeser ke Senja maupun Utama tidak ada satu pun lampu yang nyala!"',
    hint: 'Geser Saklar Kanan ke UTAMA lalu ukur Ohm antara In Utama ke Out Senja & Out Utama (saat mesin/kontak OFF)! Jika OL, bersihkan dengan 🧴 Servis Saklar Kanan!',
    secretSummary: 'Plat geser Saklar Lampu Utama Kanan berkerak oksidasi sehingga tidak menghantar arus.',
    apply: (wires, health, switches) => ({
      wires,
      health: { ...health, faultLightSwitchDirty: true },
      switches: { ...switches, lightMainPos: 'HEAD', engineRunning: true },
    }),
  },

  // ==================== E. KERUSAKAN KOMPONEN ELEKTRIKAL & AKI SOAK (#30 - #36) ====================
  {
    recipeId: 'ukk_30_battery_weak_crank_drop',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    difficulty: 'Menengah',
    symptomTitle: 'Gejala: Bendik Bunyi Klik, Tapi Dinamo Starter Tidak Kuat Memutar Mesin!',
    customerComplaint:
      '"Aneh Pak, diukur waktu diam akinya 12 Volt lebih, bendik bunyi klik, tapi dinamo starter tidak sanggup memutar mesin! Kalau di-engkol hidup."',
    hint: 'Lakukan Uji Tegangan Cranking! Pasang AVO Meter (DCV) di Aki (+) dan (-), lalu tekan & tahan tombol ⚡ START (🔒). Jika tegangan jatuh drastis ke ~5.8V, berarti Aki sudah SOAK -> klik ⚡ Cas/Ganti Aki!',
    secretSummary: 'Aki Soak (Internal Resistance tinggi: 12.25V tanpa beban, anjlok 5.8V saat starter).',
    apply: (wires, health, switches) => ({
      wires,
      health: { ...health, faultBatteryWeak: true, batteryLevel: 18 },
      switches: { ...switches, brakeFrontPressed: true },
    }),
  },
  {
    recipeId: 'ukk_31_comp_bendik_open',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    difficulty: 'Menengah',
    symptomTitle: 'Gejala: Pencet Starter Hening (Hanya Hidup Lewat Engkol)',
    customerComplaint:
      '"Rem sudah ditarik, tombol starter bagus, aki penuh, tapi waktu dipencet starter hening sama sekali!"',
    hint: 'Matikan kontak dan ukur hambatan Ohm antara Koil 85 dan 86 pada Bendik Starter!',
    secretSummary: 'Kumparan Koil Bendik Starter putus dalam (OL).',
    apply: (wires, health, switches) => ({
      wires,
      health: { ...health, faultStarterRelayBroken: true },
      switches: { ...switches, brakeFrontPressed: true },
    }),
  },
  {
    recipeId: 'ukk_32_comp_cdi_dead',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala: Starter Berputar Kencang, Tapi Busi Hilang Api!',
    customerComplaint:
      '"Starter elektrik kuat memutar mesin, pulser dan koil baru dicek bagus, tapi busi tidak memercikkan api!"',
    hint: 'Cek apakah +12V, SW Standar (-), dan sinyal Pulser masuk ke CDI. Jika semua masuk tapi Output CDI ke Koil tetap 0V saat distarter, berarti Unit CDI mati!',
    secretSummary: 'Unit CDI mengalami kerusakan internal (mati total).',
    apply: (wires, health, switches) => ({
      wires,
      health: { ...health, faultCdiBroken: true },
      switches: { ...switches, brakeFrontPressed: true },
    }),
  },
  {
    recipeId: 'ukk_33_comp_coil_open',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala: CDI Mengeluarkan Kejut Tegangan, Tapi Busi Tidak Memercik!',
    customerComplaint:
      '"Motor mogok mendadak. Waktu distarter output dari CDI ada denyut tegangan, busi juga masih bagus, tapi tetap tidak ada api!"',
    hint: 'Matikan kontak lalu ukur hambatan Ohm antara pin Primer Koil (+) dan Massa Koil (-)! Koil sehat sekitar ~0.9 Ω; jika OL berarti kumparan Koil putus!',
    secretSummary: 'Kumparan Primer Koil Pengapian putus di dalam (OL).',
    apply: (wires, health, switches) => ({
      wires,
      health: { ...health, faultCoilBroken: true },
      switches: { ...switches, brakeFrontPressed: true },
    }),
  },
  {
    recipeId: 'ukk_34_comp_plug_fouled',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    difficulty: 'Menengah',
    symptomTitle: 'Gejala: Starter Berputar, Arus CDI & Koil Normal, Mesin Tidak Hidup!',
    customerComplaint:
      '"Motor matic mogok tidak mau hidup padahal distarter lancar. Cek bagian ujung pengapiannya, jangan salah ganti CDI mahal!"',
    hint: 'Ukur output CDI (~165V AC saat starter) dan ukur Ohm Koil Primer (~0.9 Ω). Jika keduanya normal tapi tetap tidak ada api, berarti Busi mati!',
    secretSummary: 'Busi mati / keramik isolator bocor.',
    apply: (wires, health, switches) => ({
      wires,
      health: { ...health, faultSparkPlugFouled: true },
      switches: { ...switches, brakeFrontPressed: true },
    }),
  },
  {
    recipeId: 'ukk_35_comp_flasher_dead',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Pemula',
    symptomTitle: 'Gejala: Lampu Sein Kiri & Kanan Mati Total',
    customerComplaint:
      '"Klakson dan lampu depan hidup normal, tapi lampu sein kiri dan kanan mati semua."',
    hint: 'Ukur tegangan di pin B Flasher (ada 12V) vs pin L Flasher saat sein ON (0V).',
    secretSummary: 'Unit Flasher Sein mati dalam.',
    apply: (wires, health, switches) => ({
      wires,
      health: { ...health, faultFlasherBroken: true },
      switches: { ...switches, turnPos: 'L' },
    }),
  },
  {
    recipeId: 'ukk_36_comp_horn_dead',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Pemula',
    symptomTitle: 'Gejala: Arus 12V Sampai ke Soket Klakson, Tapi Klakson Diam Membisu!',
    customerComplaint:
      '"Saklar klakson bagus dan waktu dipencet arus 12V masuk ke klakson, kabel massa juga bagus, tapi klaksonnya tetap bisu!"',
    hint: 'Matikan kontak lalu ukur hambatan Ohm langsung di antara Pin 1 dan Pin 2 unit Klakson! Klakson sehat ~2.2 Ω; jika OL berarti kumparan Klakson putus!',
    secretSummary: 'Kumparan / membran dalam unit Klakson putus (OL).',
    apply: (wires, health, switches) => ({
      wires,
      health: { ...health, faultHornBroken: true },
      switches,
    }),
  },

  // ==================== F. BOHLAM PUTUS, SALAH RAKIT & KASUS GANDA MASTER (#37 - #40) ====================
  {
    recipeId: 'ukk_37_bulb_tail_stop_blown',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Pemula',
    symptomTitle: 'Gejala: Lampu Kota Belakang Hidup, Tapi Lampu Rem Mati Saat Direm!',
    customerComplaint:
      '"Waktu malam lampu kota belakang nyala normal, tapi waktu saya tarik rem depan maupun belakang, lampu remnya sama sekali tidak menyala!"',
    hint: 'Tarik tuas rem lalu cek dengan Tespen / AVO DCV di soket Rem Lampu Belakang (TAIL_STOP)! Jika arus +12V masuk dan massa normal tapi lampu tetap mati, berarti filamen bohlam rem belakang putus!',
    secretSummary: 'Filamen Stop pada bohlam ganda Lampu Belakang putus (tailStopBlown).',
    apply: (wires, health, switches) => ({
      wires,
      health: { ...health, tailStopBlown: true },
      switches: { ...switches, lightMainPos: 'SENJA', brakeFrontPressed: true, engineRunning: true },
    }),
  },
  {
    recipeId: 'ukk_38_miswire_turn_swapped',
    scopes: ['BODY', 'FULL_MOTOR'],
    difficulty: 'Menengah',
    symptomTitle: 'Gejala Salah Rakit: Geser Sein Kiri, Sein Depan Malah Kedip Kanan!',
    customerComplaint:
      '"Habis cat ulang tameng depan di bengkel cat, kok waktu saya geser sein KIRI yang belakang kedip kiri tapi yang DEPAN malah kedip KANAN!"',
    hint: 'Perhatikan kabel dari Saklar Sein Kiri (SWL_TURN_L) dan Kanan (SWL_TURN_R) yang menuju Lampu Sein Depan — lepas 2 kabel yang tertukar lalu pasang ke sisi yang benar!',
    secretSummary: 'Kabel positif Sein Depan Kiri dan Sein Depan Kanan tertukar silang sehabis bongkar tameng depan.',
    apply: (wires, health, switches) => {
      let next = wires.map((w) => {
        if (
          (w.from === 'SWL_TURN_L' && w.to === 'TURN_FL_POS') ||
          (w.from === 'TURN_FL_POS' && w.to === 'SWL_TURN_L')
        ) {
          return { ...w, from: 'SWL_TURN_L' as PinId, to: 'TURN_FR_POS' as PinId };
        }
        if (
          (w.from === 'SWL_TURN_R' && w.to === 'TURN_FR_POS') ||
          (w.from === 'TURN_FR_POS' && w.to === 'SWL_TURN_R')
        ) {
          return { ...w, from: 'SWL_TURN_R' as PinId, to: 'TURN_FL_POS' as PinId };
        }
        return w;
      });
      return {
        wires: next,
        health,
        switches: { ...switches, turnPos: 'L' },
      };
    },
  },
  {
    recipeId: 'ukk_39_compound_starter_thru_fuse',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala Malpraktik Bengkel: Setiap Pencet Starter, Sekring 10A Langsung Putus!',
    customerComplaint:
      '"Habis dirakit ulang di bengkel pinggir jalan, sekring 10A motor saya sudah diganti berkali-kali selalu putus tepat saat tombol starter dipencet!"',
    hint: 'Ingat hukum arus besar Dinamo Starter (~45A)! Periksa ke mana kabel Baut 30 Bendik (ST_RLY_30) disambungkan — pindahkan langsung ke Aki (+), lalu ganti Sekring 10A yang putus!',
    secretSummary: 'Malpraktik instalasi: Baut 30 Bendik disambung lewat Out Sekring 10A (bukan langsung Aki +) sehingga arus 45A memutuskan Sekring 10A.',
    apply: (wires, health, switches) => ({
      wires: rewireEndpoint(wires, 'BAT_POS', 'ST_RLY_30', 'FUSE_OUT', 'ST_RLY_30'),
      health: { ...health, fuseBlown: true },
      switches: { ...switches, brakeFrontPressed: true },
    }),
  },
  {
    recipeId: 'ukk_40_compound_charging_and_weak_bat',
    scopes: ['ENGINE', 'FULL_MOTOR'],
    difficulty: 'Mahir',
    symptomTitle: 'Gejala Kasus Ganda UKK: Aki Soak Tidak Kuat Starter & Pengisian Mati!',
    customerComplaint:
      '"Motor matic tidak kuat distarter cuma bunyi klik. Kata bengkel kemarin disuruh cas aki saja, tapi baru dipakai sehari tekor lagi! Cari akar penyebabnya sampai tuntas!"',
    hint: 'Kasus Ganda 2 Masalah! (1) Uji tegangan cranking Aki — cas/ganti Aki yang soak, DAN (2) nyalakan mesin lalu cek kenapa pengisian mati (ukur Ohm kabel Putih Spul ke Kiprok)!',
    secretSummary: 'Kasus Ganda: Kabel Putih Pengisian (ALT_WHITE -> REG_WHITE) putus dalam sehingga membuat Aki menjadi Soak.',
    apply: (wires, health, switches) => ({
      wires: injectWireFault(wires, 'ALT_WHITE', 'REG_WHITE', 'OPEN'),
      health: { ...health, faultBatteryWeak: true, batteryLevel: 19 },
      switches: { ...switches, brakeFrontPressed: true },
    }),
  },
];

// Anti-repeat queue per scope so every student in a 35-student SMK class gets a unique case!
const recentHistoryByScope: Record<RandomUkkScope, string[]> = {
  BODY: [],
  ENGINE: [],
  FULL_MOTOR: [],
};
let randomCounter = 1;

export function generateRandomUkkChallenge(scope: RandomUkkScope): ChallengeDefinition {
  const candidates = UKK_RECIPES.filter((r) => r.scopes.includes(scope));
  const recent = recentHistoryByScope[scope];
  const maxHistory = Math.max(0, candidates.length - 1);

  let pool = candidates.filter((r) => !recent.includes(r.recipeId));
  if (pool.length === 0) {
    recentHistoryByScope[scope] = [];
    pool = candidates;
  }

  const picked = pool[Math.floor(Math.random() * pool.length)];
  recentHistoryByScope[scope].push(picked.recipeId);
  if (recentHistoryByScope[scope].length > maxHistory) {
    recentHistoryByScope[scope].shift();
  }

  const caseNum = randomCounter++;
  const isFull = scope === 'FULL_MOTOR';
  const targetModule = scope === 'BODY' ? 'BODY' : 'ENGINE';

  return {
    id: 'UKK_RANDOM',
    code: `UKK-#${caseNum}`,
    boardModule: targetModule,
    requiresLinkedMode: isFull,
    randomScope: scope,
    secretFaultSummary: picked.secretSummary,
    category: 'RANDOM_UKK',
    difficulty: picked.difficulty,
    title: `🎲 Soal UKK Acak #${caseNum} — ${picked.symptomTitle}`,
    customerComplaint: picked.customerComplaint,
    objectives: [
      'Gunakan AVO Meter (DCV, ACV, Ohm/Beep) atau Tespen untuk menemukan sumber masalah sebenarnya.',
      'Waspada 40 variasi kasus: Kabel Putus Dalam, Kabel Korslet, Soket Korosi (~18Ω), Saklar Kotor/Macet, Salah Rakit, Aki Soak, Bohlam/Part Rusak, hingga Kasus Ganda!',
      'Perbaiki masalah sampai tuntas tanpa salah mengganti komponen sehat, lalu klik Uji & Serahkan Motor!',
    ],
    hint: picked.hint,
    hideCurrentFlowByDefault: true,
    setup: (brand: BrandStandard) => {
      const variant: BikeSystemVariant =
        picked.bikeVariant ?? (scope === 'BODY' ? 'BEBEK_AC' : 'MATIC_DC');

      const presetId =
        scope === 'FULL_MOTOR'
          ? variant === 'BEBEK_AC'
            ? 'linked_full_bebek_ac'
            : 'linked_full_matic_dc'
          : scope === 'BODY'
            ? 'full_body_ac_dc'
            : variant === 'BEBEK_AC'
              ? 'full_engine_bebek_ac'
              : 'full_engine_matic_dc';

      const preset = CIRCUIT_PRESETS.find((p) => p.id === presetId)!;
      const baseWires = preset.buildWires(brand);
      const baseHealth = createCleanHealth();
      const baseSw = {
        ...baseUkkSwitches(),
        engineRunning: scope === 'BODY',
      };

      const mutated = picked.apply(baseWires, baseHealth, baseSw);
      return {
        slots: makeSlots(preset.slots.spul),
        wires: mutated.wires,
        switches: mutated.switches,
        health: mutated.health,
      };
    },
  };
}
