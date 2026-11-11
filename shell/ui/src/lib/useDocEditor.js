import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../app/data.jsx';
import { useLayerActions } from '../shell/actions.jsx';
import { api } from './api.js';
import { toFieldErrors } from './field-errors.js';
import { useLayerTitle } from './layer-title.js';
import { previewSite } from './preview.js';

// Watcher untuk dokumen ber-editor (post dan page).
//
// Tiga salinan dokumen:
//   doc      : salinan kerja di layar
//   saved    : dokumen asli terakhir di server
//   drafted  : salinan kerja terakhir yang sudah aman di draft autosave
//
// Aturan simpan:
//   - Autosave menulis ke DRAFT (terpisah), setelah admin berhenti mengetik
//     dan pada interval tetap. Dokumen asli tidak tersentuh.
//   - Save menulis ke dokumen asli lalu menghapus draft.
//   - Publish = Save dengan status "published".
//
// Status lampu: saved | dirty | drafted | saving | error
//
//   kind : 'post' | 'page', untuk membuka halaman yang tepat saat Preview
export function useDocEditor({ endpoint, draftEndpoint, id, path, kind }) {
  const previewTarget = useMemo(() => ({ kind, id }), [kind, id]);
  const { settings } = useData();
  const { idleSeconds, intervalSeconds } = settings.watcher;

  const [doc, setDoc] = useState(null);
  const [saved, setSaved] = useState(null);
  const [draftedJson, setDraftedJson] = useState(null);
  const [staleDraft, setStaleDraft] = useState(null); // draft dari versi dokumen yang lebih lama
  const [restoredAt, setRestoredAt] = useState(null); // draft yang otomatis dipulihkan
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [revision, setRevision] = useState(0);

  const docRef = useRef(null);
  docRef.current = doc;
  const savedRef = useRef(null);
  savedRef.current = saved;

  const docUrl = `${endpoint}/${id}`;
  const draftUrl = `${draftEndpoint}/${id}`;

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get(docUrl), api.get(draftUrl)]).then(
      ([real, draft]) => {
        if (cancelled) return;
        setSaved(real);
        const working = draft ? { ...real, ...draft.data } : real;
        if (draft && JSON.stringify(working) === JSON.stringify(real)) {
          // Draft tanpa perbedaan: tidak ada yang perlu dipulihkan.
          api.delete(draftUrl).catch(() => {});
          setDoc(real);
        } else if (draft && draft.baseUpdatedAt === real.updatedAt) {
          setDoc(working);
          setDraftedJson(JSON.stringify(working));
          setRestoredAt(draft.savedAt);
        } else {
          setDoc(real);
          if (draft) setStaleDraft(draft);
        }
      },
      (error) => !cancelled && setLoadError(error),
    );
    return () => {
      cancelled = true;
    };
  }, [docUrl, draftUrl]);

  const json = doc ? JSON.stringify(doc) : '';
  const changed = Boolean(doc) && json !== JSON.stringify(saved);
  const undrafted = changed && json !== draftedJson;
  const failed = Object.keys(errors).length > 0;
  const status = busy ? 'saving' : failed ? 'error' : !changed ? 'saved' : undrafted ? 'dirty' : 'drafted';

  const set = useCallback((patch) => {
    setDoc((current) => ({ ...current, ...patch }));
    setErrors((current) => (Object.keys(current).length ? {} : current));
  }, []);

  // --- Autosave ke draft -------------------------------------------------
  const saveDraft = useCallback(async () => {
    const working = docRef.current;
    if (!working || !savedRef.current) return;
    const snapshot = JSON.stringify(working);
    if (snapshot === JSON.stringify(savedRef.current)) return;
    try {
      await api.put(draftUrl, { data: working, baseUpdatedAt: savedRef.current.updatedAt });
      setDraftedJson(snapshot);
    } catch (error) {
      setErrors({ _: `Autosave gagal: ${error.message}` });
    }
  }, [draftUrl]);

  // Setelah berhenti mengetik.
  useEffect(() => {
    if (!undrafted || busy) return undefined;
    const timer = setTimeout(saveDraft, idleSeconds * 1000);
    return () => clearTimeout(timer);
  }, [json, undrafted, busy, idleSeconds, saveDraft]);

  // Perubahan dibatalkan sampai sama lagi dengan dokumen asli: draft tidak
  // lagi berguna, dan kalau dibiarkan akan "menghidupkan" perubahan lama.
  useEffect(() => {
    if (changed || draftedJson === null) return;
    setDraftedJson(null);
    setRestoredAt(null);
    api.delete(draftUrl).catch(() => {});
  }, [changed, draftedJson, draftUrl]);

  // Interval tetap, untuk sesi mengetik yang tidak pernah berhenti.
  const undraftedRef = useRef(false);
  undraftedRef.current = undrafted && !busy;
  useEffect(() => {
    const timer = setInterval(() => undraftedRef.current && saveDraft(), intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [intervalSeconds, saveDraft]);

  // Saat layer ditinggalkan atau tab ditutup: amankan sisa perubahan ke draft.
  useEffect(() => {
    const flush = () => {
      if (!undraftedRef.current || !savedRef.current) return;
      fetch(`/api${draftUrl}`, {
        method: 'PUT',
        keepalive: true,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: docRef.current, baseUpdatedAt: savedRef.current.updatedAt }),
      }).catch(() => {});
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [draftUrl]);

  // --- Simpan ke dokumen asli ---------------------------------------------
  const save = useCallback(
    async (overrides = {}) => {
      const working = docRef.current;
      if (!working || busy) return;
      const sent = { ...working, ...overrides };
      setBusy(true);
      try {
        const result = await api.patch(docUrl, sent);
        setErrors({});
        setSaved(result);
        setDraftedJson(null);
        setRestoredAt(null);
        setStaleDraft(null);
        // Kalau admin mengetik selama permintaan berjalan, ketikannya dipertahankan.
        setDoc((current) =>
          current === working
            ? result
            : { ...current, ...overrides, slug: result.slug, updatedAt: result.updatedAt },
        );
        api.delete(draftUrl).catch(() => {});
      } catch (error) {
        setErrors(toFieldErrors(error));
      } finally {
        setBusy(false);
      }
    },
    [busy, docUrl, draftUrl],
  );

  const publish = useCallback(
    () =>
      save({
        status: 'published',
        scheduledAt: null,
        publishedAt: docRef.current?.publishedAt ?? new Date().toISOString(),
      }),
    [save],
  );

  // --- Draft -----------------------------------------------------------------
  const discardDraft = useCallback(async () => {
    await api.delete(draftUrl).catch(() => {});
    setDoc(savedRef.current);
    setDraftedJson(null);
    setRestoredAt(null);
    setStaleDraft(null);
    setRevision((value) => value + 1);
  }, [draftUrl]);

  const applyStaleDraft = useCallback(() => {
    setDoc((current) => ({ ...current, ...staleDraft.data, updatedAt: current.updatedAt }));
    setStaleDraft(null);
    setRevision((value) => value + 1);
  }, [staleDraft]);

  // Preview menampilkan salinan kerja: sisa perubahan disimpan ke draft dulu,
  // dan builder mode preview menimpakan draft di atas dokumen aslinya.
  const preview = useCallback(
    () => previewSite(previewTarget, { before: saveDraft }).catch((error) => setErrors({ _: error.message })),
    [previewTarget, saveDraft],
  );

  useLayerActions({
    status,
    save: doc ? () => save() : undefined,
    publish: doc ? publish : undefined,
    preview: doc ? preview : undefined,
  });
  useLayerTitle(path, doc ? doc.title || '(Tanpa judul)' : '');

  return {
    doc,
    saved,
    set,
    errors,
    status,
    loadError,
    restoredAt,
    staleDraft,
    discardDraft,
    applyStaleDraft,
    // Berubah hanya saat isi dokumen diganti dari luar editor (draft dibuang
    // atau diterapkan), supaya BlockNote dimuat ulang dengan isi baru.
    contentKey: `${id}:${revision}`,
  };
}
