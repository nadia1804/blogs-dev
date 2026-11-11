import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

// Muat daftar sebuah koleksi dari API. `endpoint` null = tidak memuat apa pun.
export function useCollection(endpoint) {
  const [state, setState] = useState({ status: 'loading', items: [], error: null });

  const reload = useCallback(async () => {
    if (!endpoint) return setState({ status: 'ready', items: [], error: null });
    try {
      setState({ status: 'ready', items: await api.get(endpoint), error: null });
    } catch (error) {
      setState({ status: 'error', items: [], error });
    }
  }, [endpoint]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
