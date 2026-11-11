import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { escapeHtml, html, raw } from '../util/html.js';
import { field, resolveOptions } from './fields.js';

// KONTRAK PLUGIN
// ==============
// Sebuah plugin adalah folder `plugins/{id}/` berisi:
//
//   plugin.json   manifest (lihat `manifest` di bawah)
//   index.js      modul ESM dengan `export default { setup(api) }`
//
// setup(api) dipanggil sekali per build, hanya bila plugin diaktifkan.
//
// `api`:
//   options             nilai pengaturan plugin (default manifest + isian admin)
//   mode                'production' | 'preview'
//   settings            seluruh pengaturan situs (hanya baca)
//   url(path), abs(path), basePath, siteUrl
//   html, raw, escapeHtml   alat templating (util/html.js)
//
//   on('head', (ctx) => string)       HTML tambahan di dalam <head>
//   on('bodyEnd', (ctx) => string)    HTML tambahan sebelum </body>
//   on('page', (html, ctx) => string) mengubah HTML halaman yang sudah jadi
//   on('done', ({ outDir, write }) => void)
//                                     setelah semua halaman ditulis
//   addRoute({ path, title, index?, render(ctx) })
//                                     halaman tambahan; render() mengembalikan
//                                     isi <main>, dibungkus layout tema
//   provide(nama)                     memberi tahu tema bahwa sebuah fitur ada;
//                                     tema membacanya lewat ctx.features
//   warn(pesan)                       peringatan di hasil build
//
// Form pengaturan plugin dibuat shell dari `settings` di manifest, jadi
// tidak ada kode plugin yang berjalan di shell. Plugin dijalankan sebagai
// kode Node biasa saat build: hanya pasang plugin dari sumber tepercaya, dan
// plugin yang dipasang lewat zip harus berdiri sendiri (tanpa dependensi npm).

const HOOKS = ['head', 'bodyEnd', 'page', 'done'];

export const manifest = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().default(''),
  settings: z.array(field).default([]),
  locked: z.boolean().default(false), // plugin bawaan tidak bisa dihapus
});

export async function readManifest(dir, schema, file) {
  const parsed = schema.safeParse(JSON.parse(await readFile(join(dir, file), 'utf8')));
  if (!parsed.success) throw new Error(z.prettifyError(parsed.error));
  return parsed.data;
}

export const optionsFor = (info, saved) => resolveOptions(info.settings, saved);

// Muat semua plugin yang aktif dan kembalikan penjalan hook-nya.
// Plugin yang gagal dimuat atau hook yang melempar error tidak
// menggagalkan build; kejadiannya dicatat sebagai peringatan.
export async function loadPlugins(pluginsDir, env) {
  const hooks = Object.fromEntries(HOOKS.map((name) => [name, []]));
  const routes = [];
  const features = {};
  const warnings = [];
  const states = env.settings.plugins;

  const ids = (await readdir(pluginsDir, { withFileTypes: true }).catch(() => []))
    .filter((entry) => entry.isDirectory() && states[entry.name]?.enabled)
    .map((entry) => entry.name)
    .sort();

  for (const id of ids) {
    const dir = join(pluginsDir, id);
    try {
      const info = await readManifest(dir, manifest, 'plugin.json');
      const plugin = (await import(pathToFileURL(join(dir, 'index.js')).href)).default;
      if (typeof plugin?.setup !== 'function') throw new Error('index.js tidak mengekspor setup()');
      await plugin.setup({
        id,
        options: optionsFor(info, states[id].options),
        mode: env.mode,
        settings: env.settings,
        basePath: env.basePath,
        siteUrl: env.siteUrl,
        url: env.url,
        abs: env.abs,
        html,
        raw,
        escapeHtml,
        on(name, handler) {
          if (!hooks[name]) throw new Error(`Hook "${name}" tidak dikenal`);
          hooks[name].push({ id, handler });
        },
        addRoute: (route) => routes.push({ ...route, plugin: id }),
        provide: (name) => {
          features[name] = true;
        },
        warn: (message) => warnings.push(`Plugin ${info.name}: ${message}`),
      });
    } catch (error) {
      warnings.push(`Plugin "${id}" gagal dimuat: ${error.message}`);
    }
  }

  // Jalankan satu hook dengan aman.
  const guard = (entry, fallback, call) => {
    try {
      return call();
    } catch (error) {
      warnings.push(`Plugin "${entry.id}" gagal di sebuah hook: ${error.message}`);
      return fallback;
    }
  };
  const collect = (name) => (ctx) => hooks[name].map((entry) => String(guard(entry, '', () => entry.handler(ctx)) ?? '')).join('');

  return {
    routes,
    features,
    warnings,
    head: collect('head'),
    bodyEnd: collect('bodyEnd'),
    page: (pageHtml, ctx) =>
      hooks.page.reduce((current, entry) => String(guard(entry, current, () => entry.handler(current, ctx)) ?? current), pageHtml),
    async done(context) {
      for (const entry of hooks.done) {
        try {
          await entry.handler(context);
        } catch (error) {
          warnings.push(`Plugin "${entry.id}" gagal setelah build: ${error.message}`);
        }
      }
    },
  };
}

// Daftar tema atau plugin yang terpasang, dari manifestnya saja (kode
// tidak dijalankan). Dipakai shell.
export async function listExtensions(dir, schema, file) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const items = [];
  for (const entry of entries.filter((item) => item.isDirectory())) {
    try {
      items.push(await readManifest(join(dir, entry.name), schema, file));
    } catch (error) {
      items.push({ id: entry.name, name: entry.name, version: '?', description: '', broken: error.message, settings: [] });
    }
  }
  return items.sort((a, b) => a.name.localeCompare(b.name));
}
