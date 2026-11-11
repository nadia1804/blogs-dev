import { collectFiles, DeployError } from './files.js';
import { deployNetlify } from './netlify.js';
import { deployVercel } from './vercel.js';

export { DeployError };

// Target publish yang didukung. `secret` = nama token di data/.secrets.json.
export const TARGETS = {
  netlify: { label: 'Netlify', secret: 'netlifyToken', idLabel: 'ID situs (Site ID)' },
  vercel: { label: 'Vercel', secret: 'vercelToken', idLabel: 'Nama proyek' },
};

// Unggah folder hasil build ke host yang dipilih.
//   dir       folder hasil build produksi (dist)
//   publish   settings.publish: { target, siteId, teamId }
//   token     token akses host
//   endpoints alamat API pengganti, hanya untuk tes
export async function deploy({ dir, publish, token, endpoints = {}, ...options }) {
  const target = TARGETS[publish.target];
  if (!target) throw new DeployError('Target publish belum dipilih.');
  if (!publish.siteId.trim()) throw new DeployError(`${target.idLabel} ${target.label} belum diisi.`);
  if (!token) throw new DeployError(`Token ${target.label} belum disimpan.`);

  const files = await collectFiles(dir);
  if (!files.some((file) => file.path === 'index.html')) throw new DeployError('Folder hasil build kosong. Bangun situs dulu.');

  const common = { files, token, ...options };
  if (publish.target === 'netlify') {
    return deployNetlify({ ...common, siteId: publish.siteId.trim(), endpoint: endpoints.netlify });
  }
  return deployVercel({ ...common, project: publish.siteId.trim(), teamId: publish.teamId.trim(), endpoint: endpoints.vercel });
}
