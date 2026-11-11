import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../src/builder/index.js';
import { plainText, renderBlocks } from '../src/builder/render-blocks.js';
import { initData } from '../src/cli/init.js';
import { createStore } from '../src/index.js';

const themesDir = fileURLToPath(new URL('../../themes', import.meta.url));
const text = (value, styles = {}) => ({ type: 'text', text: value, styles });
const block = (type, content, extra = {}) => ({ id: Math.random().toString(36).slice(2), type, content, children: [], ...extra });
const image = (src) => ({ src: `/x/${src}`, width: 10, height: 5 });

test('perender block: struktur, daftar, dan keamanan', () => {
  const out = String(
    renderBlocks(
      [
        block('heading', [text('Judul <b>')], { props: { level: 1 } }),
        block('paragraph', [text('Tebal', { bold: true }), text(' & '), { type: 'link', href: 'javascript:alert(1)', content: [text('jahat')] }]),
        block('paragraph', [{ type: 'link', href: 'https://contoh.com', content: [text('luar')] }]),
        block('bulletListItem', [text('satu')], { children: [block('numberedListItem', [text('dalam')])] }),
        block('bulletListItem', [text('dua')]),
        block('paragraph', []),
        block('image', undefined, { props: { url: 'media/a.png', caption: '"kutip"' } }),
        block('tidakDikenal', [text('<script>x</script>')]),
      ],
      { image },
    ),
  );
  assert.match(out, /<h2>Judul &lt;b&gt;<\/h2>/, 'heading turun satu tingkat dan di-escape');
  assert.match(out, /<strong>Tebal<\/strong> &amp; <a href="#">jahat<\/a>/, 'href berbahaya dinetralkan');
  assert.match(out, /<a href="https:\/\/contoh\.com" rel="noopener">luar<\/a>/);
  assert.match(out, /<ul><li>satu<ol><li>dalam<\/li><\/ol><\/li><li>dua<\/li><\/ul>/);
  assert.match(out, /<img src="\/x\/media\/a\.png" width="10" height="5" alt="&quot;kutip&quot;"/);
  assert.doesNotMatch(out, /<script>/);
  assert.doesNotMatch(out, /<p><\/p>/, 'paragraf kosong tidak dirender');
  assert.equal(plainText([block('paragraph', [text('a'), text('b')]), block('quote', [text('c')])]), 'ab c');
});

async function setup(t) {
  const dir = await mkdtemp(join(tmpdir(), 'blogs-build-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const dataDir = join(dir, 'data');
  await initData(dataDir);
  const store = createStore(dataDir);
  const settings = await store.settings.get();
  await store.settings.save({ ...settings, site: { ...settings.site, url: 'https://contoh.com/' } });
  return { dir, dataDir, store, outDir: join(dir, 'dist') };
}

test('build produksi: halaman, SEO, dan hanya konten terbit', async (t) => {
  const { dataDir, store, outDir } = await setup(t);
  const category = await store.categories('blog').create({ name: 'Tips', color: 'mint' });
  const author = await store.authors.create({ name: 'Bu Rina' });
  await store.posts('blog').create({
    title: 'Halo <Dunia>',
    status: 'published',
    publishedAt: '2026-01-05T00:00:00.000Z',
    excerpt: 'Ringkasan pertama.',
    categoryIds: [category.id],
    authorIds: [author.id],
    content: [block('paragraph', [text('Isi tulisan.')])],
  });
  await store.posts('blog').create({ title: 'Masih Draft' });
  await store.posts('blog').create({ title: 'Nanti', status: 'scheduled', scheduledAt: '2999-01-01T00:00:00.000Z' });
  await store.pages.create({ title: 'Tentang', status: 'published', content: [block('paragraph', [text('Tentang kami.')])] });
  const page = await store.pages.get((await store.pages.list())[0].id);
  await store.navigation.update('header', {
    items: [
      { id: 'a', label: 'Beranda', target: { kind: 'home' } },
      { id: 'b', label: 'Tentang', target: { kind: 'page', id: page.id } },
      { id: 'c', label: 'Hilang', target: { kind: 'page', id: 'tidakada1234' } },
    ],
  });

  const result = await build({ dataDir, themesDir, outDir, mode: 'production' });
  assert.deepEqual(result.warnings, []);

  const read = (file) => readFile(join(outDir, file), 'utf8');
  const post = await read('blog/halo-dunia/index.html');
  assert.match(post, /<title>Halo &lt;Dunia&gt; \| Blogs<\/title>/);
  assert.match(post, /<link rel="canonical" href="https:\/\/contoh\.com\/blog\/halo-dunia\/">/);
  assert.match(post, /<meta name="robots" content="index,follow,max-image-preview:large,/);
  assert.match(post, /<meta property="og:image:width" content="1200">/);
  assert.match(post, /<meta property="article:section" content="Tips">/);
  assert.match(post, /"publisher":\{"@type":"Organization","name":"Blogs","logo":/);
  assert.match(post, /<meta name="description" content="Ringkasan pertama\.">/);
  assert.match(post, /"@type":"BlogPosting"/);
  assert.match(post, /"@type":"BreadcrumbList"/);
  assert.match(post, /<p>Isi tulisan\.<\/p>/);
  assert.match(post, /Bu Rina/);

  const home = await read('index.html');
  assert.match(home, /Ruang baca &amp; Media belajar/);
  assert.match(home, /Halo &lt;Dunia&gt;/);
  assert.doesNotMatch(home, /Masih Draft|Nanti/);
  assert.match(home, /href="\/tentang\/"[^>]*>Tentang</, 'menu merujuk page lewat ID');
  assert.doesNotMatch(home, /Hilang/, 'item menu tanpa tujuan tidak tampil');
  assert.match(home, /"@type":"WebSite"/);

  assert.match(await read('tentang/index.html'), /Tentang kami\./);
  assert.match(await read('blog/kategori/tips/index.html'), /Halo &lt;Dunia&gt;/);
  assert.match(await read('author/bu-rina/index.html'), /Halo &lt;Dunia&gt;/);
  assert.match(await read('404.html'), /noindex/);

  const sitemap = await read('sitemap.xml');
  assert.match(sitemap, /<loc>https:\/\/contoh\.com\/blog\/halo-dunia\/<\/loc>/);
  assert.doesNotMatch(sitemap, /404|masih-draft/);
  assert.match(await read('robots.txt'), /Sitemap: https:\/\/contoh\.com\/sitemap\.xml/);
  assert.match(await read('feed.xml'), /<title>Halo &lt;Dunia&gt;<\/title>/);

  const assets = await readdir(join(outDir, 'assets'));
  assert.ok(assets.some((name) => /^theme\.[0-9a-f]{10}\.css$/.test(name)));

  // Gambar: logo tampil lewat varian WebP; berkas asli hanya ikut bila
  // dirujuk langsung (gambar berbagi, favicon, logo di data terstruktur).
  const optimized = await readdir(join(outDir, 'media/_opt'));
  assert.ok(optimized.some((name) => /^logo-[0-9a-f]{10}-200\.webp$/.test(name)));
  assert.match(home, /<img src="\/media\/_opt\/logo-[0-9a-f]{10}-200\.webp" width="200" height="100"/);
  assert.deepEqual((await readdir(join(outDir, 'media/brand'))).sort(), ['icon.png', 'logo.png', 'og-default.png']);
  assert.equal(existsSync(join(outDir, 'media/uploads')), false, 'media yang tidak dipakai tidak ikut');
  assert.equal(result.images.variants, result.images.generated, 'build pertama mengolah semua varian');

  // Caching produksi.
  assert.match(home, /<script type="speculationrules">/);
  assert.doesNotMatch(home, /serviceWorker/, 'service worker nonaktif secara default');
  assert.match(await read('_headers'), /\/media\/_opt\/\*\n  Cache-Control: public, max-age=31536000, immutable/);
  assert.match(await read('sw.js'), /unregister/, 'saat nonaktif, sw.js mencabut service worker lama');

  const again = await build({ dataDir, themesDir, outDir, mode: 'production' });
  assert.equal(again.images.generated, 0, 'build kedua memakai cache gambar');
});

test('gambar konten: ukuran bertingkat sesuai pengaturan, dan AVIF bila aktif', async (t) => {
  const { dataDir, store, outDir } = await setup(t);
  const settings = await store.settings.get();
  await store.settings.save({
    ...settings,
    images: { ...settings.images, avif: true, breakpoints: [400, 800], maxWidth: 1000 },
    caching: { prefetch: false, serviceWorker: true },
  });
  await store.posts('blog').create({
    title: 'Bergambar',
    status: 'published',
    cover: { src: 'media/brand/og-default.png', alt: 'Ilustrasi "Blogs"' },
    content: [block('image', undefined, { props: { url: 'media/brand/og-default.png', caption: 'Keterangan' } })],
  });

  await build({ dataDir, themesDir, outDir, mode: 'production' });
  const post = await readFile(join(outDir, 'blog/bergambar/index.html'), 'utf8');
  const names = (await readdir(join(outDir, 'media/_opt'))).filter((name) => name.startsWith('og-default'));
  assert.deepEqual(names.map((name) => name.replace(/-[0-9a-f]{10}-/, '-')).sort(), [
    'og-default-1000.avif', 'og-default-1000.webp',
    'og-default-400.avif', 'og-default-400.webp',
    'og-default-800.avif', 'og-default-800.webp',
  ]);
  assert.match(post, /<picture><source type="image\/avif" srcset="[^"]+ 400w, [^"]+ 800w, [^"]+ 1000w"/);
  assert.match(post, /width="1000" height="525" alt="Ilustrasi &quot;Blogs&quot;"[^>]*fetchpriority="high"/, 'cover = gambar utama');
  assert.match(post, /<figure><picture>.*alt="Keterangan" loading="lazy"/s);
  assert.doesNotMatch(post, /speculationrules/);
  assert.match(post, /serviceWorker\.register\('\/sw\.js'\)/);
  assert.match(await readFile(join(outDir, 'sw.js'), 'utf8'), /caches\.open/);
});

test('build preview: draft tampil, awalan alamat dipakai, tidak terindeks', async (t) => {
  const { dataDir, store, outDir } = await setup(t);
  await store.posts('blog').create({ title: 'Masih Draft' });
  const result = await build({ dataDir, themesDir, outDir, mode: 'preview', basePath: '/preview' });

  const post = await readFile(join(outDir, 'blog/masih-draft/index.html'), 'utf8');
  assert.match(post, /noindex,nofollow/);
  assert.match(post, /href="\/preview\/blog\/"/);
  assert.match(post, /Preview · belum dipublikasikan/);
  assert.equal(Object.values(result.urlOf.posts)[0], '/preview/blog/masih-draft/');
  assert.match(await readFile(join(outDir, 'robots.txt'), 'utf8'), /Disallow: \//);
});

test('folder keluaran yang bukan hasil build tidak ditimpa', async (t) => {
  const { dir, dataDir } = await setup(t);
  const outDir = join(dir, 'penting');
  await mkdir(outDir);
  await writeFile(join(outDir, 'dokumen.txt'), 'jangan dihapus');
  await assert.rejects(build({ dataDir, themesDir, outDir }), /bukan hasil build/);
  assert.equal(await readFile(join(outDir, 'dokumen.txt'), 'utf8'), 'jangan dihapus');
});
