import express from 'express';
import { join } from 'node:path';
import { createStore, StorageError } from '@blogs/core';
import { manifest as pluginManifest } from '@blogs/core/contracts/plugin';
import { manifest as themeManifest } from '@blogs/core/contracts/theme';
import { CONTENT_SCHEMAS, PASTELS } from '@blogs/core/defaults';
import { createSecrets } from '@blogs/core/secrets';
import { localOnly } from './middleware/local-only.js';
import { apiNotFound, errorHandler } from './middleware/errors.js';
import { backupRouter } from './routes/backup.js';
import { collectionRouter } from './routes/collection.js';
import { iconsRouter } from './routes/icons.js';
import { publishRouter } from './routes/publish.js';
import { draftsRouter } from './routes/drafts.js';
import { describePlugin, describeTheme, extensionsRouter } from './routes/extensions.js';
import { previewRouter } from './routes/preview.js';
import { uploadsRouter } from './routes/uploads.js';

// Aplikasi Express tanpa listen(), supaya bisa dipakai server dan tes.
//   dataDir    : folder konten
//   themesDir  : folder tema
//   pluginsDir : folder plugin
//   previewDir : folder keluaran build preview
//   distDir    : folder keluaran build produksi
//   deployEndpoints : alamat API host pengganti, hanya untuk tes
export function createApp({ dataDir, themesDir, pluginsDir, previewDir, distDir, deployEndpoints }) {
  const store = createStore(dataDir);
  const secrets = createSecrets(dataDir);
  const app = express();
  app.disable('x-powered-by');
  app.use(localOnly());

  const api = express.Router();
  api.use(express.json({ limit: '5mb' }));

  api.get('/meta', (req, res) => res.json({ pastels: PASTELS, contentSchemas: CONTENT_SCHEMAS }));

  api.get('/settings', async (req, res) => res.json(await store.settings.get()));
  api.put('/settings', async (req, res) => res.json(await store.settings.save(req.body ?? {})));

  api.use('/post-types', collectionRouter(() => store.postTypes));
  api.use('/posts/:type', collectionRouter((req) => store.posts(req.params.type)));
  api.use('/categories/:type', collectionRouter((req) => store.categories(req.params.type)));
  api.use('/pages', collectionRouter(() => store.pages));
  api.use('/authors', collectionRouter(() => store.authors));
  api.use('/navigation', collectionRouter(() => store.navigation));
  api.use('/drafts', draftsRouter(store));

  api.use('/uploads', uploadsRouter(dataDir));
  api.use('/icons', iconsRouter());

  // Berkas media (logo, gambar unggahan) dari folder data.
  api.use(
    '/media',
    express.static(join(dataDir, 'media'), {
      fallthrough: true,
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  );

  api.use('/preview', previewRouter({ dataDir, themesDir, pluginsDir, previewDir }));

  api.use('/publish', publishRouter({ dataDir, themesDir, pluginsDir, distDir, store, secrets, endpoints: deployEndpoints }));
  api.use(backupRouter({ dataDir }));

  api.use(
    '/themes',
    extensionsRouter({
      dir: themesDir,
      manifestFile: 'theme.json',
      schema: themeManifest,
      label: 'Tema',
      store,
      describe: describeTheme,
      beforeRemove(id, settings) {
        if (settings.theme.active === id) throw new StorageError('CONFLICT', 'Tema ini sedang aktif. Aktifkan tema lain dulu.');
      },
    }),
  );
  api.use(
    '/plugins',
    extensionsRouter({
      dir: pluginsDir,
      manifestFile: 'plugin.json',
      schema: pluginManifest,
      label: 'Plugin',
      store,
      describe: describePlugin,
      // Pengaturan plugin yang dihapus ikut dibuang.
      async afterRemove(id) {
        const settings = await store.settings.get();
        const { [id]: removed, ...plugins } = settings.plugins;
        if (removed) await store.settings.save({ ...settings, plugins });
      },
    }),
  );

  api.use(apiNotFound);
  app.use('/api', api);

  // Hasil build preview, dilayani di /preview/ seperti situs statis biasa.
  app.use('/preview', express.static(previewDir));
  app.use('/preview', (req, res) => {
    res.status(404).sendFile(join(previewDir, '404.html'), (error) => {
      if (error) res.type('text').send('Preview belum dibangun. Tekan Preview di shell.');
    });
  });

  app.use(errorHandler);

  return { app, store };
}
