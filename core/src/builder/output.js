import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const MARKER = '.blogs-build';

// Folder keluaran build. Situs ditulis dulu ke folder sementara di
// sebelahnya, lalu ditukar sekaligus, jadi folder keluaran tidak pernah
// berisi situs setengah jadi.
//
// Pengaman: folder keluaran lama hanya dihapus bila kosong atau memang hasil
// build sebelumnya (ada berkas penanda). Folder lain tidak akan disentuh.
export async function openOutput(outDir) {
  const target = resolve(outDir);
  const staging = `${target}.building`;

  const existing = await readdir(target).catch(() => null);
  if (existing?.length && !existing.includes(MARKER)) {
    throw new Error(`Folder "${target}" berisi berkas yang bukan hasil build. Kosongkan dulu atau pilih folder lain.`);
  }

  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });
  await writeFile(join(staging, MARKER), `${new Date().toISOString()}\n`);

  return {
    dir: staging,
    async write(relativePath, content) {
      const file = join(staging, relativePath);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, content);
    },
    async commit() {
      // Di Windows, penghapusan/penggantian bisa gagal sesaat bila ada
      // proses yang sedang membaca folder lama.
      for (let attempt = 0; ; attempt++) {
        try {
          await rm(target, { recursive: true, force: true });
          await rename(staging, target);
          return;
        } catch (error) {
          if (attempt >= 5 || !['EPERM', 'EBUSY', 'ENOTEMPTY', 'EACCES'].includes(error.code)) throw error;
          await sleep(50 * 2 ** attempt);
        }
      }
    },
    abort: () => rm(staging, { recursive: true, force: true }),
  };
}
