import { Router } from 'express';
import { buildIsolated } from '@blogs/core/builder';
import { deploy, DeployError, TARGETS } from '@blogs/core/deploy';

// Publish situs:
//   GET  /publish/secrets   token mana yang sudah tersimpan (tanpa nilainya)
//   PUT  /publish/secrets   simpan atau hapus token
//   POST /publish/build     bangun situs produksi ke folder dist
//   POST /publish/deploy    bangun, lalu unggah ke target di Settings > Publish
export function publishRouter({ dataDir, themesDir, pluginsDir, distDir, store, secrets, endpoints }) {
  const router = Router();
  let queue = Promise.resolve(); // build dan deploy dijalankan satu per satu

  const exclusive = (task) => {
    const run = queue.then(task);
    queue = run.catch(() => {});
    return run;
  };
  const buildSite = () => buildIsolated({ dataDir, themesDir, pluginsDir, outDir: distDir, mode: 'production' });
  const failed = (res, status, code, error) => res.status(status).json({ error: { code, message: error.message } });

  router.get('/secrets', async (req, res) => res.json(await secrets.status()));
  router.put('/secrets', async (req, res) => {
    await secrets.set(req.body ?? {});
    res.json(await secrets.status());
  });

  router.post('/build', async (req, res) => {
    try {
      res.json({ ...(await exclusive(buildSite)), outDir: distDir });
    } catch (error) {
      failed(res, 500, 'BUILD_FAILED', error);
    }
  });

  router.post('/deploy', async (req, res) => {
    const { publish } = await store.settings.get();
    const target = TARGETS[publish.target];
    if (!target) return failed(res, 400, 'INVALID', new Error('Target publish belum dipilih di Settings > Publish.'));
    const token = await secrets.get(target.secret);

    let built;
    try {
      built = await exclusive(buildSite);
    } catch (error) {
      return failed(res, 500, 'BUILD_FAILED', error);
    }
    try {
      const deployed = await exclusive(() => deploy({ dir: distDir, publish, token, endpoints }));
      res.json({ build: built, deploy: deployed, target: target.label });
    } catch (error) {
      failed(res, error instanceof DeployError ? 502 : 500, 'DEPLOY_FAILED', error);
    }
  });

  return router;
}
