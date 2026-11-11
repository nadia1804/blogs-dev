import { Router } from 'express';
import { iconBody, iconSvg, tablerCatalog } from '@blogs/core/icons';

// Ikon pack kedua (Tabler) untuk shell. Lucide sudah ikut di bundel shell;
// Tabler dilayani dari server supaya shell tidak ikut membengkak.
//   GET /icons/tabler          katalog untuk pemilih ikon (dimuat saat dibuka)
//   GET /icons/tabler/:name    satu ikon sebagai SVG
export function iconsRouter() {
  const router = Router();
  const cache = 'public, max-age=86400';

  router.get('/tabler', (req, res) => {
    res.set('cache-control', cache).json(tablerCatalog());
  });

  router.get('/tabler/:name', (req, res) => {
    const body = iconBody(`tabler:${req.params.name}`);
    if (!body) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ikon tidak ditemukan' } });
    res.set('cache-control', cache).type('image/svg+xml').send(iconSvg(body));
  });

  return router;
}
