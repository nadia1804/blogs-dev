import { cp } from 'node:fs/promises';
import { join } from 'node:path';
import { loadPlugins } from '../contracts/plugin.js';
import { loadTheme, themeOptions } from '../contracts/theme.js';
import { PASTELS } from '../defaults/palette.js';
import { rss, robotsTxt, sitemap } from '../seo/feeds.js';
import { buildMeta, renderHead } from '../seo/head.js';
import { createStore } from '../storage/store.js';
import { cx, html, raw } from '../util/html.js';
import { icon } from './icons.js';
import { imageSize } from './image-size.js';
import { loadContent } from './load.js';
import { openOutput } from './output.js';
import { renderArticle, renderBlocks } from './render-blocks.js';
import { createSite } from './site.js';
import { compileStyles } from './styles.js';
import { bodySnippets, headerFiles, serviceWorker } from './caching.js';
import { createImagePipeline } from '../media/pipeline.js';

export { buildIsolated } from './isolated.js';

// MESIN SSG
// =========
// build() membaca konten, menyusun model situs, lalu meminta tema merender
// setiap halaman menjadi HTML statis.
//
//   dataDir   : folder data (konten)
//   themesDir : folder berisi tema
//   outDir    : folder keluaran (dist atau preview)
//   mode      : 'production' | 'preview'
//   basePath  : awalan alamat bila situs tidak di akar domain (mis. "/preview")
//
// `ctx` YANG DITERIMA TEMA
//   site          identitas situs: title, tagline, description, language,
//                 logo/icon ({ src, width, height }), hero { title, subtitle }
//   route         halaman ini: kind, path, dan datanya (post, page, posts,
//                 archive, pagination, related, breadcrumb)
//   head, bodyEnd HTML yang wajib disertakan layout
//   stylesheet    alamat CSS tema (atau null)
//   menu(id)      item menu: { label, href, icon, newTab, active, children }
//   url(path)     alamat halaman di situs ini (sudah termasuk basePath)
//   asset(file)   alamat berkas di folder assets tema
//   picture(src, { alt, sizes, className, priority, lazy })
//                 elemen gambar siap pakai: WebP/AVIF dengan srcset, lebar dan
//                 tinggi, lazy loading. Pakai ini untuk semua gambar konten.
//   image(src)    data gambarnya saja: { src, width, height, srcset }
//   icon(name, class)   ikon Lucide sebagai SVG inline
//   renderBlocks(content)  konten editor -> HTML
//   renderArticle(content) -> { intro, body, toc } untuk halaman berdaftar isi;
//                          toc = [{ id, text, level }] dari heading konten
//   formatDate(iso)        tanggal sesuai bahasa situs
//   features      fitur yang disediakan plugin aktif, mis. { search: true }
//   options       pengaturan tema (default manifest + isian admin)
//   posts         semua post yang tampil, terbaru dulu
//   categories    semua kategori (tiap kategori punya postType dan path)
//   postTypes, pastels, mode
//   html, raw, cx          alat templating (lihat util/html.js)
export async function build({ dataDir, themesDir, pluginsDir, outDir, cacheDir, mode = 'production', basePath = '', now }) {
  const started = Date.now();
  let stats = null;
  const store = createStore(dataDir);
  const site = createSite(await loadContent(store, { mode, now }));
  const { settings } = site;
  const warnings = [...site.warnings];
  const theme = await loadTheme(themesDir, settings.theme.active);

  const siteUrl = settings.site.url.replace(/\/$/, '');
  if (!siteUrl && mode === 'production') {
    warnings.push('Alamat situs belum diisi (Settings > Identitas situs): canonical, sitemap, feed, dan data terstruktur dilewati.');
  }
  const url = (path) => basePath + path;
  const abs = (path) => (siteUrl ? siteUrl + path : '');
  const isMedia = (src) => typeof src === 'string' && src.startsWith('media/');

  // Gambar konten diolah pipeline (WebP, ukuran bertingkat). Berkas asli
  // hanya ikut ke situs bila dirujuk langsung: gambar berbagi dan favicon.
  const images = createImagePipeline({
    dataDir,
    cacheDir: cacheDir ?? join(dataDir, '../.cache/images'),
    settings: settings.images,
    url,
  });
  const { image, picture } = images;
  const env = {
    settings,
    mode,
    url,
    abs,
    media(src) {
      if (!src) return '';
      if (!isMedia(src)) return src;
      if (siteUrl) images.original(src); // tanpa alamat situs, tag yang merujuknya tidak ditulis
      return abs(`/${src}`);
    },
    imageSize: (src) => (isMedia(src) ? imageSize(join(dataDir, src)) : null),
  };
  images.original(settings.site.icon);

  const plugins = await loadPlugins(pluginsDir ?? join(themesDir, '../plugins'), { settings, mode, basePath, siteUrl, url, abs });

  const out = await openOutput(outDir);
  try {
    // Aset tema. Media konten disalin pipeline gambar setelah semua halaman dirender.
    await cp(join(theme.dir, 'assets'), join(out.dir, 'assets/theme'), { recursive: true }).catch(ignoreMissing);
    const cssName = await compileStyles(theme, join(out.dir, 'assets'));

    const dateFormat = new Intl.DateTimeFormat(settings.site.language || 'id', { dateStyle: 'long' });
    const shared = {
      site: {
        ...settings.site,
        logo: image(settings.site.logo),
        logoSrc: settings.site.logo, // untuk picture(): path asli di folder data
        icon: { src: images.original(settings.site.icon) },
        hero: settings.hero,
      },
      // Pengaturan disimpan per tema, supaya berganti tema tidak mencampur nilainya.
      options: themeOptions(theme.manifest, settings.theme.options[theme.manifest.id]),
      posts: site.posts,
      categories: site.categories,
      features: plugins.features,
      mode,
      postTypes: site.types,
      pastels: PASTELS,
      stylesheet: cssName ? url(`/assets/${cssName}`) : null,
      url,
      asset: (file) => url(`/assets/theme/${file}`),
      image,
      picture: (src, options) => raw(picture(src, options)),
      icon,
      renderBlocks: (content) => renderBlocks(content, { image, picture, overrides: theme.blocks }),
      renderArticle: (content) => renderArticle(content, { image, picture, overrides: theme.blocks }),
      formatDate: (iso) => (iso ? dateFormat.format(new Date(iso)) : ''),
      html,
      raw,
      cx,
    };

    const coreBodyEnd = bodySnippets({ caching: settings.caching, basePath, mode });
    const indexable = [];

    // Render satu halaman: SEO head, isi dari `content(ctx)`, layout tema,
    // lalu hook plugin. Dipakai rute situs dan rute tambahan dari plugin.
    const renderRoute = async (route, content) => {
      const meta = buildMeta(route, env);
      warnings.push(...meta.warnings);
      const withHref = (item) => ({
        ...item,
        href: item.href ?? url(item.path),
        active: Boolean(item.path) && item.path === route.path,
        children: item.children.map(withHref),
      });
      const ctx = { ...shared, route, meta, menu: (id) => (site.menus[id] ?? []).map(withHref) };
      ctx.head = raw(String(renderHead(meta, env)) + plugins.head(ctx));
      ctx.bodyEnd = raw(coreBodyEnd + plugins.bodyEnd(ctx));

      const page = plugins.page(String(theme.layout(ctx, content(ctx))), ctx);
      await out.write(route.path.endsWith('/') ? `${route.path}index.html` : route.path, page);
      if (meta.robots.index && meta.canonical) {
        indexable.push({
          loc: meta.canonical,
          lastmod: route.post?.updatedAt ?? route.page?.updatedAt,
          image: route.post || route.page ? meta.image : '',
        });
      }
    };

    for (const route of site.routes) await renderRoute(route, theme.templates[route.kind]);

    // Halaman tambahan dari plugin (mis. halaman antara safelink).
    const taken = new Set(site.routes.map((route) => route.path));
    for (const extra of plugins.routes) {
      if (taken.has(extra.path)) {
        warnings.push(`Alamat ${extra.path} dari plugin "${extra.plugin}" sudah dipakai halaman lain, jadi dilewati.`);
        continue;
      }
      taken.add(extra.path);
      await renderRoute(
        { kind: 'custom', path: extra.path, custom: { title: extra.title, index: extra.index !== false } },
        (ctx) => raw(String(extra.render(ctx) ?? '')),
      );
    }

    const allowIndex = mode === 'production' && settings.seo.indexSite;
    await out.write('robots.txt', robotsTxt({ allow: allowIndex, sitemapUrl: abs('/sitemap.xml') }));
    if (siteUrl) {
      await out.write('sitemap.xml', sitemap(indexable));
      await out.write(
        'feed.xml',
        rss({
          site: settings.site,
          abs,
          posts: site.posts,
          descriptionOf: (post) => post.seo.description || post.excerpt || post.text.slice(0, 300),
        }),
      );
    }

    const imageStats = await images.run(out.dir);
    await plugins.done({ outDir: out.dir, write: out.write });
    warnings.push(...plugins.warnings);

    if (mode === 'production') {
      for (const [file, content] of Object.entries(headerFiles())) await out.write(file, content);
      await out.write('sw.js', serviceWorker({ enabled: settings.caching.serviceWorker, buildId: started.toString(36), basePath }));
    }

    await out.commit();
    stats = imageStats;
  } catch (error) {
    await out.abort();
    throw error;
  }

  const pathsById = (items) => Object.fromEntries(items.map((item) => [item.id, url(item.path)]));
  return {
    pages: site.routes.length + plugins.routes.length,
    ms: Date.now() - started,
    warnings,
    images: stats,
    urlOf: { posts: pathsById(site.posts), pages: pathsById(site.pages) },
  };
}

function ignoreMissing(error) {
  if (error.code !== 'ENOENT') throw error;
}
