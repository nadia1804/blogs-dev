import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { resolveOptions, section } from './fields.js';

// KONTRAK TEMA
// ============
// Sebuah tema adalah folder `themes/{id}/` berisi:
//
//   theme.json   manifest (lihat `manifest` di bawah)
//   index.js     modul ESM dengan `export default { layout, templates, blocks? }`
//   assets/      berkas statis; disalin ke /assets/theme/ (opsional)
//   styles.css   stylesheet, sesuai `styles` di manifest (opsional)
//
// index.js:
//   layout(ctx, content) -> dokumen HTML lengkap. WAJIB menyertakan
//                           `ctx.head` di dalam <head> dan `ctx.bodyEnd`
//                           sebelum </body> (SEO dan plugin masuk lewat sini).
//   templates.home(ctx)      beranda
//   templates.post(ctx)      satu post
//   templates.page(ctx)      satu page
//   templates.archive(ctx)   arsip post type, kategori, atau author
//   templates.notFound(ctx)  halaman 404
//   blocks?                  { [jenisBlock]: (block, ctx) => string } untuk
//                            mengganti perender block bawaan
//
// Semua fungsi mengembalikan string atau hasil html``. `ctx` berisi data
// halaman dan alat bantu; isinya didokumentasikan di builder/index.js.
//
// Tema dijalankan sebagai kode Node biasa saat build, jadi hanya pasang
// tema dari sumber tepercaya.

const TEMPLATES = ['home', 'post', 'page', 'archive', 'notFound'];

export const manifest = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().default(''),
  // 'tailwind' = dikompilasi Tailwind CLI (hanya class yang dipakai);
  // 'css' = disalin apa adanya.
  styles: z.object({ engine: z.enum(['tailwind', 'css']), entry: z.string().min(1) }).optional(),
  // ID menu Navigation yang ditampilkan tema ini.
  menus: z.array(z.string()).default([]),
  // Pengaturan tema, dikelompokkan per bagian (lihat contracts/fields.js).
  // Nilainya sampai ke template lewat ctx.options.
  settings: z.array(section).default([]),
  // Tema bawaan tidak bisa dihapus.
  locked: z.boolean().default(false),
});

export class ThemeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ThemeError';
  }
}

export async function loadTheme(themesDir, id) {
  const dir = join(themesDir, id);

  let info;
  try {
    info = JSON.parse(await readFile(join(dir, 'theme.json'), 'utf8'));
  } catch {
    throw new ThemeError(`Tema "${id}" tidak ditemukan atau theme.json-nya rusak (${dir}).`);
  }
  const parsed = manifest.safeParse(info);
  if (!parsed.success) throw new ThemeError(`theme.json tema "${id}" tidak valid:\n${z.prettifyError(parsed.error)}`);
  if (parsed.data.id !== id) throw new ThemeError(`ID di theme.json ("${parsed.data.id}") harus sama dengan nama folder ("${id}").`);

  let theme;
  try {
    theme = (await import(pathToFileURL(join(dir, 'index.js')).href)).default;
  } catch (error) {
    throw new ThemeError(`index.js tema "${id}" gagal dimuat: ${error.message}`);
  }
  if (typeof theme?.layout !== 'function') throw new ThemeError(`Tema "${id}" tidak mengekspor fungsi layout.`);
  const missing = TEMPLATES.filter((name) => typeof theme.templates?.[name] !== 'function');
  if (missing.length) throw new ThemeError(`Tema "${id}" belum punya template: ${missing.join(', ')}.`);

  return { dir, manifest: parsed.data, layout: theme.layout, templates: theme.templates, blocks: theme.blocks ?? {} };
}

// Nilai pengaturan sebuah tema: default dari manifest, ditimpa isian admin.
export const themeOptions = (info, saved) => resolveOptions(info.settings.flatMap((group) => group.fields), saved);
