import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, readJson, writeJsonAtomic } from '../src/index.js';
import { initData } from '../src/cli/init.js';

async function tempStore(t) {
  const dir = await mkdtemp(join(tmpdir(), 'blogs-core-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return { dir, store: createStore(dir) };
}

test('tulis atomic: tidak meninggalkan file sementara', async (t) => {
  const { dir } = await tempStore(t);
  const file = join(dir, 'a/b.json');
  await Promise.all(Array.from({ length: 20 }, (_, n) => writeJsonAtomic(file, { n })));
  assert.equal(typeof (await readJson(file)).n, 'number');
  assert.deepEqual(await readdir(join(dir, 'a')), ['b.json']);
  assert.equal(await readJson(join(dir, 'tidak-ada.json')), null);
});

test('settings: default terisi dan plugin nonaktif', async (t) => {
  const { store } = await tempStore(t);
  const settings = await store.settings.get();
  assert.equal(settings.images.webpQuality, 78);
  assert.equal(settings.github.enabled, false);
  const saved = await store.settings.save({ ...settings, plugins: { adsense: {} } });
  assert.equal(saved.plugins.adsense.enabled, false);
  await assert.rejects(store.settings.save({ images: { webpQuality: 500 } }), { code: 'INVALID' });
});

test('post: buat, ubah, daftar, hapus', async (t) => {
  const { dir, store } = await tempStore(t);
  const posts = store.posts('blog');

  const created = await posts.create({ title: 'Belajar Pecahan Ásyik!' });
  assert.equal(created.slug, 'belajar-pecahan-asyik');
  assert.equal(created.type, 'blog');
  assert.equal(created.status, 'draft');
  assert.equal(created.seo.robots.index, true);

  const onDisk = JSON.parse(await readFile(join(dir, 'posts/blog', `${created.id}.json`), 'utf8'));
  assert.deepEqual(onDisk, created);

  const updated = await posts.update(created.id, { status: 'published', type: 'lain' });
  assert.equal(updated.status, 'published');
  assert.equal(updated.type, 'blog', 'type dikunci oleh koleksi');
  assert.equal(updated.createdAt, created.createdAt);

  assert.deepEqual((await posts.list()).map((item) => item.status), ['published']);

  await posts.remove(created.id);
  assert.deepEqual(await posts.list(), []);
  await assert.rejects(posts.update(created.id, {}), { code: 'NOT_FOUND' });
});

test('slug unik per koleksi, terisolasi antar post type', async (t) => {
  const { store } = await tempStore(t);
  await store.posts('blog').create({ title: 'Halo' });
  await assert.rejects(store.posts('blog').create({ title: 'Halo' }), { code: 'CONFLICT' });
  await store.posts('pelajaran').create({ title: 'Halo' });

  await store.categories('blog').create({ name: 'Matematika', color: 'mint' });
  assert.equal((await store.categories('blog').list()).length, 1);
  assert.equal((await store.categories('pelajaran').list()).length, 0);
  await assert.rejects(store.categories('blog').create({ name: 'IPA', color: 'neon' }), { code: 'INVALID' });
});

test('simpan beruntun tidak saling menimpa index', async (t) => {
  const { store } = await tempStore(t);
  const posts = store.posts('blog');
  await Promise.all(Array.from({ length: 15 }, (_, n) => posts.create({ title: `Post ${n}` })));
  assert.equal((await posts.list()).length, 15);
});

test('index dibangun ulang dari file kalau hilang atau usang', async (t) => {
  const { dir, store } = await tempStore(t);
  const posts = store.posts('blog');
  const post = await posts.create({ title: 'Satu' });
  await rm(join(dir, '.index'), { recursive: true });
  assert.equal((await posts.list())[0].id, post.id);

  await writeFile(join(dir, '.index/posts__blog.json'), JSON.stringify({ version: 1, items: [] }));
  assert.equal((await posts.list()).length, 0);
  assert.equal((await posts.rebuildIndex()).length, 1);
});

test('ID berbahaya ditolak', async (t) => {
  const { store } = await tempStore(t);
  assert.throws(() => store.posts('../luar'), { code: 'INVALID' });
  await assert.rejects(async () => store.pages.get('../../rahasia'), { code: 'FORBIDDEN' });
});

test('init: seed data, idempoten, post type sistem tidak bisa dihapus', async (t) => {
  const { dir, store } = await tempStore(t);
  const first = await initData(dir);
  assert.ok(first.includes('buat   settings.json'));
  assert.deepEqual(await initData(dir), []);

  const settings = await store.settings.get();
  assert.equal(settings.hero.title, 'Ruang baca & Media belajar');
  assert.ok((await readdir(join(dir, 'media/brand'))).includes('logo.png'));
  await assert.rejects(store.postTypes.remove('blog'), { code: 'FORBIDDEN' });

  const game = await store.postTypes.create({ id: 'game', label: 'Game' });
  await store.postTypes.remove(game.id);
});
