import { api } from './api.js';

// Bangun preview lalu buka di tab baru.
//
// Tab dibuka lebih dulu, selagi masih dalam klik/pintasan pengguna (kalau
// menunggu build selesai, browser menganggapnya popup dan memblokirnya),
// lalu diarahkan ke halaman begitu build selesai.
//
//   target : { kind: 'post' | 'page', id } atau kosong untuk beranda
//   before : fungsi yang dijalankan sebelum build (mis. menyimpan draft)
export async function previewSite(target, { before } = {}) {
  const tab = window.open('', '_blank');
  if (tab) {
    tab.document.title = 'Membangun preview…';
    tab.document.body.innerHTML = '<p style="font:16px system-ui;padding:2rem;color:#555">Membangun preview…</p>';
  }
  try {
    await before?.();
    const { url } = await api.post('/preview', { target });
    if (tab) tab.location.replace(url);
    else window.location.assign(url); // popup diblokir: buka di tab ini
  } catch (error) {
    if (tab) tab.document.body.innerHTML = `<p style="font:16px system-ui;padding:2rem;color:#b00020"></p>`;
    if (tab) tab.document.body.firstChild.textContent = `Preview gagal: ${error.message}`;
    throw error;
  }
}
