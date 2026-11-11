import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { mediaUrl } from '../lib/api.js';
import { IMAGE_ACCEPT, uploadImage } from '../lib/upload.js';
import { Field } from './fields.jsx';

// Path media di data -> URL shell; URL lain dipakai apa adanya.
export const imageUrl = (src) => (src?.startsWith('media/') ? mediaUrl(src) : src ?? '');

// Field unggah satu gambar. Nilainya path gambar (string), kosong = tanpa gambar.
export function ImageInput({ label, hint, error, value, onChange, aspect = 'aspect-video' }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setFailure(null);
    try {
      onChange(await uploadImage(file));
    } catch (problem) {
      setFailure(problem.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field label={label} hint={hint} error={failure ?? error}>
      <input ref={input} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={pick} />
      {value ? (
        <div className="flex flex-col gap-2">
          <img
            src={imageUrl(value)}
            alt=""
            className={`${aspect} w-full rounded-field border border-base-300 bg-base-200 object-cover`}
          />
          <div className="flex gap-2">
            <button type="button" className="btn btn-sm flex-1" disabled={busy} onClick={() => input.current.click()}>
              {busy ? <span className="loading loading-spinner loading-xs" /> : <ImagePlus className="size-4" />}
              Ganti
            </button>
            <button type="button" className="btn btn-sm btn-ghost text-error" onClick={() => onChange('')}>
              <Trash2 className="size-4" /> Hapus
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current.click()}
          className={`${aspect} flex w-full flex-col items-center justify-center gap-1 rounded-field border border-dashed border-base-300 text-sm text-base-content/60 hover:bg-base-200`}
        >
          {busy ? <span className="loading loading-spinner" /> : <ImagePlus className="size-6" />}
          {busy ? 'Mengunggah…' : 'Unggah gambar'}
        </button>
      )}
    </Field>
  );
}
