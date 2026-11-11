import { useCallback, useEffect, useState } from 'react';
import { useLayerActions } from '../shell/actions.jsx';
import { api } from './api.js';
import { toFieldErrors } from './field-errors.js';
import { useLayerTitle } from './layer-title.js';
import { navigate } from './router.jsx';
import { useUnsavedGuard } from './useUnsavedGuard.js';

// Logika form satu dokumen: muat, lacak perubahan, simpan, dan hubungkan
// ke panel 2 (tombol Save, Ctrl+S, lampu watcher, judul breadcrumb).
//
//   endpoint  : koleksi API, mis. "/authors"
//   id        : ID dokumen, atau "new" untuk dokumen baru
//   path      : path layer form ini; listPath: path layer daftarnya
//   defaults  : nilai awal dokumen baru
//   titleOf   : doc -> judul breadcrumb
//   onSaved   : dipanggil setelah berhasil menyimpan
//
// Untuk form yang bentuk datanya di layar berbeda dari bentuk simpannya:
//   fromDoc   : dokumen server -> nilai form
//   toPayload : nilai form -> dokumen yang dikirim
//   validate  : nilai form -> { field: pesan } bila belum boleh disimpan
const same = (value) => value;

export function useDocForm({
  endpoint,
  id,
  path,
  listPath,
  defaults,
  titleOf,
  onSaved,
  fromDoc = same,
  toPayload = same,
  validate,
}) {
  const isNew = id === 'new';
  const [doc, setDoc] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    const start = (value) => {
      if (cancelled) return;
      setDoc(value);
      setBaseline(JSON.stringify(value));
    };
    if (isNew) start(defaults);
    else api.get(`${endpoint}/${id}`).then((value) => start(fromDoc(value)), (error) => !cancelled && setLoadError(error));
    return () => {
      cancelled = true;
    };
    // `defaults` sengaja tidak jadi dependensi: hanya dipakai saat form dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, id, isNew]);

  const dirty = doc !== null && JSON.stringify(doc) !== baseline;

  const set = useCallback((patch) => {
    setDoc((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of [...Object.keys(patch), '_']) delete next[key];
      return next;
    });
  }, []);

  const save = async () => {
    if (!doc || saving || (!dirty && !isNew)) return;
    const problems = validate?.(doc);
    if (problems && Object.keys(problems).length) return setErrors(problems);
    setSaving(true);
    try {
      const payload = toPayload(doc);
      const saved = isNew ? await api.post(endpoint, payload) : await api.patch(`${endpoint}/${id}`, payload);
      const value = fromDoc(saved);
      setErrors({});
      setDoc(value);
      setBaseline(JSON.stringify(value));
      await onSaved?.(saved);
      if (isNew) navigate(`${listPath}/${saved.id}`, { replace: true, force: true });
    } catch (error) {
      setErrors(toFieldErrors(error));
    } finally {
      setSaving(false);
    }
  };

  const failed = Object.keys(errors).length > 0;
  useLayerActions({
    status: saving ? 'saving' : failed ? 'error' : dirty ? 'dirty' : 'saved',
    save: doc ? save : undefined,
  });

  useLayerTitle(path, doc ? titleOf(doc) || (isNew ? 'Baru' : '') : '');

  useUnsavedGuard(dirty);

  return { doc, set, errors, isNew, dirty, saving, loadError, save };
}
