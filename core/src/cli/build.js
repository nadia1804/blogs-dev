// Membangun situs produksi ke folder dist.
//   node core/src/cli/build.js [folderData] [folderKeluaran]
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../builder/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

try {
  const result = await build({
    dataDir: resolve(process.argv[2] ?? resolve(root, 'data')),
    themesDir: resolve(root, 'themes'),
    outDir: resolve(process.argv[3] ?? resolve(root, 'dist')),
    mode: 'production',
  });
  for (const warning of result.warnings) console.warn(`peringatan: ${warning}`);
  console.log(`Selesai: ${result.pages} halaman dalam ${result.ms} ms.`);
} catch (error) {
  console.error(`Build gagal: ${error.message}`);
  process.exit(1);
}
