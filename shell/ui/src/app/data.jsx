import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

// Data yang dipakai di seluruh shell: settings dan daftar post type.
const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [state, setState] = useState({
    status: 'loading',
    settings: null,
    postTypes: [],
    pastels: {},
    contentSchemas: [],
    error: null,
  });

  const reload = useCallback(async () => {
    try {
      const [settings, postTypes, meta] = await Promise.all([
        api.get('/settings'),
        api.get('/post-types'),
        api.get('/meta'),
      ]);
      postTypes.sort((a, b) => Number(b.system) - Number(a.system) || a.label.localeCompare(b.label));
      setState({ status: 'ready', settings, postTypes, ...meta, error: null });
    } catch (error) {
      setState((previous) => ({ ...previous, status: 'error', error }));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Simpan settings. UI langsung memakai nilai baru; kalau server menolak,
  // nilai lama dikembalikan dan error diteruskan ke pemanggil.
  const saveSettings = useCallback(async (next) => {
    let previous;
    setState((current) => {
      previous = current.settings;
      return { ...current, settings: next };
    });
    try {
      const saved = await api.put('/settings', next);
      setState((current) => ({ ...current, settings: saved }));
      return saved;
    } catch (error) {
      setState((current) => ({ ...current, settings: previous }));
      throw error;
    }
  }, []);

  const value = useMemo(() => ({ ...state, reload, saveSettings }), [state, reload, saveSettings]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
