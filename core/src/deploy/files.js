import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const SKIP = new Set(['.blogs-build']); // penanda internal builder

// Semua berkas di folder hasil build, dengan path gaya web dan hash SHA-1
// (dipakai host untuk mengenali berkas yang sudah pernah diunggah).
export async function collectFiles(dir) {
  const files = [];
  const walk = async (current, prefix) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue;
      const full = join(current, entry.name);
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, path);
      } else if (entry.isFile()) {
        const content = await readFile(full);
        files.push({ path, full, size: content.length, sha1: createHash('sha1').update(content).digest('hex') });
      }
    }
  };
  await walk(dir, '');
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export class DeployError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DeployError';
  }
}

// Panggil API host. Pesan error memuat jawaban host, tapi tidak pernah
// memuat token.
export async function call(fetchImpl, url, { token, method = 'GET', headers = {}, body } = {}) {
  let response;
  try {
    response = await fetchImpl(url, { method, headers: { authorization: `Bearer ${token}`, ...headers }, body });
  } catch (error) {
    throw new DeployError(`Tidak bisa menghubungi ${new URL(url).host}: ${error.message}`);
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!response.ok) {
    const reason = data?.error?.message ?? data?.message ?? text.slice(0, 200) ?? '';
    const hint = response.status === 401 || response.status === 403 ? ' Periksa token dan hak aksesnya.' : response.status === 404 ? ' Periksa ID situs atau nama proyeknya.' : '';
    const error = new DeployError(`${new URL(url).host} menolak permintaan (${response.status}). ${reason}${hint}`.trim());
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}
