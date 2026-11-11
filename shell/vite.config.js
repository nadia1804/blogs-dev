import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// UI shell. Hasil build masuk ke shell/.build agar tidak tercampur
// dengan `dist/` di root (hasil produksi situs).
export default defineConfig({
  root: 'ui',
  plugins: [react(), tailwindcss()],
  build: { outDir: '../.build', emptyOutDir: true },
  server: { port: 5170 },
});
