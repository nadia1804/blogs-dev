// Server shell. Satu proses, satu port:
//   --dev  : UI dilayani Vite (hot reload) sebagai middleware
//   tanpa  : UI dilayani dari hasil build di shell/.build
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app.js';

const shellDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = resolve(process.env.BLOGS_DATA ?? join(shellDir, '../data'));
const port = Number(process.env.PORT ?? 5170);
const dev = process.argv.includes('--dev');

const { app } = createApp({
  dataDir,
  themesDir: join(shellDir, '../themes'),
  pluginsDir: join(shellDir, '../plugins'),
  previewDir: join(shellDir, '../preview'),
  distDir: join(shellDir, '../dist'),
});
const server = createServer(app);

if (dev) {
  const { createServer: createVite } = await import('vite');
  const vite = await createVite({
    configFile: join(shellDir, 'vite.config.js'),
    root: join(shellDir, 'ui'),
    appType: 'spa',
    server: { middlewareMode: true, hmr: { server } },
  });
  app.use(vite.middlewares);
} else {
  const buildDir = join(shellDir, '.build');
  if (!existsSync(join(buildDir, 'index.html'))) {
    console.error('UI belum di-build. Jalankan: npm run build --workspace shell');
    process.exit(1);
  }
  app.use(express.static(buildDir));
  // Semua path lain adalah rute UI (layer workspace).
  app.use((req, res) => res.sendFile(join(buildDir, 'index.html')));
}

// Hanya menerima koneksi dari komputer ini.
server.listen(port, '127.0.0.1', () => {
  console.log(`Blogs CMS shell: http://localhost:${port}  (data: ${dataDir})`);
});
