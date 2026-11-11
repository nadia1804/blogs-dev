import { readFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { call, DeployError } from './files.js';

const API = 'https://api.netlify.com/api/v1';
const POLL_MS = 1500;
const POLL_LIMIT = 40; // sekitar satu menit

// Deploy ke Netlify dengan metode "file digest":
//   1. Kirim daftar semua berkas beserta hash-nya.
//   2. Netlify menjawab hash mana yang belum dimilikinya.
//   3. Unggah hanya berkas-berkas itu.
// Berkas yang tidak berubah sejak deploy sebelumnya tidak diunggah ulang.
export async function deployNetlify({ files, token, siteId, endpoint = API, fetch: fetchImpl = fetch, pollMs = POLL_MS }) {
  const digest = Object.fromEntries(files.map((file) => [`/${file.path}`, file.sha1]));
  let deploy = await call(fetchImpl, `${endpoint}/sites/${encodeURIComponent(siteId)}/deploys`, {
    token,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ files: digest }),
  });

  const required = new Set(deploy.required ?? []);
  const sent = new Set(); // dua berkas dengan isi sama cukup diunggah sekali
  let uploaded = 0;
  for (const file of files) {
    if (!required.has(file.sha1) || sent.has(file.sha1)) continue;
    sent.add(file.sha1);
    const path = file.path.split('/').map(encodeURIComponent).join('/');
    await call(fetchImpl, `${endpoint}/deploys/${deploy.id}/files/${path}`, {
      token,
      method: 'PUT',
      headers: { 'content-type': 'application/octet-stream' },
      body: await readFile(file.full),
    });
    uploaded += 1;
  }

  // Tunggu Netlify selesai memproses deploy.
  for (let attempt = 0; deploy.state !== 'ready' && attempt < POLL_LIMIT; attempt++) {
    if (deploy.state === 'error') throw new DeployError(`Netlify gagal memproses deploy: ${deploy.error_message ?? 'tanpa keterangan'}`);
    await sleep(pollMs);
    deploy = await call(fetchImpl, `${endpoint}/deploys/${deploy.id}`, { token });
  }

  return {
    url: deploy.ssl_url || deploy.url || '',
    deployUrl: deploy.deploy_ssl_url || deploy.deploy_url || '',
    state: deploy.state,
    uploaded,
    total: files.length,
  };
}
