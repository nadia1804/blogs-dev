import { readdir, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { readJson, writeJsonAtomic } from './atomic.js';
import { forbidden } from './errors.js';

// Kontrak adapter penyimpanan. Shell memakai adapter ini (filesystem);
// shell GitHub nanti mengimplementasikan kontrak yang sama lewat GitHub API.
//
//   read(path)        -> object | null
//   write(path, data) -> void
//   remove(path)      -> void
//   list(dir)         -> string[]   (nama file .json tanpa ekstensi)
//   key(path)         -> string     (kunci unik untuk antrean tulis)
export function createFsAdapter(rootDir) {
  const root = resolve(rootDir);

  // Semua path harus tetap berada di dalam folder data.
  function toAbsolute(relativePath) {
    const absolute = resolve(root, relativePath);
    if (absolute !== root && !absolute.startsWith(root + sep)) {
      throw forbidden(`Path di luar folder data: ${relativePath}`);
    }
    return absolute;
  }

  return {
    root,
    key: (path) => toAbsolute(path),
    read: (path) => readJson(toAbsolute(path)),
    write: (path, data) => writeJsonAtomic(toAbsolute(path), data),
    remove: (path) => rm(toAbsolute(path), { force: true }),
    async list(dir) {
      let entries;
      try {
        entries = await readdir(toAbsolute(dir), { withFileTypes: true });
      } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
      }
      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => entry.name.slice(0, -5));
    },
  };
}
