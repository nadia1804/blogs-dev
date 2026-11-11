import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { zipSync } from 'fflate';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initData } from '@blogs/core/init';
import { createApp } from './app.js';

let server, base, dataDir;

before(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'blogs-shell-'));
  await initData(dataDir);
  server = createApp({
    dataDir,
    themesDir: fileURLToPath(new URL('../../themes', import.meta.url)),
    pluginsDir: join(dataDir, '_plugins'),
    previewDir: join(dataDir, '_preview'),
  }).app.listen(0, '127.0.0.1');
  await new Promise((done) => server.once('listening', done));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  server.close();
  await rm(dataDir, { recursive: true, force: true });
});

const call = async (method, path, body, headers = {}) => {
  const response = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

test('settings dan data awal terbaca', async () => {
  const settings = await call('GET', '/settings');
  assert.equal(settings.body.hero.title, 'Ruang baca & Media belajar');
  const types = await call('GET', '/post-types');
  assert.deepEqual(types.body.map((type) => type.id), ['blog']);
  const menus = await call('GET', '/navigation');
  assert.deepEqual(menus.body.map((menu) => menu.id).sort(), ['footer', 'header']);
  assert.equal((await fetch(base + '/media/brand/logo.png')).status, 200);
});

test('CRUD post lewat API, dengan kode error yang tepat', async () => {
  const created = await call('POST', '/posts/blog', { title: 'Halo Dunia' });
  assert.equal(created.status, 201);
  assert.equal(created.body.slug, 'halo-dunia');

  assert.equal((await call('POST', '/posts/blog', { title: 'Halo Dunia' })).status, 409);
  assert.equal((await call('PATCH', `/posts/blog/${created.body.id}`, { status: 'salah' })).status, 400);
  assert.equal((await call('GET', '/posts/blog/tidakada')).status, 404);

  const scheduled = await call('PATCH', `/posts/blog/${created.body.id}`, {
    status: 'scheduled',
    scheduledAt: '2027-01-01T00:00:00.000Z',
  });
  assert.equal(scheduled.body.status, 'scheduled');

  assert.equal((await call('GET', '/posts/blog')).body.length, 1);
  assert.equal((await call('DELETE', `/posts/blog/${created.body.id}`)).status, 204);
  assert.equal((await call('DELETE', '/post-types/blog')).status, 403);
});

test('draft tersimpan terpisah dari dokumen asli', async () => {
  const page = (await call('POST', '/pages', { title: 'Tentang' })).body;
  assert.equal((await call('GET', `/drafts/pages/${page.id}`)).body, null);

  await call('PUT', `/drafts/pages/${page.id}`, { data: { title: 'Tentang Kami' }, baseUpdatedAt: page.updatedAt });
  const draft = (await call('GET', `/drafts/pages/${page.id}`)).body;
  assert.equal(draft.data.title, 'Tentang Kami');
  assert.equal(draft.baseUpdatedAt, page.updatedAt);
  assert.equal((await call('GET', `/pages/${page.id}`)).body.title, 'Tentang');

  assert.equal((await call('DELETE', `/drafts/pages/${page.id}`)).status, 204);
  assert.equal((await call('GET', `/drafts/pages/${page.id}`)).body, null);

  // Menghapus dokumen ikut menghapus draft-nya.
  await call('PUT', `/drafts/pages/${page.id}`, { data: { title: 'Sisa' }, baseUpdatedAt: page.updatedAt });
  await call('DELETE', `/pages/${page.id}`);
  assert.equal((await call('GET', `/drafts/pages/${page.id}`)).body, null);
});

test('menu navigasi merujuk konten lewat ID', async () => {
  const menu = await call('PATCH', '/navigation/header', {
    items: [
      { id: 'a', label: 'Blog', icon: 'newspaper', target: { kind: 'postType', postType: 'blog' }, children: [
        { id: 'b', label: 'Luar', target: { kind: 'url', url: 'https://example.com' } },
      ] },
    ],
  });
  assert.equal(menu.status, 200);
  assert.equal(menu.body.items[0].children[0].target.newTab, false);
  const bad = await call('PATCH', '/navigation/header', { items: [{ id: 'x', label: 'X', target: { kind: 'entah' } }] });
  assert.equal(bad.status, 400);
});

test('aturan hapus: rujukan dibersihkan, isi dilindungi', async () => {
  await call('POST', '/post-types', { id: 'pelajaran', label: 'Pelajaran' });
  const parent = (await call('POST', '/categories/pelajaran', { name: 'IPA' })).body;
  const child = (await call('POST', '/categories/pelajaran', { name: 'Fisika', parentId: parent.id })).body;
  const author = (await call('POST', '/authors', { name: 'Bu Rina' })).body;
  const post = (await call('POST', '/posts/pelajaran', {
    title: 'Gaya dan Gerak',
    categoryIds: [child.id],
    authorIds: [author.id],
  })).body;

  assert.equal((await call('DELETE', '/post-types/pelajaran')).status, 409, 'post type berisi tidak bisa dihapus');
  assert.equal((await call('DELETE', `/categories/pelajaran/${parent.id}`)).status, 409, 'induk masih punya anak');

  await call('DELETE', `/categories/pelajaran/${child.id}`);
  await call('DELETE', `/authors/${author.id}`);
  const cleaned = (await call('GET', `/posts/pelajaran/${post.id}`)).body;
  assert.deepEqual(cleaned.categoryIds, []);
  assert.deepEqual(cleaned.authorIds, []);

  await call('DELETE', `/posts/pelajaran/${post.id}`);
  await call('DELETE', `/categories/pelajaran/${parent.id}`);
  assert.equal((await call('DELETE', '/post-types/pelajaran')).status, 204);
});

test('pesan validasi berbahasa Indonesia dan menunjuk field', async () => {
  const bad = await call('POST', '/authors', { name: '' });
  assert.equal(bad.status, 400);
  assert.deepEqual(bad.body.error.details[0].path, ['name']);
  assert.doesNotMatch(bad.body.error.details[0].message, /expected|Too small/i);
});

test('unggah gambar: disimpan, bisa diambil, isi palsu ditolak', async () => {
  const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(32, 1)]);
  const upload = (body, type, name = 'Foto Kelas 1.png') =>
    fetch(`${base}/uploads?name=${encodeURIComponent(name)}`, { method: 'POST', headers: { 'content-type': type }, body });

  const ok = await upload(png, 'image/png');
  assert.equal(ok.status, 201);
  const saved = await ok.json();
  assert.match(saved.path, /^media\/uploads\/\d{4}\/\d{2}\/foto-kelas-1-[0-9a-f]{8}\.png$/);
  const fetched = await fetch(`${base}/${saved.path}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.headers.get('content-type'), 'image/png');

  assert.equal((await (await upload(png, 'image/png')).json()).path, saved.path, 'isi sama = berkas sama');
  assert.equal((await upload(Buffer.from('<script>alert(1)</script>'), 'image/png')).status, 400);
  assert.equal((await upload(png, 'image/svg+xml')).status, 400);
});

test('settings: nilai di luar rentang ditolak dengan pesan yang jelas', async () => {
  const settings = (await call('GET', '/settings')).body;
  const bad = await call('PUT', '/settings', { ...settings, images: { ...settings.images, maxWidth: 100 } });
  assert.equal(bad.status, 400);
  assert.deepEqual(bad.body.error.details[0].path, ['images', 'maxWidth']);
  assert.equal(bad.body.error.details[0].message, 'Minimal 320 px');
  const empty = await call('PUT', '/settings', { ...settings, watcher: { ...settings.watcher, idleSeconds: '' } });
  assert.equal(empty.body.error.details[0].message, 'Isi dengan angka');
  assert.equal((await call('GET', '/settings')).body.images.maxWidth, settings.images.maxWidth);
});

test('preview: draft ikut tampil dan halaman dilayani di /preview/', async () => {
  const origin = base.replace(/\/api$/, '');
  const post = (await call('POST', '/posts/blog', { title: 'Tulisan Preview' })).body;
  await call('PUT', `/drafts/posts/blog/${post.id}`, {
    data: { title: 'Judul Dari Draft' },
    baseUpdatedAt: post.updatedAt,
  });

  const built = await call('POST', '/preview', { target: { kind: 'post', id: post.id } });
  assert.equal(built.status, 200);
  assert.equal(built.body.url, '/preview/blog/tulisan-preview/');

  const page = await fetch(origin + built.body.url);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Judul Dari Draft/, 'isi draft, bukan dokumen asli');
  assert.match(html, /noindex/, 'preview tidak boleh terindeks');
  assert.match(html, /href="\/preview\/assets\/theme\.[0-9a-f]+\.css"/);

  assert.equal((await fetch(`${origin}/preview/tidak-ada/`)).status, 404);
  await call('DELETE', `/posts/blog/${post.id}`);
});

test('plugin: pasang dari zip, atur, lalu hapus', async () => {
  const text = (value) => new TextEncoder().encode(value);
  const zip = (files) => Buffer.from(zipSync(Object.fromEntries(Object.entries(files).map(([path, value]) => [path, text(value)]))));
  const install = (body) =>
    fetch(`${base}/plugins/install`, { method: 'POST', headers: { 'content-type': 'application/zip' }, body });
  const manifest = JSON.stringify({
    id: 'salam',
    name: 'Salam',
    version: '1.0.0',
    settings: [{ key: 'teks', label: 'Teks', type: 'text', default: 'Halo' }],
  });
  const code = "export default { setup(api) { api.on('bodyEnd', () => `<!-- ${api.options.teks} -->`); } };";

  // Zip dengan satu folder pembungkus, seperti hasil mengompres sebuah folder.
  const installed = await install(zip({ 'salam-main/plugin.json': manifest, 'salam-main/index.js': code }));
  assert.equal(installed.status, 201);
  assert.equal(existsSync(join(dataDir, '_plugins/salam/index.js')), true);

  let list = (await call('GET', '/plugins')).body;
  assert.deepEqual(list.map((item) => [item.id, item.enabled, item.options.teks]), [['salam', false, 'Halo']]);

  const settings = (await call('GET', '/settings')).body;
  await call('PUT', '/settings', { ...settings, plugins: { salam: { enabled: true, options: { teks: 'Apa kabar' } } } });
  list = (await call('GET', '/plugins')).body;
  assert.deepEqual([list[0].enabled, list[0].options.teks], [true, 'Apa kabar']);

  assert.equal((await install(zip({ 'plugin.json': manifest }))).status, 400, 'tanpa index.js');
  assert.equal((await install(zip({ 'plugin.json': '{"id":"X"}', 'index.js': code }))).status, 400, 'manifest tidak sah');
  assert.equal((await install(zip({ 'plugin.json': manifest, 'index.js': code, '../keluar.js': 'x' }))).status, 400, 'path keluar folder');
  assert.equal((await install(Buffer.from('bukan zip'))).status, 400);
  assert.equal(existsSync(join(dataDir, 'keluar.js')), false);

  assert.equal((await call('DELETE', '/plugins/salam')).status, 204);
  assert.equal(existsSync(join(dataDir, '_plugins/salam')), false);
  assert.equal('salam' in (await call('GET', '/settings')).body.plugins, false, 'pengaturannya ikut dibuang');
  assert.equal((await call('DELETE', '/plugins/salam')).status, 404);
});

test('tema: daftar terbaca, tema bawaan dan tema aktif dilindungi', async () => {
  const themes = (await call('GET', '/themes')).body;
  const main = themes.find((theme) => theme.id === 'default');
  assert.deepEqual([main.active, main.locked], [true, true]);
  assert.equal((await call('DELETE', '/themes/default')).status, 403);
  assert.equal((await call('DELETE', '/themes/tidak-ada')).status, 404);
});

test('permintaan dari origin atau host lain ditolak', async () => {
  const foreign = await call('POST', '/pages', { title: 'Jahat' }, { origin: 'https://evil.example' });
  assert.equal(foreign.status, 403);
  assert.equal((await call('GET', '/nggak-ada')).status, 404);
});
