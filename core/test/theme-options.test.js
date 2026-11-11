import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../src/builder/index.js';
import { icon, iconBody, tablerCatalog } from '../src/builder/icons.js';
import { headerFiles } from '../src/builder/caching.js';
import { initData } from '../src/cli/init.js';
import { loadTheme, themeOptions } from '../src/contracts/theme.js';
import { createStore } from '../src/index.js';

const themesDir = fileURLToPath(new URL('../../themes', import.meta.url));

async function setup(t, options) {
  const dir = await mkdtemp(join(tmpdir(), 'blogs-tema-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const dataDir = join(dir, 'data');
  await initData(dataDir);
  const store = createStore(dataDir);
  const settings = await store.settings.get();
  await store.settings.save({ ...settings, theme: { active: 'default', options: options ? { default: options } : {} } });

  await store.postTypes.create({ id: 'pelajaran', label: 'Pelajaran', icon: 'tabler:school' });
  const category = await store.categories('blog').create({ name: 'Tips', color: 'mint' });
  const author = await store.authors.create({
    name: 'Bu Rina',
    bio: 'Guru matematika.',
    links: [{ label: 'Instagram', url: 'https://instagram.com/burina' }],
  });
  for (const [type, title] of [['blog', 'Blog Satu'], ['blog', 'Blog Dua'], ['pelajaran', 'Pelajaran Satu'], ['blog', 'Blog Tiga']]) {
    await store.posts(type).create({
      title,
      status: 'published',
      authorIds: [author.id],
      categoryIds: type === 'blog' ? [category.id] : [],
    });
  }
  const outDir = join(dir, 'dist');
  const result = await build({ dataDir, themesDir, pluginsDir: join(dir, 'plugins'), outDir });
  return { result, read: (file) => readFile(join(outDir, file), 'utf8') };
}

test('pengaturan tema: default dari manifest dipakai bila belum diatur', async (t) => {
  const theme = await loadTheme(themesDir, 'default');
  const defaults = themeOptions(theme.manifest);
  assert.deepEqual(
    [defaults.navPreset, defaults.logoHeight, defaults.heroPreset, defaults.cardPreset, defaults.colsDesktop, defaults.footerPreset],
    ['bar', 28, 'boxed', 'featured', 4, 'brand'],
  );
  assert.equal(themeOptions(theme.manifest, { logoHeight: 40 }).logoHeight, 40);

  const { result, read } = await setup(t);
  assert.deepEqual(result.warnings.filter((warning) => !warning.includes('Alamat situs')), []);
  const home = await read('index.html');
  assert.match(home, /sticky top-0 z-40 border-b/, 'navbar bilah penuh');
  assert.match(home, /style="height:28px"/, 'logo lebih kecil dari sebelumnya');
  assert.match(home, /bg-gradient-to-br/, 'hero dalam kotak');
  assert.match(home, /grid-cols-2 sm:grid-cols-3 lg:grid-cols-4/);
  assert.match(home, /lg:col-span-7/, 'kartu besar');
  assert.match(home, /group-hover:scale-105/, 'gambar kartu membesar saat diarahkan kursor');
  assert.match(home, /size-\[18cqw\]/, 'ikon kartu mengikuti lebar kartu');
  assert.match(home, /© \d{4} Blogs/);
  assert.match(home, /<path d="M22 9l-10 -4l-10 4l10 4l10 -4v6" \/>/, 'ikon Tabler post type dirender');
});

test('pengaturan tema: preset dan nilai admin diterapkan', async (t) => {
  const { read } = await setup(t, {
    navPreset: 'capsule',
    logoHeight: 40,
    showBrandText: true,
    brandText: 'Ruang <Belajar>',
    heroPreset: 'plain',
    heroTypeLinks: false,
    heroButton: true,
    heroButtonLabel: 'Mulai',
    heroButtonLink: '/pelajaran/',
    cardPreset: 'uniform',
    homeCount: 2,
    colsMobile: 1,
    colsTablet: 2,
    colsDesktop: 5,
    homePostTypes: ['blog'],
    footerPreset: 'custom',
    footerText: '© [YYYY] [SITE] <b>tebal</b>\nDibuat dengan [HEART]',
  });
  const home = await read('index.html');
  assert.match(home, /sticky top-3 z-40 px-3/, 'navbar kapsul');
  assert.match(home, /rounded-full border border-base-300 bg-base-100\/90/);
  assert.match(home, /style="height:40px"/);
  assert.match(home, /<span>Ruang &lt;Belajar&gt;<\/span>/);
  assert.doesNotMatch(home, /bg-gradient-to-br/, 'hero tanpa kotak');
  assert.match(home, /href="\/pelajaran\/"[^>]*>Mulai/);
  assert.match(home, /grid-cols-1 sm:grid-cols-2 lg:grid-cols-5/);
  assert.doesNotMatch(home, /lg:col-span-7/, 'semua kartu seukuran');

  const cards = [...home.matchAll(/<h3[^>]*>\s*<a[^>]*>\s*([^<]+?)\s*<\/a>/g)].map((match) => match[1]);
  assert.equal(cards.length, 2, 'jumlah post sesuai pengaturan');
  assert.ok(cards.every((title) => title.startsWith('Blog')), 'hanya post type yang dipilih');

  const year = new Date().getFullYear();
  assert.match(home, new RegExp(`© ${year} Blogs &lt;b&gt;tebal&lt;/b&gt;<br>Dibuat dengan <span class="heartbeat"`), 'variabel diganti, teks admin di-escape');
});

test('arsip: profil author di atas tulisannya, dan pil kategori untuk menyaring', async (t) => {
  const { read } = await setup(t);
  const author = await read('author/bu-rina/index.html');
  assert.match(author, /<h1[^>]*>Bu Rina<\/h1>/);
  assert.match(author, /4 tulisan/);
  assert.match(author, /Guru matematika\./);
  assert.match(author, /href="https:\/\/instagram\.com\/burina"[^>]*>Instagram/);
  assert.ok(author.indexOf('Guru matematika.') < author.indexOf('Blog Satu'), 'profil sebelum daftar tulisan');
  assert.match(author, /Pelajaran Satu/, 'lintas post type');

  const archive = await read('blog/index.html');
  assert.match(archive, /aria-label="Saring menurut kategori"/);
  assert.match(archive, /aria-current="page"\s*>Semua</);
  assert.match(archive, /href="\/blog\/kategori\/tips\/"[^>]*>Tips/);
  const category = await read('blog/kategori/tips/index.html');
  assert.match(category, /ring-2 ring-current[^>]*aria-current="page"\s*>Tips/s);
  assert.doesNotMatch(await read('pelajaran/index.html'), /Saring menurut kategori/, 'tanpa kategori, tanpa pil');
});

test('ikon: dua pack, nama tak dikenal aman', () => {
  assert.match(String(icon('house', 'size-5')), /^<svg class="size-5"/);
  assert.match(String(icon('tabler:school')), /M22 9l-10 -4l-10 4l10 4l10 -4v6/);
  assert.doesNotMatch(String(icon('tabler:school')), /M0 0h24v24H0z/, 'bingkai kosong Tabler dibuang');
  assert.equal(String(icon('tabler:tidak-ada')), '');
  assert.equal(iconBody('../../rahasia'), null);
  assert.equal(iconBody('entah:house'), null);

  const catalog = tablerCatalog();
  assert.ok(catalog.length > 4000);
  assert.ok(catalog.find((entry) => entry.name === 'school').tags.includes('education'));
  assert.ok(catalog.every((entry) => entry.category !== 'Brand'), 'logo merek tidak ikut');
});

test('berkas header untuk publish sederhana', () => {
  const files = headerFiles();
  assert.deepEqual(Object.keys(files).sort(), ['.htaccess', '_headers', 'vercel.json']);
  assert.match(files['.htaccess'], /ErrorDocument 404 \/404\.html/);
  assert.match(files['.htaccess'], /m#\^\/media\/_opt\/#">\n\s+Header set Cache-Control "public, max-age=31536000, immutable"/);
  assert.match(files._headers, /\/assets\/\*\n  Cache-Control: public, max-age=2592000/);
  assert.equal(JSON.parse(files['vercel.json']).headers[0].source, '/media/_opt/(.*)');
});
