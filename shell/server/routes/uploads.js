import express, { Router } from 'express';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, parse } from 'node:path';
import { StorageError } from '@blogs/core';
import { slugify } from '@blogs/core/slug';

// Jenis gambar yang diterima, beserta cara mengenali isinya dari byte awal.
// SVG sengaja ditolak: bisa membawa skrip.
const TYPES = {
  'image/jpeg': { ext: 'jpg', sniff: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', sniff: (b) => b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) },
  'image/gif': { ext: 'gif', sniff: (b) => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('latin1')) },
  'image/webp': {
    ext: 'webp',
    sniff: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
  'image/avif': { ext: 'avif', sniff: (b) => b.subarray(4, 12).toString('latin1') === 'ftypavif' },
};

const invalid = (message) => new StorageError('INVALID', message);

// POST /uploads?name=foto.jpg   (body = isi berkas, Content-Type = jenis gambar)
// Berkas disimpan apa adanya di data/media/uploads/TAHUN/BULAN/. Konversi ke
// WebP dan pembuatan ukuran lain dilakukan builder, bukan saat unggah.
// Nama berkas memuat hash isi, jadi unggahan yang sama tidak menumpuk.
export function uploadsRouter(dataDir) {
  const router = Router();

  router.post('/', express.raw({ type: Object.keys(TYPES), limit: '25mb' }), async (req, res) => {
    const type = TYPES[String(req.headers['content-type']).split(';')[0].trim()];
    if (!type) throw invalid('Jenis berkas tidak didukung. Gunakan JPG, PNG, WebP, GIF, atau AVIF.');
    const body = req.body;
    if (!Buffer.isBuffer(body) || body.length < 12) throw invalid('Berkas kosong atau rusak.');
    if (!type.sniff(body)) throw invalid('Isi berkas tidak cocok dengan jenisnya.');

    const base = slugify(parse(String(req.query.name ?? '')).name).slice(0, 60) || 'gambar';
    const hash = createHash('sha256').update(body).digest('hex').slice(0, 8);
    const now = new Date();
    const dir = `media/uploads/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    const name = `${base}-${hash}.${type.ext}`;

    await mkdir(join(dataDir, dir), { recursive: true });
    await writeFile(join(dataDir, dir, name), body);
    res.status(201).json({ path: `${dir}/${name}`, name, size: body.length });
  });

  return router;
}
