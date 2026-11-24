import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3030,        // 👈 Ganti dengan port yang diinginkan (contoh: 3000, 8080, dll)
    strictPort: true,  // Opsional: jika port ini sibuk, Vite tidak akan lompat ke port lain
    host: true,        // Opsional: agar bisa dibuka dari HP/layar 70 inci lewat IP lokal
    watch: {
      ignored: ['/*.png'],
    },
  },
});
