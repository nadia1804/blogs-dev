import { Router } from 'express';
import { StorageError } from '@blogs/core';

// Router CRUD generik untuk satu koleksi core.
// `resolve(req)` mengembalikan koleksinya, sehingga bisa bergantung pada
// parameter URL (mis. /posts/:type).
export function collectionRouter(resolve) {
  const router = Router({ mergeParams: true });

  router.get('/', async (req, res) => {
    res.json(await resolve(req).list());
  });

  router.post('/', async (req, res) => {
    res.status(201).json(await resolve(req).create(req.body ?? {}));
  });

  router.get('/:id', async (req, res) => {
    const doc = await resolve(req).get(req.params.id);
    if (!doc) throw new StorageError('NOT_FOUND', 'Dokumen tidak ditemukan');
    res.json(doc);
  });

  router.patch('/:id', async (req, res) => {
    res.json(await resolve(req).update(req.params.id, req.body ?? {}));
  });

  router.delete('/:id', async (req, res) => {
    await resolve(req).remove(req.params.id);
    res.status(204).end();
  });

  return router;
}
