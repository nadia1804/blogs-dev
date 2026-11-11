import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deploy } from '../src/deploy/index.js';
import { createSecrets } from '../src/storage/secrets.js';

const sha1 = (text) => createHash('sha1').update(text).digest('hex');
const TOKEN = 'token-rahasia-uji';

async function site(t) {
  const dir = await mkdtemp(join(tmpdir(), 'blogs-deploy-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'blog/halo dunia'), { recursive: true });
  await writeFile(join(dir, 'index.html'), '<h1>Beranda</h1>');
  await writeFile(join(dir, 'blog/halo dunia/index.html'), '<h1>Halo</h1>');
  await writeFile(join(dir, 'salinan.html'), '<h1>Beranda</h1>'); // isi sama dengan index.html
  await writeFile(join(dir, '.blogs-build'), 'penanda');
  return dir;
}

// Server tiruan yang mencatat setiap permintaan dan menjawab lewat `handle`.
async function mock(t, handle) {
  const requests = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const entry = { method: req.method, url: req.url, headers: req.headers, body };
    requests.push(entry);
    const { status = 200, json } = handle(entry, requests) ?? {};
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(json ?? {}));
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  return { requests, endpoint: `http://127.0.0.1:${server.address().port}` };
}

test('netlify: kirim daftar hash, unggah hanya yang diminta, tunggu siap', async (t) => {
  const dir = await site(t);
  const home = sha1('<h1>Beranda</h1>');
  const { requests, endpoint } = await mock(t, ({ method, url }, all) => {
    if (method === 'POST' && url === '/sites/situs-123/deploys') return { json: { id: 'dep1', state: 'uploading', required: [home] } };
    if (method === 'PUT') return { json: {} };
    if (method === 'GET' && url === '/deploys/dep1') {
      const polls = all.filter((entry) => entry.method === 'GET').length;
      return { json: { id: 'dep1', state: polls > 1 ? 'ready' : 'processing', ssl_url: 'https://situs.netlify.app' } };
    }
    return { status: 404 };
  });

  const result = await deploy({
    dir,
    publish: { target: 'netlify', siteId: ' situs-123 ', teamId: '' },
    token: TOKEN,
    endpoints: { netlify: endpoint },
    pollMs: 5,
  });
  assert.deepEqual(result, { url: 'https://situs.netlify.app', deployUrl: '', state: 'ready', uploaded: 1, total: 3 });

  const digest = JSON.parse(requests[0].body.toString());
  assert.deepEqual(Object.keys(digest.files).sort(), ['/blog/halo dunia/index.html', '/index.html', '/salinan.html']);
  assert.equal('/.blogs-build' in digest.files, false, 'penanda internal tidak ikut');
  const puts = requests.filter((entry) => entry.method === 'PUT');
  assert.equal(puts.length, 1, 'isi yang sama diunggah sekali, yang tidak diminta dilewati');
  assert.equal(puts[0].body.toString(), '<h1>Beranda</h1>');
  assert.ok(requests.every((entry) => entry.headers.authorization === `Bearer ${TOKEN}`));
});

test('vercel: unggah berkas yang belum ada lalu minta ulang deployment', async (t) => {
  const dir = await site(t);
  const post = sha1('<h1>Halo</h1>');
  const { requests, endpoint } = await mock(t, ({ method, url }, all) => {
    if (method === 'POST' && url.startsWith('/v13/deployments')) {
      const tries = all.filter((entry) => entry.url.startsWith('/v13/deployments')).length;
      return tries === 1
        ? { status: 400, json: { error: { code: 'missing_files', message: 'Missing files', missing: [post] } } }
        : { json: { id: 'd1', url: 'proyek-abc.vercel.app', alias: ['situs.vercel.app'], readyState: 'READY' } };
    }
    if (method === 'POST' && url.startsWith('/v2/files')) return { json: {} };
    return { status: 404 };
  });

  const result = await deploy({
    dir,
    publish: { target: 'vercel', siteId: 'proyek-saya', teamId: 'team_1' },
    token: TOKEN,
    endpoints: { vercel: endpoint },
  });
  assert.deepEqual(result, { url: 'https://situs.vercel.app', deployUrl: 'https://proyek-abc.vercel.app', state: 'READY', uploaded: 1, total: 3 });

  const upload = requests.find((entry) => entry.url.startsWith('/v2/files'));
  assert.equal(upload.url, '/v2/files?teamId=team_1');
  assert.equal(upload.headers['x-vercel-digest'], post);
  assert.equal(upload.body.toString(), '<h1>Halo</h1>');
  const created = JSON.parse(requests.at(-1).body.toString());
  assert.equal(created.name, 'proyek-saya');
  assert.equal(created.projectSettings.framework, null, 'Vercel tidak diminta membangun apa pun');
  assert.deepEqual(created.files.map((file) => file.file), ['blog/halo dunia/index.html', 'index.html', 'salinan.html']);
});

test('deploy: pesan error jelas dan tidak membocorkan token', async (t) => {
  const dir = await site(t);
  const { endpoint } = await mock(t, () => ({ status: 401, json: { message: 'Access Denied' } }));
  const base = { dir, token: TOKEN, endpoints: { netlify: endpoint } };

  await assert.rejects(deploy({ ...base, publish: { target: 'netlify', siteId: 'x', teamId: '' } }), (error) => {
    assert.match(error.message, /401/);
    assert.match(error.message, /Access Denied/);
    assert.match(error.message, /Periksa token/);
    assert.doesNotMatch(error.message, new RegExp(TOKEN));
    return true;
  });
  await assert.rejects(deploy({ ...base, publish: { target: 'none', siteId: 'x', teamId: '' } }), /Target publish belum dipilih/);
  await assert.rejects(deploy({ ...base, publish: { target: 'netlify', siteId: ' ', teamId: '' } }), /belum diisi/);
  await assert.rejects(deploy({ ...base, token: '', publish: { target: 'netlify', siteId: 'x', teamId: '' } }), /Token Netlify belum disimpan/);

  const empty = await mkdtemp(join(tmpdir(), 'blogs-kosong-'));
  t.after(() => rm(empty, { recursive: true, force: true }));
  await assert.rejects(deploy({ ...base, dir: empty, publish: { target: 'netlify', siteId: 'x', teamId: '' } }), /Bangun situs dulu/);
});

test('secrets: status tanpa nilai, string kosong menghapus', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'blogs-secrets-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const secrets = createSecrets(dir);
  assert.deepEqual(await secrets.status(), { netlifyToken: false, vercelToken: false });
  await secrets.set({ netlifyToken: '  abc  ', lainnya: 'diabaikan' });
  assert.deepEqual(await secrets.status(), { netlifyToken: true, vercelToken: false });
  assert.equal(await secrets.get('netlifyToken'), 'abc');
  assert.equal(await secrets.get('lainnya'), '');
  await secrets.set({ netlifyToken: '' });
  assert.equal(await secrets.get('netlifyToken'), '');
});
