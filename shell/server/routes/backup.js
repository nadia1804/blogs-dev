import express, { Router } from 'express';
import { copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { unzipSync, zipSync } from 'fflate';
import { schema, StorageError } from '@blogs/core';

const APP = 'blogs-cms';
const MARKER = 'backup.json';
// Tidak ikut backup: cache turunan (dibangun ulang otomatis) dan token.
const SKIP = new Set(['.index', '.secrets.json']);
// Berkas yang sudah terkompresi cukup disimpan tanpa dikompres lagi.
const STORED = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.zip', '.woff2']);

const fail = (code, message) => new StorageError(code, message);

async function collect(dir, prefix = '') {
  const files = {};
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.endsWith('.tmp')) continue;
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(files, await collect(join(dir, entry.name), path));
    else if (entry.isFile()) {
      const content = await readFile(join(dir, entry.name));
      files[path] = [new Uint8Array(content), { level: STORED.has(extname(entry.name).toLowerCase()) ? 0 : 6 }];
    }
  }
  return files;
}

async function renameWithRetry(from, to) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await rename(from, to);
    } catch (error) {
      if (attempt >= 5 || !['EPERM', 'EBUSY', 'EACCES', 'ENOTEMPTY'].includes(error.code)) throw error;
      await sleep(80 * 2 ** attempt);
    }
  }
}

// GET  /backup    unduh seluruh konten (folder data) sebagai satu zip
// POST /restore   pulihkan dari zip backup
//
// Backup berisi konten, pengaturan, media, dan draft. Token publish serta
// tema/plugin yang dipasang sendiri tidak ikut.
//
// Restore tidak menghapus apa pun: folder data yang lama diganti nama
// menjadi "data.sebelum-pulih-WAKTU" di sebelahnya, jadi selalu bisa
// dikembalikan dengan tangan.
export function backupRouter({ dataDir }) {
  const router = Router();

  router.get('/backup', async (req, res) => {
    const files = await collect(dataDir);
    const created = new Date().toISOString();
    files[MARKER] = [new TextEncoder().encode(JSON.stringify({ app: APP, version: 1, createdAt: created }, null, 2)), { level: 6 }];
    const zip = Buffer.from(zipSync(files));
    res
      .set({
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename="blogs-backup-${created.slice(0, 19).replace(/[:T]/g, '-')}.zip"`,
        'content-length': zip.length,
      })
      .end(zip);
  });

  router.post(
    '/restore',
    express.raw({ type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'], limit: '1gb' }),
    async (req, res) => {
      if (!Buffer.isBuffer(req.body) || !req.body.length) throw fail('INVALID', 'Kirim berkas zip backup.');
      let entries;
      try {
        entries = unzipSync(new Uint8Array(req.body));
      } catch {
        throw fail('INVALID', 'Berkas bukan zip yang valid.');
      }
      const paths = Object.keys(entries).filter((path) => !path.endsWith('/'));

      // Pastikan ini backup Blogs CMS yang utuh sebelum menyentuh data.
      let marker;
      try {
        marker = JSON.parse(Buffer.from(entries[MARKER]).toString('utf8'));
      } catch {}
      if (marker?.app !== APP) throw fail('INVALID', 'Zip ini bukan backup Blogs CMS.');
      let settings;
      try {
        settings = schema.settings.safeParse(JSON.parse(Buffer.from(entries['settings.json']).toString('utf8')));
      } catch {}
      if (!settings?.success) throw fail('INVALID', 'Backup tidak berisi settings.json yang valid.');
      for (const path of paths) {
        if (path.startsWith('/') || path.includes('\\') || /(^|\/)\.\.(\/|$)/.test(path) || /^[a-zA-Z]:/.test(path)) {
          throw fail('INVALID', `Backup berisi path yang tidak aman: ${path}`);
        }
      }

      const staging = `${dataDir}.memulihkan`;
      const previous = `${dataDir}.sebelum-pulih-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
      await rm(staging, { recursive: true, force: true });
      try {
        for (const path of paths) {
          if (path === MARKER || SKIP.has(path.split('/')[0])) continue;
          const file = join(staging, path);
          await mkdir(dirname(file), { recursive: true });
          await writeFile(file, entries[path]);
        }
        // Token publish tidak ada di backup: bawa dari data yang sekarang.
        await copyFile(join(dataDir, '.secrets.json'), join(staging, '.secrets.json')).catch(() => {});
        await renameWithRetry(dataDir, previous);
        try {
          await renameWithRetry(staging, dataDir);
        } catch (error) {
          await renameWithRetry(previous, dataDir); // batal: kembalikan data lama
          throw error;
        }
      } finally {
        await rm(staging, { recursive: true, force: true });
      }

      res.json({ files: paths.length - 1, createdAt: marker.createdAt ?? null, previous: basename(previous) });
    },
  );

  return router;
}
