import { useEffect } from 'react';
import { setNavigationGuard } from './router.jsx';

// Cegah kehilangan perubahan: minta konfirmasi saat pindah layer, dan
// biarkan browser memperingatkan saat tab ditutup.
export function useUnsavedGuard(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const release = setNavigationGuard(() =>
      window.confirm('Ada perubahan yang belum disimpan. Tinggalkan halaman ini?'),
    );
    const onBeforeUnload = (event) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      release();
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [dirty]);
}
