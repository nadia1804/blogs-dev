import { useCallback, useState } from 'react';
import { useData } from '../app/data.jsx';
import { useLayerActions } from '../shell/actions.jsx';
import { toFieldErrors } from './field-errors.js';
import { useUnsavedGuard } from './useUnsavedGuard.js';

// Logika form untuk halaman Settings. Tiap halaman mengedit salinan
// settings.json; Save (tombol, Ctrl+S) menulis seluruhnya sekaligus.
//
// Mengembalikan objek yang cocok dengan <FormPage form={...}>, plus:
//   values           : salinan settings yang sedang diedit
//   setIn(bagian, p) : ubah field di satu bagian, mis. setIn('site', { title })
//   errors           : { 'site.url': pesan, ... }
export function useSettingsForm() {
  const { settings, saveSettings } = useData();
  const [values, setValues] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const dirty = JSON.stringify(values) !== JSON.stringify(settings);

  const setIn = useCallback((section, patch) => {
    setValues((current) => ({ ...current, [section]: { ...current[section], ...patch } }));
    setErrors((current) => (Object.keys(current).length ? {} : current));
  }, []);

  const save = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    try {
      setValues(await saveSettings(values));
      setErrors({});
    } catch (error) {
      setErrors(toFieldErrors(error));
    } finally {
      setSaving(false);
    }
  };

  const failed = Object.keys(errors).length > 0;
  useLayerActions({ status: saving ? 'saving' : failed ? 'error' : dirty ? 'dirty' : 'saved', save });
  useUnsavedGuard(dirty);

  return { values, setIn, errors, dirty, saving, save, doc: values, isNew: false, loadError: null };
}
