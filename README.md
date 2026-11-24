# 🏍️ SiElekMotor | Simulasi Elektronik Sepeda Motor

<p align="center">
  <b>Media Pembelajaran Interaktif Sistem Kelistrikan Sepeda Motor untuk SMK Teknik dan Bisnis Sepeda Motor (TBSM / TSM)</b><br>
  Dioptimalkan untuk <i>Interactive Flat Panel (Layar Sentuh 70 Inci)</i> dan Komputer/Laptop Praktikum.
</p>

---

## 📋 Tentang Aplikasi

**SiElekMotor** adalah platform simulator kelistrikan sepeda motor berbasis web yang dirancang khusus untuk memenuhi standar kurikulum SMK Otomotif (TBSM) dan Uji Kompetensi Keahlian (UKK). Aplikasi ini mensimulasikan sistem kelistrikan motor nyata dengan akurasi fisika komponen, tanpa memanjakan siswa dengan indikator instan sehingga melatih keterampilan diagnosis mandiri menggunakan alat ukur Multimeter (AVO).

### 🌟 Fitur Utama

1. **Dua Modul Praktikum + Mode Terhubung:**
   * **Modul 1 (Sistem Bodi Kelistrikan):** Lampu kepala (Jauh/Dekat & Senja DRL), lampu kota/rem belakang, sein depan & belakang, flasher, klakson, saklar kombinasi kiri/kanan, kunci kontak, aki 12V, dan sekring 10A.
   * **Modul 2 (Sistem Starter & Pengapian):** Spul magnet (Bebek AC / Matic DC), CDI modular (AC/DC), koil pengapian, busi, pulser, relay starter (bendik), dinamo starter, switch standar samping, dan engkol (*kick starter*).
   * **🔗 Mode Terhubung (Full Motor):** Menggabungkan kelistrikan bodi dan mesin secara real-time. Jika mesin hidup, alternator mengisi aki melalui kiprok.

2. **🎲 Bank Resep UKK Acak (40 Skenario Masalah Nyata):**
   * **Kabel Putus Dalam (Open Wire):** Serabut tembaga putus di balik isolasi (Ohm OL).
   * **Korslet Rangka (Short-to-GND):** Kabel lecet ke sasis yang memutuskan sekring 10A.
   * **Soket Korosi / Jamur:** Drop tegangan tinggi (~18.5Ω) membuat lampu redup atau klakson serak.
   * **Saklar Kotor / Macet:** Saklar tertutup terus menguras aki semalaman.
   * **Kerusakan Komponen:** Busi mati, koil bocor, CDI jebol, bendik macet, flasher mati, atau aki soak.
   * **Kasus Ganda (Double / Compound Trouble):** Malpraktik jalur starter dan kabel pengisian putus disertai aki soak.
   * *Dilengkapi antrean anti-kembar sehingga setiap siswa di kelas mendapatkan kasus unik.*

3. **🎛️ Alat Ukur Workshop Nyata (Multimeter / AVO Meter):**
   * Mode **DCV** (Tegangan DC aki & sirkuit), **ACV** (Tegangan tinggi spul alternator), **OHM** (Tahanan komponen & buzzer kontinuitas), dan **DCA** (Arus listrik beban).
   * Probe kabel merah dan hitam yang dapat ditancapkan bebas ke semua socket terminal.

4. **⚡ Fisika Kelistrikan & Kapasitas Aki Dinamis (State of Charge):**
   * Pengisian dinamis dari kiprok regulator saat mesin hidup ($14.2\text{V}$).
   * Pengurasan aki saat beban menyala tanpa mesin.
   * Tegangan *cranking sag* anjlok saat aki tekor/soak ($<22\%$), menyebabkan dinamo starter gagal berputar.
   * Siswa wajib menggunakan multimeter untuk mendiagnosis aki (tidak ada indikator bocoran di papan).

5. **🎨 Desain Khusus Layar Sentuh 70 Inci (IFP):**
   * Tombol besar (*large touch targets*), soket magnetik yang nyaman disentuh ujung jari.
   * Visual lampu batok motor realistis dan stoplamp belakang modern.
   * Tiga gaya kabel: **〰️ Menjuntai (Curved)**, **📐 Rapi Siku (Orthogonal)**, dan **📏 Garis Lurus (Straight)**.

---

## 💻 Prasyarat Sistem

Sebelum menginstal, pastikan komputer/server Anda telah terpasang:
* **Node.js**: Versi `18.0.0` atau yang lebih baru (disarankan `Node.js 20 LTS`). [Unduh Node.js](https://nodejs.org/)
* **NPM**: Versi `9.x` atau lebih baru (otomatis terpasang bersama Node.js).
* **Web Browser Modern**: Google Chrome, Microsoft Edge, Mozilla Firefox, atau browser bawaan Android/Interactive Flat Panel.

---

## 🚀 Panduan Instalasi & Menjalankan

### 1. Clone Repositori
Buka Terminal / Command Prompt / Git Bash, lalu jalankan:
```bash
git clone https://github.com/kangdaqiq/simotorelek.git
cd simotorelek
```

### 2. Instal Dependensi
Pasang semua paket library yang dibutuhkan:
```bash
npm install
```

### 3. Jalankan Server Pengembangan (Development)
Untuk menjalankan simulator di lingkungan lokal:
```bash
npm run dev
```
Setelah berjalan, buka browser di alamat:
```
http://localhost:5173
```
> 💡 *Jika ingin diakses dari tablet / layar LED di jaringan Wi-Fi yang sama, jalankan dengan `npx vite --host` lalu akses IP komputer server.*

---

## 📦 Build untuk Produksi (Offline Deployment)

Jika ingin memasang simulator secara offline di sekolah tanpa koneksi internet:

```bash
# 1. Kompilasi TypeScript dan Build Vite
npm run build

# 2. Pratinjau hasil build lokal
npm run preview
```

Hasil kompilasi akan berada di folder `dist/`. Anda cukup membuka folder tersebut atau menempatkannya di server lokal (XAMPP / Nginx / Node static server) di laboratorium komputer SMK.

---

## 🛠️ Panduan Penggunaan Singkat

1. **Merakit Kabel (Jumper Wiring):**
   * Sentuh/klik soket asal (misal `BAT_POS`), lalu sentuh soket tujuan (misal `FUSE_IN`). Kabel jumper akan otomatis terhubung.
   * Untuk menghapus kabel: Klik tepat pada kabel atau titik soket terpasang.
2. **Menggunakan Multimeter:**
   * Klik tombol **📟 Multimeter** di pojok kanan bawah.
   * Putar selektor ke mode yang diinginkan (**DCV 20V**, **ACV 200V**, atau **OHM Ω / Buzzer**).
   * Tarik probe Merah dan Hitam ke terminal komponen yang ingin diuji.
3. **Memulai Uji Kompetensi (UKK Acak):**
   * Klik tombol **🎲 UKK Acak** di topbar atas.
   * Pilih cakupan ujian: **Modul 1 (Bodi)**, **Modul 2 (Mesin)**, atau **Full Motor**.
   * Siswa membaca keluhan pelanggan di kartu tugas, melakukan troubleshooting dengan multimeter, memperbaiki kabel/komponen, lalu klik **Selesaikan & Cek Hasil**.
4. **Panel Penguji / Guru:**
   * Klik tombol **🔧 Guru** di topbar untuk menginjeksi kerusakan tersembunyi secara manual (misal: aki tekor, busi mati, CDI putus, sekring lecet).

---

## 📁 Struktur Direktori

```text
elemotor/
├── public/                 # Favicon, logo sekolah, dan aset statis
│   ├── favicon.svg
│   └── logo.png
├── src/
│   ├── components/         # Komponen UI (TrainerBoard, EngineBoard, LampVisuals, Modals)
│   ├── data/               # Bank Resep UKK Acak, Standar Warna Kabel (Honda/Yamaha)
│   ├── engine/             # Circuit Solver (Fisika kelistrikan Kirchhoff & DC/AC Engine)
│   ├── types/              # Type definitions TypeScript
│   ├── utils/              # Generator audio bengkel interaktif (Synthesizer Web Audio)
│   ├── App.tsx             # Root container & State Management
│   └── main.tsx            # Entry point React
├── index.html              # HTML Shell
├── package.json            # Daftar dependensi & npm scripts
├── tsconfig.json           # Konfigurasi TypeScript
└── vite.config.ts          # Konfigurasi Vite bundler
```

---

## 📄 Lisensi & Hak Cipta

Dikembangkan untuk kemajuan pendidikan vokasi kejuruan teknik otomotif di Indonesia.  
Silakan digunakan, dikembangkan, dan dimanfaatkan secara bebas untuk pembelajaran di lingkungan SMK.
