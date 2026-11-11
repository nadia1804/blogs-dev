import { useRef, useState } from 'react';
import { ArchiveRestore, CircleCheck, Download } from 'lucide-react';
import { useData } from '../../app/data.jsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { ApiError } from '../../lib/api.js';

async function restoreBackup(file) {
  let response;
  try {
    response = await fetch('/api/restore', { method: 'POST', headers: { 'content-type': 'application/zip' }, body: file });
  } catch {
    throw new ApiError(0, { code: 'OFFLINE', message: 'Server shell tidak merespons' });
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error ?? { message: response.status === 413 ? 'Berkas terlalu besar (maksimum 1 GB).' : 'Pemulihan gagal.' },
    );
  }
  return data;
}

// Backup: unduh seluruh konten sebagai satu zip. Restore: ganti konten
// sekarang dengan isi zip backup.
export function BackupSettings() {
  const { reload } = useData();
  const input = useRef(null);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const restore = async () => {
    setBusy(true);
    try {
      const info = await restoreBackup(pending);
      setPending(null);
      setError(null);
      setDone(info);
      await reload();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-xl font-semibold">Backup dan restore</h1>

      <div className="card card-border bg-base-100">
        <div className="card-body gap-3">
          <h2 className="font-semibold">Backup</h2>
          <p className="text-sm text-base-content/70">
            Satu berkas zip berisi semua post, page, kategori, author, menu, pengaturan, media, dan draft. Token publish
            serta tema dan plugin yang Anda pasang sendiri tidak ikut.
          </p>
          <a href="/api/backup" download className="btn btn-primary btn-sm self-start">
            <Download className="size-4" /> Unduh backup
          </a>
        </div>
      </div>

      <div className="card card-border mt-4 bg-base-100">
        <div className="card-body gap-3">
          <h2 className="font-semibold">Restore</h2>
          <p className="text-sm text-base-content/70">
            Mengganti seluruh konten sekarang dengan isi zip backup. Konten yang sekarang tidak dihapus: foldernya
            diganti nama dan disimpan di sebelah folder data, jadi masih bisa dikembalikan dengan tangan.
          </p>
          <input
            ref={input}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(event) => {
              setPending(event.target.files?.[0] ?? null);
              setDone(null);
              event.target.value = '';
            }}
          />
          <button type="button" className="btn btn-sm self-start" onClick={() => input.current.click()}>
            <ArchiveRestore className="size-4" /> Pulihkan dari zip
          </button>
          {done && (
            <div role="status" className="alert alert-success alert-soft items-start text-sm">
              <CircleCheck className="size-4 shrink-0" />
              <span>
                {done.files} berkas dipulihkan. Konten sebelumnya disimpan di folder <strong>{done.previous}</strong>;
                hapus folder itu sendiri bila sudah tidak diperlukan.
              </span>
            </div>
          )}
        </div>
      </div>

      {pending && (
        <ConfirmDialog
          title={`Pulihkan dari "${pending.name}"?`}
          message="Seluruh konten sekarang akan diganti dengan isi backup ini. Konten yang sekarang disisihkan ke folder terpisah, tidak dihapus."
          confirmLabel="Pulihkan"
          error={error}
          busy={busy}
          onConfirm={restore}
          onCancel={() => {
            setPending(null);
            setError(null);
          }}
        />
      )}
    </div>
  );
}
