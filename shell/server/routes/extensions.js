import express, { Router } from 'express';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { unzipSync } from 'fflate';
import { StorageError } from '@blogs/core';
import { listExtensions, optionsFor } from '@blogs/core/contracts/plugin';

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_FILES = 2000;
const MAX_BYTES = 50 * 1024 * 1024; // ukuran setelah diekstrak

const fail = (code, message) => new StorageError(code, message);

// Baca zip tema/plugin. Manifest boleh di akar zip atau di dalam satu folder
// pembungkus (bentuk zip yang umum saat sebuah folder dikompres).
function readPackage(buffer, manifestFile, schema) {
  let entries;
  try {
    entries = unzipSync(new Uint8Array(buffer));
  } catch {
    throw fail('INVALID', 'Berkas bukan zip yang valid.');
  }
  const paths = Object.keys(entries).filter((path) => !path.endsWith('/'));
  if (paths.length > MAX_FILES) throw fail('INVALID', `Zip berisi terlalu banyak berkas (maksimum ${MAX_FILES}).`);
  if (paths.reduce((sum, path) => sum + entries[path].length, 0) > MAX_BYTES) throw fail('INVALID', 'Isi zip terlalu besar (maksimum 50 MB).');

  let prefix = '';
  if (!paths.includes(manifestFile)) {
    const tops = new Set(paths.map((path) => path.split('/')[0]));
    const [top] = tops;
    if (tops.size !== 1 || !paths.includes(`${top}/${manifestFile}`)) {
      throw fail('INVALID', `Zip tidak berisi ${manifestFile}.`);
    }
    prefix = `${top}/`;
  }

  const files = new Map();
  for (const path of paths) {
    const relative = path.slice(prefix.length);
    // Tolak path yang bisa keluar dari folder tujuan.
    if (!relative || relative.startsWith('/') || relative.includes('\\') || /(^|\/)\.\.(\/|$)/.test(relative) || /^[a-zA-Z]:/.test(relative)) {
      throw fail('INVALID', `Zip berisi path yang tidak aman: ${path}`);
    }
    files.set(relative, entries[path]);
  }
  if (!files.has('index.js')) throw fail('INVALID', 'Zip tidak berisi index.js.');

  let info;
  try {
    info = schema.parse(JSON.parse(Buffer.from(files.get(manifestFile)).toString('utf8')));
  } catch (error) {
    throw fail('INVALID', `${manifestFile} tidak valid: ${error.message}`);
  }
  return { info, files };
}

// Router untuk satu jenis ekstensi (tema atau plugin):
//   GET    /          daftar yang terpasang, dengan statusnya
//   POST   /install   pasang dari zip (body = isi zip)
//   DELETE /:id       hapus
//
//   describe(info, settings) -> tambahan status per item (aktif, pengaturan, ...)
//   beforeRemove(id, settings) -> lempar error bila tidak boleh dihapus
//   afterRemove(id) -> bersih-bersih
export function extensionsRouter({ dir, manifestFile, schema, label, store, describe, beforeRemove, afterRemove }) {
  const router = Router();
  const list = () => listExtensions(dir, schema, manifestFile);

  router.get('/', async (req, res) => {
    const settings = await store.settings.get();
    res.json((await list()).map((info) => ({ ...info, ...describe(info, settings) })));
  });

  router.post(
    '/install',
    express.raw({ type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'], limit: '20mb' }),
    async (req, res) => {
      if (!Buffer.isBuffer(req.body) || !req.body.length) throw fail('INVALID', 'Kirim berkas zip.');
      const { info, files } = readPackage(req.body, manifestFile, schema);
      const existing = (await list()).find((item) => item.id === info.id);
      if (existing?.locked) throw fail('FORBIDDEN', `${label} "${existing.name}" bawaan sistem dan tidak bisa ditimpa.`);

      // Ekstrak ke folder sementara, lalu tukar, supaya tidak ada pemasangan setengah jadi.
      const target = join(dir, info.id);
      const staging = join(dir, `.memasang-${info.id}`);
      await rm(staging, { recursive: true, force: true });
      try {
        for (const [path, content] of files) {
          const file = join(staging, path);
          await mkdir(dirname(file), { recursive: true });
          await writeFile(file, content);
        }
        await rm(target, { recursive: true, force: true });
        await rename(staging, target);
      } finally {
        await rm(staging, { recursive: true, force: true });
      }
      res.status(201).json({ ...info, replaced: Boolean(existing) });
    },
  );

  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    if (!ID.test(id)) throw fail('INVALID', 'ID tidak valid.');
    const item = (await list()).find((entry) => entry.id === id);
    if (!item) throw fail('NOT_FOUND', `${label} tidak ditemukan.`);
    if (item.locked) throw fail('FORBIDDEN', `${label} "${item.name}" bawaan sistem dan tidak bisa dihapus.`);
    await beforeRemove?.(id, await store.settings.get());
    await rm(join(dir, id), { recursive: true, force: true });
    await afterRemove?.(id);
    res.status(204).end();
  });

  return router;
}

export const describePlugin = (info, settings) => ({
  enabled: Boolean(settings.plugins[info.id]?.enabled),
  options: optionsFor(info, settings.plugins[info.id]?.options),
});

export const describeTheme = (info, settings) => ({ active: settings.theme.active === info.id });
