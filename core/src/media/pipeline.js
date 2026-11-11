import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { copyFile, mkdir, rename } from 'node:fs/promises';
import { dirname, extname, join, parse } from 'node:path';
import sharp from 'sharp';
import { imageSize } from '../builder/image-size.js';
import { slugify } from '../util/slug.js';
import { escapeHtml } from '../util/html.js';

// PIPELINE GAMBAR
// ===============
// Setiap gambar konten diubah ke WebP (dan AVIF bila diaktifkan) dalam
// beberapa lebar, sesuai Settings > Gambar. Browser lalu memilih ukuran
// yang pas lewat srcset.
//
// Bekerja dalam dua tahap, karena template tema berjalan sinkron sedangkan
// pengolahan gambar tidak:
//   1. Saat halaman dirender, describe()/picture() hanya MENCATAT varian
//      yang dibutuhkan dan langsung mengembalikan alamatnya.
//   2. Setelah semua halaman selesai, run() mengolah varian yang tercatat.
//
// Hasil olahan disimpan di folder cache. Nama berkas memuat hash isi gambar
// dan kualitasnya, jadi build berikutnya hanya mengolah gambar yang baru
// atau yang pengaturannya berubah.

const PASSTHROUGH = new Set(['.gif', '.svg']); // animasi dan vektor dibiarkan apa adanya
const CONCURRENCY = 4;

export function createImagePipeline({ dataDir, cacheDir, settings, url }) {
  const jobs = new Map(); // nama berkas keluaran -> pekerjaan
  const originals = new Set(); // berkas asli yang tetap harus ikut ke situs
  const described = new Map();
  const formats = [
    ...(settings.avif ? [{ ext: 'avif', quality: settings.avifQuality }] : []),
    { ext: 'webp', quality: settings.webpQuality },
  ];

  const isMedia = (src) => typeof src === 'string' && src.startsWith('media/');
  const optUrl = (name) => url(`/media/_opt/${name}`);

  // Rencana varian sebuah gambar, atau null bila gambar tidak diolah
  // (bukan berkas media, format dilewati, atau tidak terbaca).
  function describe(src) {
    if (!isMedia(src)) return null;
    if (described.has(src)) return described.get(src);

    let result = null;
    const file = join(dataDir, src);
    const size = PASSTHROUGH.has(extname(src).toLowerCase()) ? null : imageSize(file);
    if (size) {
      const content = readFileSync(file);
      const maxWidth = Math.min(size.width, settings.maxWidth);
      const widths = [...new Set([...settings.breakpoints.filter((width) => width < maxWidth), maxWidth])].sort((a, b) => a - b);
      const base = slugify(parse(src).name).slice(0, 50) || 'gambar';

      result = { width: maxWidth, height: Math.round((size.height * maxWidth) / size.width), sources: [] };
      for (const { ext, quality } of formats) {
        const hash = createHash('sha256').update(content).update(`${ext}q${quality}`).digest('hex').slice(0, 10);
        const variants = widths.map((width) => {
          const name = `${base}-${hash}-${width}.${ext}`;
          jobs.set(name, { file, width, ext, quality });
          return { width, url: optUrl(name) };
        });
        result.sources.push({ ext, variants, srcset: variants.map((variant) => `${variant.url} ${variant.width}w`).join(', ') });
      }
    }
    described.set(src, result);
    return result;
  }

  // Berkas asli yang dirujuk langsung (gambar berbagi, favicon, GIF).
  function original(src) {
    if (isMedia(src)) originals.add(src);
    return isMedia(src) ? url(`/${src}`) : src ?? '';
  }

  // Data gambar untuk tema: { src, width, height, srcset }.
  function image(src) {
    if (!src) return { src: '' };
    const info = describe(src);
    if (!info) {
      const size = isMedia(src) ? imageSize(join(dataDir, src)) ?? {} : {};
      return { src: original(src), ...size };
    }
    const webp = info.sources.at(-1);
    return { src: webp.variants.at(-1).url, width: info.width, height: info.height, srcset: webp.srcset };
  }

  // Elemen gambar siap pakai.
  //   alt, className   teks alt dan class untuk <img>
  //   sizes            lebar tampil gambar (atribut sizes); default selebar layar
  //   priority         true untuk gambar utama di atas lipatan (LCP)
  //   lazy             false untuk gambar kecil yang selalu terlihat (mis. logo)
  function picture(src, { alt = '', sizes = '100vw', className = '', priority = false, lazy = true } = {}) {
    if (!src) return '';
    const info = describe(src);
    const loading = priority ? 'fetchpriority="high"' : lazy ? 'loading="lazy" decoding="async"' : 'decoding="async"';
    const cls = className ? ` class="${escapeHtml(className)}"` : '';

    if (!info) {
      const plain = image(src);
      const dims = plain.width ? ` width="${plain.width}" height="${plain.height}"` : '';
      return `<img src="${escapeHtml(plain.src)}"${dims} alt="${escapeHtml(alt)}"${cls} ${loading}>`;
    }

    const webp = info.sources.at(-1);
    const responsive = webp.variants.length > 1 ? ` srcset="${webp.srcset}" sizes="${escapeHtml(sizes)}"` : '';
    const img = `<img src="${webp.variants.at(-1).url}"${responsive} width="${info.width}" height="${info.height}" alt="${escapeHtml(alt)}"${cls} ${loading}>`;
    const avif = info.sources.find((source) => source.ext === 'avif');
    return avif
      ? `<picture><source type="image/avif" srcset="${avif.srcset}" sizes="${escapeHtml(sizes)}">${img}</picture>`
      : img;
  }

  async function produce(name, job) {
    const cached = join(cacheDir, name);
    if (existsSync(cached)) return false;
    const temp = `${cached}.${process.pid}.tmp`;
    await sharp(job.file)
      .rotate() // terapkan orientasi EXIF sebelum metadata dibuang
      .resize({ width: job.width, withoutEnlargement: true })
      [job.ext]({ quality: job.quality })
      .toFile(temp);
    await rename(temp, cached);
    return true;
  }

  // Olah semua varian yang tercatat dan salin ke folder keluaran.
  async function run(outDir) {
    await mkdir(cacheDir, { recursive: true });
    const optDir = join(outDir, 'media/_opt');
    if (jobs.size) await mkdir(optDir, { recursive: true });

    let generated = 0;
    const queue = [...jobs];
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (let next = queue.pop(); next; next = queue.pop()) {
          const [name, job] = next;
          if (await produce(name, job)) generated += 1;
          await copyFile(join(cacheDir, name), join(optDir, name));
        }
      }),
    );

    for (const src of originals) {
      const target = join(outDir, src);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(join(dataDir, src), target).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
    return { variants: jobs.size, generated, reused: jobs.size - generated, originals: originals.size };
  }

  return { image, picture, original, run };
}
