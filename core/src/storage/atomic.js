import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

// Di Windows, rename bisa gagal sesaat kalau file tujuan sedang dibuka
// proses lain (antivirus, indexer). Coba ulang dengan jeda yang membesar.
const RETRYABLE = new Set(['EPERM', 'EACCES', 'EBUSY']);

async function renameWithRetry(from, to, attempts = 6) {
  for (let i = 0; ; i++) {
    try {
      return await rename(from, to);
    } catch (error) {
      if (!RETRYABLE.has(error.code) || i >= attempts - 1) throw error;
      await sleep(15 * 2 ** i);
    }
  }
}

// Tulis atomic: isi ditulis ke file sementara, di-flush ke disk, lalu di-rename.
// Pembaca hanya pernah melihat versi lama atau versi baru yang utuh.
export async function writeJsonAtomic(file, data) {
  await mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  try {
    const handle = await open(tmp, 'w');
    try {
      await handle.writeFile(JSON.stringify(data, null, 2) + '\n', 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await renameWithRetry(tmp, file);
  } catch (error) {
    await rm(tmp, { force: true });
    throw error;
  }
}

// Mengembalikan null kalau file belum ada.
export async function readJson(file) {
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  return JSON.parse(text);
}

// Antrean per kunci: operasi dengan kunci sama dijalankan berurutan,
// sehingga autosave yang beruntun tidak saling menimpa.
const queues = new Map();

export function withLock(key, task) {
  const previous = queues.get(key) ?? Promise.resolve();
  const run = previous.then(task, task);
  const tail = run.catch(() => {});
  queues.set(key, tail);
  tail.then(() => {
    if (queues.get(key) === tail) queues.delete(key);
  });
  return run;
}
