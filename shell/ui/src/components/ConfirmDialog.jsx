import { useEffect } from 'react';

// Dialog konfirmasi untuk aksi yang tidak bisa dibatalkan.
export function ConfirmDialog({ title, message, confirmLabel = 'Hapus', error, busy, onConfirm, onCancel }) {
  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="modal modal-open" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="modal-box max-w-sm">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-base-content/70">{message}</p>
        {error && <p className="mt-3 text-sm text-error" role="alert">{error}</p>}
        <div className="modal-action">
          <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel} autoFocus>Batal</button>
          <button type="button" className="btn btn-sm btn-error" onClick={onConfirm} disabled={busy}>
            {busy && <span className="loading loading-spinner loading-xs" />}
            {confirmLabel}
          </button>
        </div>
      </div>
      <button type="button" className="modal-backdrop" aria-label="Tutup" onClick={onCancel} />
    </div>
  );
}
