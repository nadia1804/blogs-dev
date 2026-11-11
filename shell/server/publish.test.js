import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, zipSync } from 'fflate';
import { initData } from '@blogs/core/init';
import { createApp } from './app.js';

const themesDir = fileURLToPath(new URL('../../themes', import.meta.url));

// Satu instans shell dengan folder sementaranya sendiri.
async function start(t, options = {}) {
  const root = await mkdtemp(join(tmpdir(), 'blogs-publish-'));
  const dataDir = join(root, 'data');
  await initData(dataDir);
  const server = createApp({
    dataDir,
    themesDir,
    pluginsDir: join(root, 'plugins'),
    previewDir: join(root, 'preview'),
    distDir: join(root, 'dist'),
    ...options,
  }).app.listen(0, '127.0.0.1');
  await new Promise((done) => server.once('listening', done));
  t.after(async () => {
    server.close();
    await rm(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, path, body) => {
    const response = await fetch(base + path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  return { root, dataDir, base, call };
}

test('publish: token tidak pernah dikirim balik, build lalu deploy ke target', async (t) => {
  const seen = [];
  const netlify = createServer(async (req, res) => {
    for await (const chunk of req) void chunk;
    seen.push(`${req.method} ${req.url} ${req.headers.authorization}`);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ id: 'dep1', state: 'ready', required: [], ssl_url: 'https://situs-uji.netlify.app' }));
  });
  await new Promise((done) => netlify.listen(0, '127.0.0.1', done));
  t.after(() => netlify.close());

  const { root, dataDir, call } = await start(t, {
    deployEndpoints: { netlify: `http://127.0.0.1:${netlify.address().port}` },
  });

  assert.equal((await call('POST', '/publish/deploy')).status, 400, 'target belum dipilih');

  const settings = (await call('GET', '/settings')).body;
  await call('PUT', '/settings', { ...settings, publish: { target: 'netlify', siteId: 'situs-uji', teamId: '' } });
  const noToken = await call('POST', '/publish/deploy');
  assert.equal(noToken.status, 502);
  assert.match(noToken.body.error.message, /Token Netlify belum disimpan/);

  const saved = await call('PUT', '/publish/secrets', { netlifyToken: 'tok-sangat-rahasia' });
  assert.deepEqual(saved.body, { netlifyToken: true, vercelToken: false });
  assert.doesNotMatch(JSON.stringify((await call('GET', '/publish/secrets')).body), /rahasia/);
  assert.doesNotMatch(JSON.stringify((await call('GET', '/settings')).body), /rahasia/);
  assert.match(await readFile(join(dataDir, '.secrets.json'), 'utf8'), /tok-sangat-rahasia/);

  const built = await call('POST', '/publish/build');
  assert.equal(built.status, 200);
  assert.ok(existsSync(join(root, 'dist/index.html')));

  const deployed = await call('POST', '/publish/deploy');
  assert.equal(deployed.status, 200);
  assert.equal(deployed.body.deploy.url, 'https://situs-uji.netlify.app');
  assert.equal(deployed.body.target, 'Netlify');
  assert.ok(deployed.body.build.pages > 0);
  assert.equal(seen[0], 'POST /sites/situs-uji/deploys Bearer tok-sangat-rahasia');
});

test('backup dan restore: bolak-balik utuh, data lama disimpan, token tidak ikut', async (t) => {
  const { root, dataDir, base, call } = await start(t);
  const page = (await call('POST', '/pages', { title: 'Sebelum Backup' })).body;
  await call('PUT', `/drafts/pages/${page.id}`, { data: { title: 'Draft Ikut' }, baseUpdatedAt: page.updatedAt });
  await call('PUT', '/publish/secrets', { vercelToken: 'tok-tidak-boleh-ikut' });

  const download = await fetch(`${base}/backup`);
  assert.equal(download.status, 200);
  assert.match(download.headers.get('content-disposition'), /attachment; filename="blogs-backup-.*\.zip"/);
  const zip = Buffer.from(await download.arrayBuffer());
  const names = Object.keys(unzipSync(new Uint8Array(zip)));
  assert.ok(names.includes('settings.json') && names.includes(`pages/${page.id}.json`) && names.includes('media/brand/logo.png'));
  assert.ok(names.some((name) => name.startsWith('.drafts/')), 'draft ikut backup');
  assert.ok(!names.includes('.secrets.json') && !names.some((name) => name.startsWith('.index/')));
  assert.doesNotMatch(zip.toString('latin1'), /tok-tidak-boleh-ikut/);

  // Ubah data setelah backup, lalu pulihkan.
  await call('DELETE', `/pages/${page.id}`);
  await call('POST', '/pages', { title: 'Dibuat Setelah Backup' });
  const restore = (body) => fetch(`${base}/restore`, { method: 'POST', headers: { 'content-type': 'application/zip' }, body });

  const restored = await restore(zip);
  assert.equal(restored.status, 200);
  const info = await restored.json();
  assert.match(info.previous, /^data\.sebelum-pulih-/);
  assert.deepEqual((await call('GET', '/pages')).body.map((item) => item.title), ['Sebelum Backup']);
  assert.equal((await call('GET', `/drafts/pages/${page.id}`)).body.data.title, 'Draft Ikut');
  assert.deepEqual((await call('GET', '/publish/secrets')).body, { netlifyToken: false, vercelToken: true }, 'token dipertahankan');
  assert.ok((await readdir(join(root, info.previous, 'pages'))).length > 0, 'data lama masih ada');

  // Zip yang bukan backup ditolak tanpa menyentuh data.
  const text = (value) => new TextEncoder().encode(value);
  assert.equal((await restore(Buffer.from(zipSync({ 'settings.json': text('{}') })))).status, 400);
  assert.equal((await restore(Buffer.from(zipSync({ 'backup.json': text('{"app":"blogs-cms"}'), 'settings.json': text('{"images":{"webpQuality":999}}') })))).status, 400);
  assert.equal((await restore(Buffer.from('bukan zip'))).status, 400);
  assert.deepEqual((await call('GET', '/pages')).body.map((item) => item.title), ['Sebelum Backup']);
  assert.equal(existsSync(`${dataDir}.memulihkan`), false);
});
