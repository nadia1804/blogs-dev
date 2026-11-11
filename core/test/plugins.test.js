import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../src/builder/index.js';
import { initData } from '../src/cli/init.js';
import { listExtensions, manifest } from '../src/contracts/plugin.js';
import { createStore } from '../src/index.js';

const themesDir = fileURLToPath(new URL('../../themes', import.meta.url));
const pluginsDir = fileURLToPath(new URL('../../plugins', import.meta.url));
const text = (value) => ({ type: 'text', text: value, styles: {} });
const paragraph = (content) => ({ id: Math.random().toString(36), type: 'paragraph', props: {}, content, children: [] });

async function setup(t, plugins) {
  const dir = await mkdtemp(join(tmpdir(), 'blogs-plugin-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const dataDir = join(dir, 'data');
  await initData(dataDir);
  const store = createStore(dataDir);
  const settings = await store.settings.get();
  await store.settings.save({ ...settings, site: { ...settings.site, url: 'https://contoh.com' }, plugins });
  await store.posts('blog').create({
    title: 'Tulisan Bertautan',
    status: 'published',
    content: [
      paragraph([
        text('Lihat '),
        { type: 'link', href: 'https://luar.example/halaman?a=1&b=2', content: [text('situs luar')] },
        text(', '),
        { type: 'link', href: 'https://contoh.com/blog/', content: [text('situs sendiri')] },
        text(', dan '),
        { type: 'link', href: 'https://www.youtube.com/watch?v=abc', content: [text('video')] },
        text('. Kata unik: zamrudkhatulistiwa.'),
      ]),
    ],
  });
  return { dir, dataDir, outDir: join(dir, 'dist') };
}

const read = (outDir, file) => readFile(join(outDir, file), 'utf8');

test('tanpa plugin aktif: tidak ada jejak plugin di situs', async (t) => {
  const { dataDir, outDir } = await setup(t, {});
  const result = await build({ dataDir, themesDir, pluginsDir, outDir });
  const post = await read(outDir, 'blog/tulisan-bertautan/index.html');
  assert.match(post, /href="https:\/\/luar\.example\/halaman\?a=1&amp;b=2" rel="noopener"/);
  assert.doesNotMatch(post, /data-search-open|googletagmanager|adsbygoogle/);
  assert.equal(existsSync(join(outDir, 'go')), false);
  assert.equal(existsSync(join(outDir, 'pagefind')), false);
  assert.deepEqual(result.warnings, []);
});

test('safelink: tautan luar dialihkan, daftar tujuan tertutup', async (t) => {
  const { dataDir, outDir } = await setup(t, {
    safelink: { enabled: true, options: { seconds: 3, captcha: true, exclude: ['youtube.com'] } },
  });
  const result = await build({ dataDir, themesDir, pluginsDir, outDir });
  assert.deepEqual(result.warnings, []);

  const post = await read(outDir, 'blog/tulisan-bertautan/index.html');
  const code = /href="\/go\/\?id=([0-9a-f]{12})" target="_blank" rel="noopener nofollow">situs luar/.exec(post)?.[1];
  assert.ok(code, 'tautan luar diganti ke /go/ dan dibuka di tab baru');
  assert.doesNotMatch(post, /luar\.example/, 'alamat tujuan tidak lagi ada di halaman');
  assert.match(post, /href="https:\/\/contoh\.com\/blog\/"[^>]*>situs sendiri/, 'tautan ke situs sendiri dibiarkan');
  assert.match(post, /href="https:\/\/www\.youtube\.com\/watch\?v=abc"[^>]*>video/, 'domain yang dikecualikan dibiarkan');

  assert.deepEqual(JSON.parse(await read(outDir, 'go/links.json')), { [code]: 'https://luar.example/halaman?a=1&b=2' });
  const page = await read(outDir, 'go/index.html');
  assert.match(page, /<title>Menuju situs tujuan \| Blogs<\/title>/);
  assert.match(page, /noindex/);
  assert.match(page, /let t=3;/);
  assert.match(page, /ask\(\)/, 'captcha aktif');
  assert.doesNotMatch(page, /location\.search\)\.get\('u'\)|decodeURIComponent/, 'tujuan tidak dibaca dari URL');
  assert.doesNotMatch(await read(outDir, 'sitemap.xml'), /\/go\//);
});

test('analytics dan adsense: hanya produksi, ID wajib sah', async (t) => {
  const plugins = {
    'google-analytics': { enabled: true, options: { measurementId: 'G-AB12CD34EF' } },
    adsense: { enabled: true, options: { publisherId: 'ca-pub-1234567890123456', adsTxt: true } },
  };
  const { dataDir, outDir } = await setup(t, plugins);
  await build({ dataDir, themesDir, pluginsDir, outDir });
  const home = await read(outDir, 'index.html');
  assert.match(home, /googletagmanager\.com\/gtag\/js\?id=G-AB12CD34EF/);
  assert.match(home, /addEventListener\(e,go,\{once:true,passive:true\}\)/, 'dimuat setelah interaksi pertama');
  assert.match(home, /adsbygoogle\.js\?client=ca-pub-1234567890123456/);
  assert.match(home, /<meta name="google-adsense-account" content="ca-pub-1234567890123456">/);
  assert.equal(await read(outDir, 'ads.txt'), 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
  assert.doesNotMatch(await read(outDir, '404.html'), /adsbygoogle/, 'halaman 404 tanpa iklan');

  const preview = await build({ dataDir, themesDir, pluginsDir, outDir, mode: 'preview', basePath: '/preview' });
  assert.doesNotMatch(await read(outDir, 'index.html'), /googletagmanager|adsbygoogle/);
  assert.deepEqual(preview.warnings, []);

  const store = createStore(dataDir);
  const settings = await store.settings.get();
  await store.settings.save({ ...settings, plugins: { 'google-analytics': { enabled: true, options: { measurementId: 'UA-123' } } } });
  const bad = await build({ dataDir, themesDir, pluginsDir, outDir });
  assert.match(bad.warnings.join('\n'), /Google Analytics: ID pengukuran/);
  assert.doesNotMatch(await read(outDir, 'index.html'), /googletagmanager/);
});

test('pencarian: tombol di tema, indeks dibuat, skrip tidak dimuat di awal', async (t) => {
  const { dataDir, outDir } = await setup(t, { search: { enabled: true, options: {} } });
  const result = await build({ dataDir, themesDir, pluginsDir, outDir });
  assert.deepEqual(result.warnings, []);

  const home = await read(outDir, 'index.html');
  assert.match(home, /<button[^>]*data-search-open/);
  assert.doesNotMatch(home, /<script[^>]*src="[^"]*pagefind/, 'skrip pencarian tidak dimuat saat halaman dibuka');
  const post = await read(outDir, 'blog/tulisan-bertautan/index.html');
  assert.equal(post.match(/data-pagefind-body/g).length, 1, 'hanya isi tulisan yang diindeks');
  assert.match(post, /<article data-pagefind-body /);
  assert.doesNotMatch(home, /data-pagefind-body/, 'beranda tidak diindeks');
  assert.ok(existsSync(join(outDir, 'pagefind/pagefind-ui.js')));
  assert.ok(existsSync(join(outDir, 'pagefind/pagefind.js')));
});

test('plugin rusak tidak menggagalkan build', async (t) => {
  const { dir, dataDir, outDir } = await setup(t, { rusak: { enabled: true, options: {} }, meledak: { enabled: true, options: {} } });
  const custom = join(dir, 'plugins');
  await mkdir(join(custom, 'rusak'), { recursive: true });
  await writeFile(join(custom, 'rusak/plugin.json'), '{"id":"rusak"}');
  await mkdir(join(custom, 'meledak'), { recursive: true });
  await writeFile(join(custom, 'meledak/plugin.json'), JSON.stringify({ id: 'meledak', name: 'Meledak', version: '1.0.0' }));
  await writeFile(
    join(custom, 'meledak/index.js'),
    "export default { setup(api) { api.on('head', () => '<meta name=\"dari-plugin\" content=\"ya\">'); api.on('bodyEnd', () => { throw new Error('duar'); }); } };",
  );

  const result = await build({ dataDir, themesDir, pluginsDir: custom, outDir });
  const home = await read(outDir, 'index.html');
  assert.match(home, /<meta name="dari-plugin" content="ya">/, 'hook yang sehat tetap jalan');
  assert.match(result.warnings.join('\n'), /"rusak" gagal dimuat/);
  assert.match(result.warnings.join('\n'), /"meledak" gagal di sebuah hook: duar/);
});

test('daftar plugin bawaan terbaca dari manifest', async () => {
  const items = await listExtensions(pluginsDir, manifest, 'plugin.json');
  assert.deepEqual(items.map((item) => item.id).sort(), ['adsense', 'google-analytics', 'safelink', 'search']);
  assert.ok(items.every((item) => item.locked && !item.broken));
  assert.equal(items.find((item) => item.id === 'safelink').settings[0].default, 5);
});
