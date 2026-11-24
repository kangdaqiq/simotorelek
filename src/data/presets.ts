import {
  BikeSystemVariant,
  BoardModule,
  BrandStandard,
  ComponentSlots,
  PinId,
  Wire,
  WireColorId,
} from '../types/circuit';

export const makeSlots = (v: BikeSystemVariant): ComponentSlots => ({
  spul: v,
  kiprok: v,
  keySwitch: v,
  cdi: v,
  safety: v,
});

export interface CircuitPreset {
  id: string;
  boardModule: BoardModule;
  linkedFullBike?: boolean;
  slots: ComponentSlots;
  title: string;
  subtitle: string;
  buildWires: (brand: BrandStandard) => Wire[];
  autoEngineOn?: boolean;
}

function mkWires(list: Array<[PinId, PinId, WireColorId]>): Wire[] {
  return list.map(([from, to, color], idx) => ({
    id: `preset-w-${idx + 1}-${from}-${to}`,
    from,
    to,
    color,
  }));
}

export function dedupeWires(wires: Wire[]): Wire[] {
  const seen = new Set<string>();
  const out: Wire[] = [];
  for (const w of wires) {
    const key = w.from < w.to ? `${w.from}|${w.to}` : `${w.to}|${w.from}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(w);
    }
  }
  return out;
}

export const CIRCUIT_PRESETS: CircuitPreset[] = [
  // ==================== FULL 1 MOTOR UTUH (MODUL 1 + MODUL 2 TERHUBUNG) ====================
  {
    id: 'linked_full_matic_dc',
    boardModule: 'ENGINE',
    linkedFullBike: true,
    slots: makeSlots('MATIC_DC'),
    title: '🛵 Full 1 Unit Motor Matic DC Utuh (Mesin + Bodi Terhubung)',
    subtitle:
      'Mengaktifkan Mode Terhubung: Starter Matic, CDI DC, Standar Samping, Pengisian, Lampu DC Relay, Sein, Klakson & Rem dalam 1 motor!',
    buildWires: (brand) => {
      const gnd: WireColorId = brand === 'HONDA' ? 'green' : 'black';
      const ignOut: WireColorId = brand === 'HONDA' ? 'black' : 'brown';
      const stWire: WireColorId = brand === 'HONDA' ? 'yellow_red' : 'blue_yellow';
      const coilWire: WireColorId = brand === 'HONDA' ? 'black_yellow' : 'orange';
      const flsOut: WireColorId = brand === 'HONDA' ? 'gray' : 'brown_white';
      const leftC: WireColorId = brand === 'HONDA' ? 'orange' : 'dark_brown';
      const rightC: WireColorId = brand === 'HONDA' ? 'light_blue' : 'dark_green';
      const hornWire: WireColorId = brand === 'HONDA' ? 'light_green' : 'pink';
      const loC: WireColorId = brand === 'HONDA' ? 'white' : 'green';
      const hiC: WireColorId = brand === 'HONDA' ? 'blue' : 'yellow';
      const senjaC: WireColorId = brand === 'HONDA' ? 'brown' : 'blue';
      return dedupeWires(
        mkWires([
          // Sumber Utama & Pengisian Bersama
          ['BAT_NEG', 'GND_1', gnd],
          ['ALT_GND', 'GND_1', gnd],
          ['REG_GND', 'GND_1', gnd],
          ['BAT_POS', 'FUSE_IN', 'red'],
          ['FUSE_OUT', 'IGN_IN', 'red'],
          ['ALT_WHITE', 'REG_WHITE', 'white'],
          ['REG_RED', 'FUSE_OUT', 'red'],
          // Mesin: Starter Matic + CDI Matic DC + Standar Samping
          ['BAT_POS', 'ST_RLY_30', 'red'],
          ['ST_RLY_87', 'ST_MOT_POS', 'red'],
          ['ST_MOT_GND', 'GND_4', gnd],
          ['IGN_OUT', 'SWR_BRAKE_IN', ignOut],
          ['IGN_OUT', 'BRK_REAR_IN', ignOut],
          ['SWR_BRAKE_OUT', 'ST_RLY_85', 'light_green'],
          ['SWR_BRAKE_OUT', 'TAIL_STOP', 'light_green'],
          ['BRK_REAR_OUT', 'TAIL_STOP', 'light_green'],
          ['ST_RLY_86', 'ST_BTN_1', stWire],
          ['ST_BTN_2', 'SIDE_SW_1', stWire],
          ['SIDE_SW_2', 'GND_2', gnd],
          ['IGN_OUT', 'CDI_PWR', ignOut],
          ['PULSER_POS', 'CDI_PULSER', 'blue_yellow'],
          ['CDI_SIDESTAND', 'SIDE_SW_1', 'light_green'],
          ['CDI_GND', 'GND_3', gnd],
          ['CDI_COIL', 'COIL_POS', coilWire],
          ['COIL_GND', 'GND_3', gnd],
          ['COP_OUT', 'PLUG_TOP', 'red'],
          ['PLUG_GND', 'GND_4', gnd],
          // Bodi: Lampu Kepala DC + Relay + Sein + Klakson
          ['FUSE_OUT', 'RLY_30', 'red'],
          ['IGN_OUT', 'SWR_LIGHT_IN', ignOut],
          ['SWR_SENJA_OUT', 'HEAD_SENJA', senjaC],
          ['SWR_SENJA_OUT', 'TAIL_SENJA', senjaC],
          ['SWR_HEAD_OUT', 'RLY_85', ignOut],
          ['RLY_86', 'GND_2', gnd],
          ['RLY_87', 'SWL_DIM_IN', 'yellow'],
          ['SWL_LO_OUT', 'HEAD_LO', loC],
          ['SWL_HI_OUT', 'HEAD_HI', hiC],
          ['SWL_HI_OUT', 'IND_HI_IN', hiC],
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
          ['HEAD_GND', 'GND_3', gnd],
          ['TURN_FL_GND', 'GND_3', gnd],
          ['TURN_FR_GND', 'GND_3', gnd],
          ['TURN_RL_GND', 'GND_4', gnd],
          ['TURN_RR_GND', 'GND_4', gnd],
          ['TAIL_GND', 'GND_4', gnd],
          ['IND_GND', 'GND_2', gnd],
        ])
      );
    },
  },
  {
    id: 'linked_full_bebek_ac',
    boardModule: 'ENGINE',
    linkedFullBike: true,
    slots: makeSlots('BEBEK_AC'),
    title: '🏍️ Full 1 Unit Motor Bebek AC Utuh (Mesin + Bodi Terhubung)',
    subtitle:
      'Mengaktifkan Mode Terhubung: CDI Bebek AC, Kill Switch 4-Pin, Starter Gigi Netral [N], Lampu Kepala AC Spul + Sinyal DC!',
    buildWires: (brand) => {
      const gnd: WireColorId = brand === 'HONDA' ? 'green' : 'black';
      const ignOut: WireColorId = brand === 'HONDA' ? 'black' : 'brown';
      const stWire: WireColorId = brand === 'HONDA' ? 'yellow_red' : 'blue_yellow';
      const coilWire: WireColorId = brand === 'HONDA' ? 'black_yellow' : 'orange';
      const flsOut: WireColorId = brand === 'HONDA' ? 'gray' : 'brown_white';
      const leftC: WireColorId = brand === 'HONDA' ? 'orange' : 'dark_brown';
      const rightC: WireColorId = brand === 'HONDA' ? 'light_blue' : 'dark_green';
      const hornWire: WireColorId = brand === 'HONDA' ? 'light_green' : 'pink';
      const loC: WireColorId = brand === 'HONDA' ? 'white' : 'green';
      const hiC: WireColorId = brand === 'HONDA' ? 'blue' : 'yellow';
      const senjaC: WireColorId = brand === 'HONDA' ? 'brown' : 'blue';
      return dedupeWires(
        mkWires([
          ['BAT_NEG', 'GND_1', gnd],
          ['ALT_GND', 'GND_1', gnd],
          ['REG_GND', 'GND_1', gnd],
          ['BAT_POS', 'FUSE_IN', 'red'],
          ['FUSE_OUT', 'IGN_IN', 'red'],
          ['ALT_WHITE', 'REG_WHITE', 'white'],
          ['REG_RED', 'FUSE_OUT', 'red'],
          // Mesin Bebek AC + Starter Netral [N]
          ['IGN_OUT', 'NEUTRAL_IND_POS', ignOut],
          ['NEUTRAL_GND', 'GND_2', gnd],
          ['BAT_POS', 'ST_RLY_30', 'red'],
          ['ST_RLY_87', 'ST_MOT_POS', 'red'],
          ['ST_MOT_GND', 'GND_4', gnd],
          ['IGN_OUT', 'ST_RLY_85', ignOut],
          ['ST_RLY_86', 'ST_BTN_1', stWire],
          ['ST_BTN_2', 'NEUTRAL_SW_OUT', 'light_green'],
          ['SPUL_CDI_AC', 'CDI_PWR', 'black_red'],
          ['PULSER_POS', 'CDI_PULSER', 'blue_yellow'],
          ['CDI_KILL', 'IGN_KILL', 'black_red'],
          ['IGN_KILL_GND', 'GND_2', gnd],
          ['CDI_GND', 'GND_3', gnd],
          ['CDI_COIL', 'COIL_POS', coilWire],
          ['COIL_GND', 'GND_3', gnd],
          ['COP_OUT', 'PLUG_TOP', 'red'],
          ['PLUG_GND', 'GND_4', gnd],
          // Bodi Penerangan AC + Sinyal DC
          ['ALT_YELLOW', 'REG_YELLOW', 'yellow'],
          ['REG_YELLOW', 'SWR_LIGHT_IN', 'yellow'],
          ['SWR_SENJA_OUT', 'HEAD_SENJA', senjaC],
          ['SWR_SENJA_OUT', 'TAIL_SENJA', senjaC],
          ['SWR_HEAD_OUT', 'SWL_DIM_IN', 'yellow'],
          ['SWL_LO_OUT', 'HEAD_LO', loC],
          ['SWL_HI_OUT', 'HEAD_HI', hiC],
          ['SWL_HI_OUT', 'IND_HI_IN', hiC],
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
          ['HEAD_GND', 'GND_3', gnd],
          ['TURN_FL_GND', 'GND_3', gnd],
          ['TURN_FR_GND', 'GND_3', gnd],
          ['TURN_RL_GND', 'GND_4', gnd],
          ['TURN_RR_GND', 'GND_4', gnd],
          ['TAIL_GND', 'GND_4', gnd],
          ['IND_GND', 'GND_2', gnd],
        ])
      );
    },
  },
  // ==================== MODUL 1: KELISTRIKAN BODI ====================
  {
    id: 'horn_brake_dc',
    boardModule: 'BODY',
    slots: makeSlots('MATIC_DC'),
    title: 'Job 1: Klakson & Lampu Rem (DC)',
    subtitle: 'Dasar rangkaian arus DC melalui Sekring & Kunci Kontak 2-Pin',
    buildWires: (brand) => {
      const gnd: WireColorId = brand === 'HONDA' ? 'green' : 'black';
      const ignOut: WireColorId = brand === 'HONDA' ? 'black' : 'brown';
      const hornWire: WireColorId = brand === 'HONDA' ? 'light_green' : 'pink';
      return mkWires([
        ['BAT_NEG', 'GND_1', gnd],
        ['BAT_POS', 'FUSE_IN', 'red'],
        ['FUSE_OUT', 'IGN_IN', 'red'],
        ['IGN_OUT', 'SWL_HORN_1', ignOut],
        ['SWL_HORN_2', 'HORN_A', hornWire],
        ['HORN_B', 'GND_3', gnd],
        ['IGN_OUT', 'SWR_BRAKE_IN', ignOut],
        ['IGN_OUT', 'BRK_REAR_IN', ignOut],
        ['SWR_BRAKE_OUT', 'TAIL_STOP', 'light_green'],
        ['BRK_REAR_OUT', 'TAIL_STOP', 'light_green'],
        ['TAIL_GND', 'GND_4', gnd],
      ]);
    },
  },
  {
    id: 'turn_signal_dc',
    boardModule: 'BODY',
    slots: makeSlots('MATIC_DC'),
    title: 'Job 2: Sistem Lampu Sein & Indikator',
    subtitle: 'Rangkaian Flasher (B & L), Saklar Sein Kiri/Kanan, dan Indikator Panel',
    buildWires: (brand) => {
      const gnd: WireColorId = brand === 'HONDA' ? 'green' : 'black';
      const ignOut: WireColorId = brand === 'HONDA' ? 'black' : 'brown';
      const flsOut: WireColorId = brand === 'HONDA' ? 'gray' : 'brown_white';
      const leftC: WireColorId = brand === 'HONDA' ? 'orange' : 'dark_brown';
      const rightC: WireColorId = brand === 'HONDA' ? 'light_blue' : 'dark_green';
      return mkWires([
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
        ['TURN_FL_GND', 'GND_3', gnd],
        ['TURN_FR_GND', 'GND_3', gnd],
        ['TURN_RL_GND', 'GND_4', gnd],
        ['TURN_RR_GND', 'GND_4', gnd],
        ['IND_GND', 'GND_2', gnd],
      ]);
    },
  },
  {
    id: 'lighting_ac_kiprok',
    boardModule: 'BODY',
    slots: makeSlots('BEBEK_AC'),
    title: 'Job 3: Penerangan Motor Bebek AC (Spul Kuning + Kiprok 4-Pin)',
    subtitle: 'Memakai Modul Spul & Kiprok Bebek AC — Lampu ikut RPM mesin & ditahan stabil Kiprok',
    autoEngineOn: true,
    buildWires: (brand) => {
      const gnd: WireColorId = brand === 'HONDA' ? 'green' : 'black';
      const loC: WireColorId = brand === 'HONDA' ? 'white' : 'green';
      const hiC: WireColorId = brand === 'HONDA' ? 'blue' : 'yellow';
      const senjaC: WireColorId = brand === 'HONDA' ? 'brown' : 'blue';
      return mkWires([
        ['BAT_NEG', 'GND_1', gnd],
        ['ALT_GND', 'GND_1', gnd],
        ['REG_GND', 'GND_1', gnd],
        ['ALT_WHITE', 'REG_WHITE', 'white'],
        ['REG_RED', 'FUSE_OUT', 'red'],
        ['FUSE_IN', 'BAT_POS', 'red'],
        ['ALT_YELLOW', 'REG_YELLOW', 'yellow'],
        ['REG_YELLOW', 'SWR_LIGHT_IN', 'yellow'],
        ['SWR_SENJA_OUT', 'HEAD_SENJA', senjaC],
        ['SWR_SENJA_OUT', 'TAIL_SENJA', senjaC],
        ['SWR_HEAD_OUT', 'SWL_DIM_IN', 'yellow'],
        ['SWL_LO_OUT', 'HEAD_LO', loC],
        ['SWL_HI_OUT', 'HEAD_HI', hiC],
        ['SWL_HI_OUT', 'IND_HI_IN', hiC],
        ['HEAD_GND', 'GND_3', gnd],
        ['IND_GND', 'GND_2', gnd],
        ['TAIL_GND', 'GND_4', gnd],
      ]);
    },
  },
  {
    id: 'lighting_matic_dc_relay',
    boardModule: 'BODY',
    slots: makeSlots('MATIC_DC'),
    title: 'Job 4: Penerangan Motor Matic Full DC + Relay + Cas',
    subtitle: 'Memakai Spul & Kiprok Matic DC (tanpa Kuning AC) — Lampu stabil dari Kontak + Relay',
    autoEngineOn: true,
    buildWires: (brand) => {
      const gnd: WireColorId = brand === 'HONDA' ? 'green' : 'black';
      const ignOut: WireColorId = brand === 'HONDA' ? 'black' : 'brown';
      const loC: WireColorId = brand === 'HONDA' ? 'white' : 'green';
      const hiC: WireColorId = brand === 'HONDA' ? 'blue' : 'yellow';
      const senjaC: WireColorId = brand === 'HONDA' ? 'brown' : 'blue';
      return mkWires([
        ['BAT_NEG', 'GND_1', gnd],
        ['ALT_GND', 'GND_1', gnd],
        ['REG_GND', 'GND_1', gnd],
        ['ALT_WHITE', 'REG_WHITE', 'white'],
        ['REG_RED', 'FUSE_OUT', 'red'],
        ['BAT_POS', 'FUSE_IN', 'red'],
        ['FUSE_OUT', 'IGN_IN', 'red'],
        ['FUSE_OUT', 'RLY_30', 'red'],
        ['IGN_OUT', 'SWR_LIGHT_IN', ignOut],
        ['SWR_SENJA_OUT', 'HEAD_SENJA', senjaC],
        ['SWR_SENJA_OUT', 'TAIL_SENJA', senjaC],
        ['SWR_HEAD_OUT', 'RLY_85', ignOut],
        ['RLY_86', 'GND_2', gnd],
        ['RLY_87', 'SWL_DIM_IN', 'yellow'],
        ['SWL_LO_OUT', 'HEAD_LO', loC],
        ['SWL_HI_OUT', 'HEAD_HI', hiC],
        ['SWL_HI_OUT', 'IND_HI_IN', hiC],
        ['HEAD_GND', 'GND_3', gnd],
        ['IND_GND', 'GND_2', gnd],
        ['TAIL_GND', 'GND_4', gnd],
      ]);
    },
  },
  {
    id: 'full_body_ac_dc',
    boardModule: 'BODY',
    slots: makeSlots('BEBEK_AC'),
    title: 'Job 5: Full Kelistrikan Bodi Bebek (Lampu AC + Sinyal DC)',
    subtitle: 'Gabungan Sinyal DC (Sein, Klakson, Rem) + Penerangan AC & Pengisian Kiprok Bebek',
    autoEngineOn: true,
    buildWires: (brand) => {
      const gnd: WireColorId = brand === 'HONDA' ? 'green' : 'black';
      const ignOut: WireColorId = brand === 'HONDA' ? 'black' : 'brown';
      const flsOut: WireColorId = brand === 'HONDA' ? 'gray' : 'brown_white';
      const leftC: WireColorId = brand === 'HONDA' ? 'orange' : 'dark_brown';
      const rightC: WireColorId = brand === 'HONDA' ? 'light_blue' : 'dark_green';
      const hornWire: WireColorId = brand === 'HONDA' ? 'light_green' : 'pink';
      const loC: WireColorId = brand === 'HONDA' ? 'white' : 'green';
      const hiC: WireColorId = brand === 'HONDA' ? 'blue' : 'yellow';
      const senjaC: WireColorId = brand === 'HONDA' ? 'brown' : 'blue';
      return mkWires([
        ['BAT_NEG', 'GND_1', gnd],
        ['ALT_GND', 'GND_1', gnd],
        ['REG_GND', 'GND_1', gnd],
        ['BAT_POS', 'FUSE_IN', 'red'],
        ['FUSE_OUT', 'IGN_IN', 'red'],
        ['ALT_WHITE', 'REG_WHITE', 'white'],
        ['REG_RED', 'FUSE_OUT', 'red'],
        ['ALT_YELLOW', 'REG_YELLOW', 'yellow'],
        ['REG_YELLOW', 'SWR_LIGHT_IN', 'yellow'],
        ['SWR_SENJA_OUT', 'HEAD_SENJA', senjaC],
        ['SWR_SENJA_OUT', 'TAIL_SENJA', senjaC],
        ['SWR_HEAD_OUT', 'SWL_DIM_IN', 'yellow'],
        ['SWL_LO_OUT', 'HEAD_LO', loC],
        ['SWL_HI_OUT', 'HEAD_HI', hiC],
        ['SWL_HI_OUT', 'IND_HI_IN', hiC],
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
        ['HEAD_GND', 'GND_3', gnd],
        ['TURN_FL_GND', 'GND_3', gnd],
        ['TURN_FR_GND', 'GND_3', gnd],
        ['TURN_RL_GND', 'GND_4', gnd],
        ['TURN_RR_GND', 'GND_4', gnd],
        ['TAIL_GND', 'GND_4', gnd],
        ['IND_GND', 'GND_2', gnd],
      ]);
    },
  },

  // ==================== MODUL 2: MESIN MATIC DC vs BEBEK AC ====================
  {
    id: 'starter_matic_safety',
    boardModule: 'ENGINE',
    slots: makeSlots('MATIC_DC'),
    title: 'Job 6: Starter Elektrik Pengaman Matic (Rem + Standar)',
    subtitle: 'Paket Matic DC: Kontak ON + Rem Ditarik + Standar Samping Naik -> Bendik & Dinamo',
    buildWires: (brand) => {
      const gnd: WireColorId = brand === 'HONDA' ? 'green' : 'black';
      const ignOut: WireColorId = brand === 'HONDA' ? 'black' : 'brown';
      const stWire: WireColorId = brand === 'HONDA' ? 'yellow_red' : 'blue_yellow';
      return mkWires([
        ['BAT_NEG', 'GND_1', gnd],
        ['BAT_POS', 'FUSE_IN', 'red'],
        ['FUSE_OUT', 'IGN_IN', 'red'],
        ['BAT_POS', 'ST_RLY_30', 'red'],
        ['ST_RLY_87', 'ST_MOT_POS', 'red'],
        ['ST_MOT_GND', 'GND_4', gnd],
        ['IGN_OUT', 'SWR_BRAKE_IN', ignOut],
        ['SWR_BRAKE_OUT', 'ST_RLY_85', 'light_green'],
        ['ST_RLY_86', 'ST_BTN_1', stWire],
        ['ST_BTN_2', 'SIDE_SW_1', stWire],
        ['SIDE_SW_2', 'GND_2', gnd],
      ]);
    },
  },
  {
    id: 'matic_dc_cdi_ignition',
    boardModule: 'ENGINE',
    slots: makeSlots('MATIC_DC'),
    title: 'Job 7: Pengapian Motor Matic DC (CDI Matic + Pin SW Standar)',
    subtitle: 'CDI Matic DC memiliki pin khusus SW Standar: Standar Turun -> Api Busi & Mesin Mati!',
    buildWires: (brand) => {
      const gnd: WireColorId = brand === 'HONDA' ? 'green' : 'black';
      const ignOut: WireColorId = brand === 'HONDA' ? 'black' : 'brown';
      const coilWire: WireColorId = brand === 'HONDA' ? 'black_yellow' : 'orange';
      return mkWires([
        ['BAT_NEG', 'GND_1', gnd],
        ['ALT_GND', 'GND_1', gnd],
        ['BAT_POS', 'FUSE_IN', 'red'],
        ['FUSE_OUT', 'IGN_IN', 'red'],
        ['IGN_OUT', 'CDI_PWR', ignOut],
        ['PULSER_POS', 'CDI_PULSER', 'blue_yellow'],
        ['CDI_SIDESTAND', 'SIDE_SW_1', 'light_green'],
        ['SIDE_SW_2', 'GND_2', gnd],
        ['CDI_GND', 'GND_3', gnd],
        ['CDI_COIL', 'COIL_POS', coilWire],
        ['COIL_GND', 'GND_3', gnd],
        ['COP_OUT', 'PLUG_TOP', 'red'],
        ['PLUG_GND', 'GND_4', gnd],
      ]);
    },
  },
  {
    id: 'bebek_ac_cdi_pure',
    boardModule: 'ENGINE',
    slots: makeSlots('BEBEK_AC'),
    title: 'Job 8: Pengapian Motor Bebek AC Murni (Tanpa Aki & Tanpa Standar)',
    subtitle: 'Paket Bebek AC: Hidup langsung dari Spul Hitam-Merah 200V~ via Engkol, dimatikan Kill Kontak 4-Pin!',
    buildWires: (brand) => {
      const gnd: WireColorId = brand === 'HONDA' ? 'green' : 'black';
      const coilWire: WireColorId = brand === 'HONDA' ? 'black_yellow' : 'orange';
      return mkWires([
        ['ALT_GND', 'GND_1', gnd],
        ['SPUL_CDI_AC', 'CDI_PWR', 'black_red'],
        ['PULSER_POS', 'CDI_PULSER', 'blue_yellow'],
        ['CDI_GND', 'GND_3', gnd],
        // Kill Switch Bebek AC via Kunci Kontak 4-Pin (KILL <-> KILL GND saat OFF)
        ['CDI_KILL', 'IGN_KILL', 'black_red'],
        ['IGN_KILL_GND', 'GND_2', gnd],
        // Koil & Busi
        ['CDI_COIL', 'COIL_POS', coilWire],
        ['COIL_GND', 'GND_3', gnd],
        ['COP_OUT', 'PLUG_TOP', 'red'],
        ['PLUG_GND', 'GND_4', gnd],
      ]);
    },
  },
  {
    id: 'full_engine_matic_dc',
    boardModule: 'ENGINE',
    slots: makeSlots('MATIC_DC'),
    title: 'Job 9: Full Mesin Motor Matic DC (Starter + CDI Matic + Cas)',
    subtitle: 'Paket Lengkap Matic DC: Tarik Rem & Start -> Hidup! Standar Turun -> Mesin Langsung Mati!',
    buildWires: (brand) => {
      const gnd: WireColorId = brand === 'HONDA' ? 'green' : 'black';
      const ignOut: WireColorId = brand === 'HONDA' ? 'black' : 'brown';
      const stWire: WireColorId = brand === 'HONDA' ? 'yellow_red' : 'blue_yellow';
      const coilWire: WireColorId = brand === 'HONDA' ? 'black_yellow' : 'orange';
      return mkWires([
        ['BAT_NEG', 'GND_1', gnd],
        ['ALT_GND', 'GND_1', gnd],
        ['REG_GND', 'GND_1', gnd],
        ['BAT_POS', 'FUSE_IN', 'red'],
        ['FUSE_OUT', 'IGN_IN', 'red'],
        ['ALT_WHITE', 'REG_WHITE', 'white'],
        ['REG_RED', 'FUSE_OUT', 'red'],
        // Starter Elektrik Matic
        ['BAT_POS', 'ST_RLY_30', 'red'],
        ['ST_RLY_87', 'ST_MOT_POS', 'red'],
        ['ST_MOT_GND', 'GND_4', gnd],
        ['IGN_OUT', 'SWR_BRAKE_IN', ignOut],
        ['SWR_BRAKE_OUT', 'ST_RLY_85', 'light_green'],
        ['ST_RLY_86', 'ST_BTN_1', stWire],
        ['ST_BTN_2', 'SIDE_SW_1', stWire],
        ['SIDE_SW_2', 'GND_2', gnd],
        // CDI Matic DC dengan Pin SW Standar Samping
        ['IGN_OUT', 'CDI_PWR', ignOut],
        ['PULSER_POS', 'CDI_PULSER', 'blue_yellow'],
        ['CDI_SIDESTAND', 'SIDE_SW_1', 'light_green'],
        ['CDI_GND', 'GND_3', gnd],
        ['CDI_COIL', 'COIL_POS', coilWire],
        ['COIL_GND', 'GND_3', gnd],
        ['COP_OUT', 'PLUG_TOP', 'red'],
        ['PLUG_GND', 'GND_4', gnd],
      ]);
    },
  },
  {
    id: 'full_engine_bebek_ac',
    boardModule: 'ENGINE',
    slots: makeSlots('BEBEK_AC'),
    title: 'Job 10: Full Mesin Motor Bebek AC (CDI AC + Starter Netral N + Cas)',
    subtitle: 'Paket Lengkap Bebek AC: Indikator Hijau [N] menyala & Starter hanya aktif saat Gigi Netral!',
    buildWires: (brand) => {
      const gnd: WireColorId = brand === 'HONDA' ? 'green' : 'black';
      const ignOut: WireColorId = brand === 'HONDA' ? 'black' : 'brown';
      const stWire: WireColorId = brand === 'HONDA' ? 'yellow_red' : 'blue_yellow';
      const coilWire: WireColorId = brand === 'HONDA' ? 'black_yellow' : 'orange';
      return mkWires([
        ['BAT_NEG', 'GND_1', gnd],
        ['ALT_GND', 'GND_1', gnd],
        ['REG_GND', 'GND_1', gnd],
        ['BAT_POS', 'FUSE_IN', 'red'],
        ['FUSE_OUT', 'IGN_IN', 'red'],
        ['ALT_WHITE', 'REG_WHITE', 'white'],
        ['REG_RED', 'FUSE_OUT', 'red'],
        // Indikator Netral [N] & Starter Pengaman Gigi Netral (tanpa harus tarik rem!)
        ['IGN_OUT', 'NEUTRAL_IND_POS', ignOut],
        ['NEUTRAL_GND', 'GND_2', gnd],
        ['BAT_POS', 'ST_RLY_30', 'red'],
        ['ST_RLY_87', 'ST_MOT_POS', 'red'],
        ['ST_MOT_GND', 'GND_4', gnd],
        ['IGN_OUT', 'ST_RLY_85', ignOut],
        ['ST_RLY_86', 'ST_BTN_1', stWire],
        ['ST_BTN_2', 'NEUTRAL_SW_OUT', 'light_green'],
        // Pengapian Bebek AC + Kill Switch Kontak 4-Pin
        ['SPUL_CDI_AC', 'CDI_PWR', 'black_red'],
        ['PULSER_POS', 'CDI_PULSER', 'blue_yellow'],
        ['CDI_KILL', 'IGN_KILL', 'black_red'],
        ['IGN_KILL_GND', 'GND_2', gnd],
        ['CDI_GND', 'GND_3', gnd],
        ['CDI_COIL', 'COIL_POS', coilWire],
        ['COIL_GND', 'GND_3', gnd],
        ['COP_OUT', 'PLUG_TOP', 'red'],
        ['PLUG_GND', 'GND_4', gnd],
      ]);
    },
  },
];
