import { readFile } from 'node:fs/promises';
import { call, DeployError } from './files.js';

const API = 'https://api.vercel.com';

// Deploy ke Vercel:
//   1. Minta deployment dengan daftar berkas dan hash-nya.
//   2. Bila Vercel menjawab ada berkas yang belum dimilikinya, unggah
//      berkas itu, lalu minta ulang.
// `project` = nama proyek di Vercel; `teamId` hanya untuk akun tim.
export async function deployVercel({ files, token, project, teamId = '', endpoint = API, fetch: fetchImpl = fetch }) {
  const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  const bySha = new Map(files.map((file) => [file.sha1, file]));
  const body = JSON.stringify({
    name: project,
    target: 'production',
    files: files.map((file) => ({ file: file.path, sha: file.sha1, size: file.size })),
    // Situs sudah jadi: Vercel tidak perlu menjalankan build apa pun.
    projectSettings: { framework: null, buildCommand: null, installCommand: null, outputDirectory: null },
  });
  const create = () =>
    call(fetchImpl, `${endpoint}/v13/deployments${query}`, {
      token,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });

  let uploaded = 0;
  let deployment;
  try {
    deployment = await create();
  } catch (error) {
    const missing = error.data?.error?.code === 'missing_files' ? error.data.error.missing : null;
    if (!missing) throw error;
    for (const sha of missing) {
      const file = bySha.get(sha);
      if (!file) throw new DeployError(`Vercel meminta berkas yang tidak dikenal (${sha}).`);
      await call(fetchImpl, `${endpoint}/v2/files${query}`, {
        token,
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream', 'x-vercel-digest': sha },
        body: await readFile(file.full),
      });
      uploaded += 1;
    }
    deployment = await create();
  }

  const host = deployment.alias?.[0] ?? deployment.url ?? '';
  return {
    url: host ? `https://${host}` : '',
    deployUrl: deployment.url ? `https://${deployment.url}` : '',
    state: deployment.readyState ?? deployment.status ?? '',
    uploaded,
    total: files.length,
  };
}
