import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { previewSite } from '../lib/preview.js';

// Jembatan antara layer aktif dan panel 2 (header).
// Layer yang punya dokumen mendaftarkan aksinya lewat useLayerActions();
// tombol Save/Publish/Preview, lampu watcher, dan pintasan keyboard
// membaca aksi itu lewat useActions().
//
// status watcher: 'idle' (tidak ada dokumen) | 'saved' | 'dirty' | 'saving' | 'error'

const EMPTY = { status: 'idle', save: null, publish: null, preview: null };
const ActionsContext = createContext({ current: EMPTY, setCurrent: () => {} });

export function ActionsProvider({ children }) {
  const [current, setCurrent] = useState(EMPTY);
  const value = useMemo(() => ({ current, setCurrent }), [current]);
  return <ActionsContext.Provider value={value}>{children}</ActionsContext.Provider>;
}

// Preview selalu tersedia: layer tanpa dokumen membuka beranda situs.
const previewHome = () => previewSite().catch(() => {});

export function useActions() {
  const { current } = useContext(ActionsContext);
  return useMemo(() => (current.preview ? current : { ...current, preview: previewHome }), [current]);
}

export function useLayerActions({ status = 'saved', save, publish, preview }) {
  const { setCurrent } = useContext(ActionsContext);
  const handlers = useRef({});
  handlers.current = { save, publish, preview };
  const hasSave = Boolean(save);
  const hasPublish = Boolean(publish);
  const hasPreview = Boolean(preview);

  useEffect(() => {
    setCurrent({
      status,
      save: hasSave ? () => handlers.current.save() : null,
      publish: hasPublish ? () => handlers.current.publish() : null,
      preview: hasPreview ? () => handlers.current.preview() : null,
    });
    return () => setCurrent(EMPTY);
  }, [status, hasSave, hasPublish, hasPreview, setCurrent]);
}
