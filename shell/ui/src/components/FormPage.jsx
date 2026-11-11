import { Save } from 'lucide-react';
import { SHORTCUTS } from '../lib/shortcuts.js';

// Kerangka halaman form: menangani keadaan memuat/gagal, pesan error umum,
// dan tombol simpan. `form` = hasil useDocForm().
export function FormPage({ title, form, children }) {
  if (form.loadError) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center text-sm">
        <p className="text-error">{form.loadError.message}</p>
      </div>
    );
  }
  if (!form.doc) {
    return (
      <div className="grid h-40 place-items-center">
        <span className="loading loading-spinner text-primary" aria-label="Memuat" />
      </div>
    );
  }

  return (
    <form
      className="mx-auto max-w-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        form.save();
      }}
    >
      <h1 className="mb-5 truncate text-xl font-semibold">{title}</h1>
      {form.errors._ && <div role="alert" className="alert alert-error alert-soft mb-4 text-sm">{form.errors._}</div>}
      <div className="card card-border bg-base-100">
        <div className="card-body gap-4">{children}</div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        <span className="text-xs text-base-content/60">{SHORTCUTS.save.label}</span>
        <button type="submit" className="btn btn-primary btn-sm" disabled={form.saving || (!form.dirty && !form.isNew)}>
          {form.saving ? <span className="loading loading-spinner loading-xs" /> : <Save className="size-4" />}
          Simpan
        </button>
      </div>
    </form>
  );
}
