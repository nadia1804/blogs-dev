import { useState } from 'react';
import { Inbox, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { Link } from '../lib/router.jsx';
import { ConfirmDialog } from './ConfirmDialog.jsx';

// Halaman daftar generik untuk satu koleksi.
//
//   collection : hasil useCollection()
//   endpoint   : koleksi API, dipakai untuk menghapus
//   columns    : [{ header, cell: (item) => node, className? }]
//                kolom pertama otomatis menjadi link ke rowTo(item)
//   add        : { label, to } atau { label, onClick }
//   nameOf     : item -> nama untuk dialog hapus
//   canDelete  : item -> boolean (default: semua bisa dihapus)
//   onDeleted  : dipanggil setelah berhasil menghapus
export function ListPage({ title, description, collection, endpoint, columns, rowTo, add, nameOf, canDelete, onDeleted, emptyText, footer }) {
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { items, status } = collection;

  const close = () => {
    setTarget(null);
    setError(null);
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`${endpoint}/${target.id}`);
      close();
      await collection.reload();
      await onDeleted?.(target);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const AddButton = add && (add.to ? Link : 'button');

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{title}</h1>
          {description && <p className="text-sm text-base-content/70">{description}</p>}
        </div>
        {add && (
          <AddButton
            className="btn btn-primary btn-sm shrink-0"
            {...(add.to ? { to: add.to } : { type: 'button', onClick: add.onClick })}
          >
            <Plus className="size-4" /> {add.label}
          </AddButton>
        )}
      </div>

      <div className="card card-border overflow-x-auto bg-base-100">
        {status === 'loading' ? (
          <div className="grid h-32 place-items-center">
            <span className="loading loading-spinner text-primary" aria-label="Memuat" />
          </div>
        ) : status === 'error' ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-sm">
            <p className="text-error">{collection.error.message}</p>
            <button type="button" className="btn btn-sm" onClick={collection.reload}>Coba lagi</button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-base-content/60">
            <Inbox className="size-8" />
            <p>{emptyText}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                {columns.map((column) => <th key={column.header} className={column.className}>{column.header}</th>)}
                <th className="w-12"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-base-200/50">
                  {columns.map((column, index) => (
                    <td key={column.header} className={column.className}>
                      {index === 0 ? (
                        <Link to={rowTo(item)} className="link-hover link font-medium">{column.cell(item)}</Link>
                      ) : (
                        column.cell(item)
                      )}
                    </td>
                  ))}
                  <td>
                    {(canDelete?.(item) ?? true) && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs btn-square text-error"
                        aria-label={`Hapus ${nameOf(item)}`}
                        onClick={() => setTarget(item)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {footer}

      {target && (
        <ConfirmDialog
          title={`Hapus "${nameOf(target)}"?`}
          message="Tindakan ini tidak bisa dibatalkan."
          error={error}
          busy={busy}
          onConfirm={remove}
          onCancel={close}
        />
      )}
    </div>
  );
}
