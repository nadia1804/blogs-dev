import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { escapeHtml, raw } from '../util/html.js';

// Ikon sebagai SVG inline. Hanya ikon yang benar-benar dipakai halaman yang
// ikut ke HTML; situs tidak memuat pack ikon atau JavaScript.
//
// Dua pack, dibedakan lewat awalan nama:
//   "house"          Lucide (tanpa awalan)
//   "tabler:school"  Tabler Icons, pack kedua dengan lebih banyak ikon pendidikan
// Keduanya bergaris 24x24 dengan tebal yang sama, jadi serasi bila dicampur.

const require = createRequire(import.meta.url);
// Paket Tabler hanya membuka isi folder icons/ lewat "exports", jadi folder
// paketnya dicari dari satu berkas ikon yang pasti ada.
const tablerDir = () => join(dirname(require.resolve('@tabler/icons/outline/school.svg')), '../..');
const PACKS = {
  lucide: () => join(dirname(require.resolve('lucide-static/package.json')), 'icons'),
  tabler: () => join(tablerDir(), 'icons/outline'),
};
const NAME = /^[a-z0-9-]+$/;
const cache = new Map();

// Pisahkan "tabler:school" menjadi { pack, name }.
export function parseIcon(value) {
  const [first, second] = String(value ?? '').split(':');
  return second === undefined ? { pack: 'lucide', name: first } : { pack: first, name: second };
}

// Isi <svg> sebuah ikon (tanpa tag pembungkusnya), atau null bila tidak dikenal.
export function iconBody(value) {
  const { pack, name } = parseIcon(value);
  if (!PACKS[pack] || !NAME.test(name)) return null;
  const key = `${pack}:${name}`;
  if (!cache.has(key)) {
    let body = null;
    try {
      const svg = readFileSync(join(PACKS[pack](), `${name}.svg`), 'utf8');
      body = svg
        .slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'))
        .replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/, '') // bingkai kosong Tabler
        .replace(/\s+/g, ' ')
        .trim();
    } catch {}
    cache.set(key, body);
  }
  return cache.get(key);
}

const SVG_ATTRS =
  'xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export const iconSvg = (body, className = '') => `<svg class="${escapeHtml(className)}" ${SVG_ATTRS} aria-hidden="true">${body}</svg>`;

// icon('house', 'size-5')  -> SVG inline, atau string kosong bila tidak dikenal.
export function icon(name, className = '') {
  const body = iconBody(name);
  return raw(body ? iconSvg(body, className) : '');
}

// Katalog Tabler untuk pemilih ikon di shell: nama, kata kunci, kategori,
// dan isi SVG tiap ikon.
let catalog = null;
export function tablerCatalog() {
  if (!catalog) {
    const meta = JSON.parse(readFileSync(join(tablerDir(), 'icons.json'), 'utf8'));
    catalog = Object.values(meta)
      .filter((entry) => entry.styles?.outline && entry.category !== 'Brand')
      .map((entry) => ({ name: entry.name, tags: (entry.tags ?? []).join(' '), category: entry.category ?? '', body: iconBody(`tabler:${entry.name}`) }))
      .filter((entry) => entry.body);
  }
  return catalog;
}
