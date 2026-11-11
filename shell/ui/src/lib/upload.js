import { ApiError } from './api.js';

// Kirim berkas zip tema atau plugin untuk dipasang. `endpoint` = "/themes" | "/plugins".
export async function installZip(endpoint, file) {
  let response;
  try {
    response = await fetch(`/api${endpoint}/install`, {
      method: 'POST',
      headers: { 'content-type': 'application/zip' },
      body: file,
    });
  } catch {
    throw new ApiError(0, { code: 'OFFLINE', message: 'Server shell tidak merespons' });
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error ?? { message: response.status === 413 ? 'Berkas terlalu besar (maksimum 20 MB).' : 'Pemasangan gagal.' },
    );
  }
  return data;
}

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

// Unggah satu gambar. Mengembalikan path di folder data, mis.
// "media/uploads/2026/11/foto-1a2b3c4d.jpg". Path inilah yang disimpan di
// konten (bukan URL shell), supaya konten tetap berlaku di luar shell.
export async function uploadImage(file) {
  let response;
  try {
    response = await fetch(`/api/uploads?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'content-type': file.type || 'application/octet-stream' },
      body: file,
    });
  } catch {
    throw new ApiError(0, { code: 'OFFLINE', message: 'Server shell tidak merespons' });
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error ?? { message: response.status === 413 ? 'Berkas terlalu besar (maksimum 25 MB).' : 'Unggah gagal.' },
    );
  }
  return data.path;
}
