import { Router } from 'express';

// Draft autosave untuk dokumen yang punya editor: page dan post.
//   /drafts/pages/:id
//   /drafts/posts/:type/:id
export function draftsRouter(store) {
  const router = Router();

  const mount = (path, dirOf) => {
    router
      .route(path)
      .get(async (req, res) => {
        res.json(await store.drafts.get(dirOf(req), req.params.id)); // null = tidak ada draft
      })
      .put(async (req, res) => {
        const { data = {}, baseUpdatedAt = null } = req.body ?? {};
        res.json(await store.drafts.save(dirOf(req), req.params.id, { data, baseUpdatedAt }));
      })
      .delete(async (req, res) => {
        await store.drafts.remove(dirOf(req), req.params.id);
        res.status(204).end();
      });
  };

  mount('/pages/:id', () => store.pages.dir);
  mount('/posts/:type/:id', (req) => store.posts(req.params.type).dir);

  return router;
}
