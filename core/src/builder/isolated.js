import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const runner = fileURLToPath(new URL('../cli/run-build.js', import.meta.url));

// build() di proses Node tersendiri. Dipakai proses yang berumur panjang
// (server shell), dengan dua alasan:
//   1. Node menyimpan modul yang sudah dimuat. Di proses baru, kode tema
//      selalu dibaca ulang, jadi tema yang baru dipasang atau diubah
//      langsung berlaku tanpa menyalakan ulang server.
//   2. Tema adalah kode pihak ketiga. Kalau tema macet atau gagal, server
//      tidak ikut jatuh.
export async function buildIsolated(options) {
  try {
    const { stdout } = await run(process.execPath, [runner, JSON.stringify(options)], {
      maxBuffer: 32 * 1024 * 1024,
      timeout: 120_000,
    });
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(error.stderr || error.message);
  }
}
