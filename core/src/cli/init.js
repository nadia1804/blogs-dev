// Menyiapkan folder data: settings, post type bawaan, dan aset brand.
// Aman dijalankan berulang: yang sudah ada tidak ditimpa.
import { copyFile, mkdir, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from '../storage/index.js';
import { BRAND_ASSETS, DEFAULT_NAVIGATION, DEFAULT_POST_TYPES, DEFAULT_SETTINGS } from '../defaults/index.js';

const coreDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const exists = (path) => access(path).then(() => true, () => false);

export async function initData(dataDir) {
  const store = createStore(dataDir);
  const report = [];

  for (const assetPath of Object.values(BRAND_ASSETS)) {
    const target = join(dataDir, assetPath);
    if (await exists(target)) continue;
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(coreDir, 'assets/brand', assetPath.split('/').pop()), target);
    report.push(`aset   ${assetPath}`);
  }

  if (!(await store.adapter.read('settings.json'))) {
    await store.settings.save(DEFAULT_SETTINGS);
    report.push('buat   settings.json');
  }

  for (const type of DEFAULT_POST_TYPES) {
    if (await store.postTypes.get(type.id)) continue;
    await store.postTypes.create(type);
    report.push(`buat   post-types/${type.id}.json`);
  }

  for (const menu of DEFAULT_NAVIGATION) {
    if (await store.navigation.get(menu.id)) continue;
    await store.navigation.create(menu);
    report.push(`buat   navigation/${menu.id}.json`);
  }

  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dataDir = resolve(process.argv[2] ?? 'data');
  const report = await initData(dataDir);
  console.log(report.length ? report.join('\n') : 'Data sudah lengkap, tidak ada yang diubah.');
}
