import { join } from 'node:path';
import { readJson, withLock, writeJsonAtomic } from './atomic.js';

// Token dan rahasia lain disimpan di data/.secrets.json, terpisah dari
// settings.json: tidak ikut backup, tidak ikut repo, dan tidak pernah
// dikirim balik ke browser.
const KEYS = ['netlifyToken', 'vercelToken'];

export function createSecrets(dataDir) {
  const file = join(dataDir, '.secrets.json');
  const read = async () => (await readJson(file)) ?? {};

  return {
    // Nilai sebuah rahasia, untuk dipakai di server saja.
    get: async (key) => (await read())[key] ?? '',

    // Rahasia mana yang sudah diisi, tanpa nilainya.
    async status() {
      const current = await read();
      return Object.fromEntries(KEYS.map((key) => [key, Boolean(current[key])]));
    },

    // Simpan sebagian rahasia. String kosong menghapus.
    set(patch) {
      return withLock(file, async () => {
        const next = await read();
        for (const key of KEYS) {
          if (typeof patch?.[key] !== 'string') continue;
          const value = patch[key].trim();
          if (value) next[key] = value;
          else delete next[key];
        }
        await writeJsonAtomic(file, next);
      });
    },
  };
}
