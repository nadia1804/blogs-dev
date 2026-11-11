import { useEffect } from 'react';

// Pintasan global shell. `label` dipakai untuk tooltip tombol.
export const SHORTCUTS = {
  save: { label: 'Ctrl+S', test: (e) => e.code === 'KeyS' && !e.shiftKey && !e.altKey },
  publish: { label: 'Ctrl+Enter', test: (e) => e.code === 'Enter' && !e.shiftKey && !e.altKey },
  // Ctrl+Space bisa diambil Windows untuk ganti metode input (IME),
  // jadi Ctrl+Alt+P disediakan sebagai cadangan.
  preview: {
    label: 'Ctrl+Space',
    test: (e) => (e.code === 'Space' && !e.shiftKey && !e.altKey) || (e.code === 'KeyP' && e.altKey && !e.shiftKey),
  },
};

// handlers: { save?, publish?, preview? }. Pintasan yang cocok selalu
// ditelan (mis. Ctrl+S tidak membuka dialog simpan browser), meski
// layer aktif tidak punya aksinya.
export function useShortcuts(handlers) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.repeat) return;
      for (const [name, shortcut] of Object.entries(SHORTCUTS)) {
        if (!shortcut.test(event)) continue;
        event.preventDefault();
        handlers[name]?.();
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
