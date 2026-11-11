import { Router } from 'express';
import { buildIsolated } from '@blogs/core/builder';

// POST /preview  { target?: { kind: 'post' | 'page', id } }
// Membangun situs dalam mode preview (draft ikut tampil) ke folder preview,
// lalu mengembalikan alamat halaman yang diminta, atau beranda.
export function previewRouter({ dataDir, themesDir, pluginsDir, previewDir }) {
  const router = Router();
  let queue = Promise.resolve(); // build dijalankan satu per satu

  router.post('/', async (req, res) => {
    const run = queue.then(() =>
      buildIsolated({ dataDir, themesDir, pluginsDir, outDir: previewDir, mode: 'preview', basePath: '/preview' }),
    );
    queue = run.catch(() => {});

    let result;
    try {
      result = await run;
    } catch (error) {
      return res.status(500).json({ error: { code: 'BUILD_FAILED', message: error.message } });
    }

    const { kind, id } = req.body?.target ?? {};
    const url =
      (kind === 'post' && result.urlOf.posts[id]) || (kind === 'page' && result.urlOf.pages[id]) || '/preview/';
    res.json({ url, pages: result.pages, ms: result.ms, warnings: result.warnings });
  });

  return router;
}
