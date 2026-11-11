import { useRef, useState } from 'react';
import { PackagePlus, Trash2, TriangleAlert } from 'lucide-react';
import { api } from '../lib/api.js';
import { installZip } from '../lib/upload.js';
import { ConfirmDialog } from './ConfirmDialog.jsx';

// Halaman daftar tema atau plugin: kartu per item, pasang dari zip, hapus.
//
//   endpoint    "/themes" | "/plugins"
//   noun        "tema" | "plugin"
//   collection  hasil useCollection(endpoint)
//   renderMeta(item)     lencana status di samping nama
//   renderActions(item)  tombol di sisi kanan kartu
//   onChanged            dipanggil setelah pasang atau hapus
export function ExtensionList({ title, description, endpoint, noun, collection, renderMeta, renderActions, onChanged }) {
  const input = useRef(null);
  const [pending, setPending] = useState(null); // berkas zip yang menunggu konfirmasi
  const [target, setTarget] = useState(null); // item yang akan dihapus
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const closeDialogs = () => {
    setPending(null);
    setTarget(null);
    setError(null);
  };

  const run = async (task, message) => {
    setBusy(true);
    try {
      const result = await task();
      closeDialogs();
      setNotice(message(result));
      await collection.reload();
      await onChanged?.();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-base-content/70">{description}</p>
        </div>
        <input
          ref={input}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(event) => {
            setPending(event.target.files?.[0] ?? null);
            event.target.value = '';
          }}
        />
        <button type="button" className="btn btn-sm shrink-0" onClick={() => input.current.click()}>
          <PackagePlus className="size-4" /> Pasang dari zip
        </button>
      </div>

      {notice && <div role="status" className="alert alert-success alert-soft mb-4 text-sm">{notice}</div>}

      {collection.status === 'loading' ? (
        <div className="grid h-32 place-items-center">
          <span className="loading loading-spinner text-primary" aria-label="Memuat" />
        </div>
      ) : collection.status === 'error' ? (
        <p className="text-sm text-error">{collection.error.message}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {collection.items.map((item) => (
            <li key={item.id} className="card card-border bg-base-100">
              <div className="card-body flex-row items-start gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {item.name}
                    <span className="text-xs font-normal text-base-content/60">v{item.version}</span>
                    {item.locked && <span className="badge badge-ghost badge-xs">Bawaan</span>}
                    {renderMeta?.(item)}
                  </p>
                  {item.broken ? (
                    <p className="mt-1 flex items-center gap-1 text-sm text-error">
                      <TriangleAlert className="size-4 shrink-0" /> Manifest rusak, {noun} ini tidak bisa dipakai.
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-base-content/70">{item.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!item.broken && renderActions?.(item)}
                  {!item.locked && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-square text-error"
                      aria-label={`Hapus ${item.name}`}
                      onClick={() => setTarget(item)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pending && (
        <ConfirmDialog
          title={`Pasang ${noun} dari "${pending.name}"?`}
          message={`Kode ${noun} dijalankan di komputer ini setiap kali situs dibangun, dengan akses penuh ke berkas Anda. Pasang hanya dari sumber yang Anda percaya.`}
          confirmLabel="Pasang"
          error={error}
          busy={busy}
          onCancel={closeDialogs}
          onConfirm={() =>
            run(
              () => installZip(endpoint, pending),
              (info) => `${info.name} v${info.version} ${info.replaced ? 'diperbarui' : 'terpasang'}.`,
            )
          }
        />
      )}
      {target && (
        <ConfirmDialog
          title={`Hapus "${target.name}"?`}
          message={`Folder ${noun} ini dihapus dari komputer. Tindakan ini tidak bisa dibatalkan.`}
          error={error}
          busy={busy}
          onCancel={closeDialogs}
          onConfirm={() => run(() => api.delete(`${endpoint}/${target.id}`), () => `${target.name} dihapus.`)}
        />
      )}
    </div>
  );
}
