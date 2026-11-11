import { buildSchema } from '../schema-types/index.js';
import { html, raw } from '../util/html.js';

// SEO untuk setiap halaman, dibuat oleh core (bukan tema), supaya tema apa
// pun tetap menghasilkan tag yang lengkap dan benar.
//
//   buildMeta(route, env)  -> data SEO halaman (judul, deskripsi, canonical, ...)
//   renderHead(meta, env)  -> tag <head> siap pakai
//
// env: { settings, abs(path), media(path), mode }
//   abs()   = alamat absolut, kosong bila alamat situs belum diisi
//   media() = alamat absolut berkas media

const DESCRIPTION_LENGTH = 155;
const LOCALES = { id: 'id_ID', en: 'en_US', ms: 'ms_MY' };

const truncate = (text, length) => (text.length <= length ? text : `${text.slice(0, length - 1).trimEnd()}…`);
const compact = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== '' && value !== null));

function breadcrumbLd(route, { abs }) {
  if (!route.breadcrumb?.length || !abs('/')) return null;
  const items = [{ label: 'Beranda', path: '/' }, ...route.breadcrumb];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: abs(item.path),
    })),
  };
}

function publisher({ settings, media }) {
  const logo = media(settings.site.logo);
  const profiles = settings.seo.socialProfiles.filter((url) => /^https?:\/\//.test(url));
  return compact({
    '@type': 'Organization',
    name: settings.seo.organizationName || settings.site.title,
    logo: logo ? { '@type': 'ImageObject', url: logo } : undefined,
    sameAs: profiles.length ? profiles : undefined,
  });
}


export function buildMeta(route, env) {
  const { settings, abs, media, mode } = env;
  const { site, seo: global } = settings;
  const withTemplate = (title) => global.titleTemplate.replace('%title%', title).replace('%site%', site.title);
  const doc = route.post ?? route.page ?? null;
  const pageSuffix = route.pagination?.page > 1 ? ` (halaman ${route.pagination.page})` : '';

  let title;
  let description;
  if (route.kind === 'home') {
    title = site.tagline ? `${site.title} | ${site.tagline}` : site.title;
    description = site.description;
  } else if (doc) {
    title = withTemplate(doc.seo.title || doc.title || 'Tanpa judul');
    description = doc.seo.description || doc.excerpt || truncate(doc.text, DESCRIPTION_LENGTH) || site.description;
  } else if (route.kind === 'archive') {
    title = withTemplate(route.archive.heading + pageSuffix);
    description = route.archive.description || `Kumpulan ${route.archive.heading} di ${site.title}.`;
  } else if (route.kind === 'custom') {
    title = withTemplate(route.custom.title);
    description = '';
  } else {
    title = withTemplate('Halaman tidak ditemukan');
    description = '';
  }

  // Preview dan situs yang belum siap tidak boleh terindeks. Halaman
  // tambahan dari plugin bisa meminta tidak diindeks.
  const allowed =
    mode === 'production' && global.indexSite && route.kind !== 'notFound' && route.custom?.index !== false;
  const robots = {
    index: allowed && (doc?.seo.robots.index ?? true),
    follow: allowed && (doc?.seo.robots.follow ?? true),
  };

  const imageSource = doc?.seo.og.image || doc?.cover?.src || site.ogImage;
  const image = media(imageSource);
  const meta = {
    imageSize: image ? env.imageSize?.(imageSource) ?? null : null,
    imageAlt: (imageSource === doc?.cover?.src && doc?.cover?.alt) || '',
    section: route.post?.categories[0]?.name ?? '',
    tags: route.post?.tags ?? [],
    title,
    description: truncate(description ?? '', 300),
    canonical: doc?.seo.canonical || abs(route.path),
    robots,
    image,
    type: route.kind === 'post' ? 'article' : 'website',
    ogTitle: doc?.seo.og.title || doc?.seo.title || doc?.title || title,
    ogDescription: doc?.seo.og.description || description,
    published: route.post?.date,
    modified: doc?.updatedAt,
    jsonLd: [],
  };

  if (route.kind === 'home' && abs('/')) {
    meta.jsonLd.push(
      compact({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: site.title,
        description: site.description,
        url: abs('/'),
        inLanguage: site.language,
        publisher: publisher(env),
      }),
    );
  }
  // Data terstruktur utama dokumen, sesuai content schema yang dipilih admin.
  // Butuh alamat absolut, jadi dilewati selama alamat situs belum diisi.
  meta.warnings = [];
  if (doc && abs('/')) {
    const { jsonLd, warning } = buildSchema({
      doc,
      meta,
      env,
      fallback: route.post ? route.post.postType.defaultSchema : 'WebPage',
      safe: route.post ? 'Article' : 'WebPage',
    });
    meta.jsonLd.push(jsonLd);
    if (warning) meta.warnings.push(warning);
  }
  meta.jsonLd.push(breadcrumbLd(route, env));
  meta.jsonLd = meta.jsonLd.filter(Boolean);
  return meta;
}

// JSON di dalam <script> tidak boleh memuat "<" mentah.
const ldScript = (data) => raw(`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`);

const tag = (attribute, name, content) => (content ? html`<meta ${raw(attribute)}="${name}" content="${content}">\n` : '');

export function renderHead(meta, env) {
  const { settings, url, media } = env;
  const { site, seo: global } = settings;
  // Halaman yang boleh diindeks juga mengizinkan pratinjau besar di hasil pencarian.
  const robots =
    `${meta.robots.index ? 'index' : 'noindex'},${meta.robots.follow ? 'follow' : 'nofollow'}` +
    (meta.robots.index ? ',max-image-preview:large,max-snippet:-1,max-video-preview:-1' : '');
  const article = meta.type === 'article';
  const icon = site.icon ? url(`/${site.icon}`) : '';

  return html`<title>${meta.title}</title>
${tag('name', 'description', meta.description)}${meta.canonical ? html`<link rel="canonical" href="${meta.canonical}">\n` : ''}${tag('name', 'robots', robots)}${tag('property', 'og:type', meta.type)}${tag('property', 'og:site_name', site.title)}${tag('property', 'og:title', meta.ogTitle)}${tag('property', 'og:description', meta.ogDescription)}${tag('property', 'og:url', meta.canonical)}${tag('property', 'og:image', meta.image)}${tag('property', 'og:image:width', meta.imageSize?.width)}${tag('property', 'og:image:height', meta.imageSize?.height)}${tag('property', 'og:image:alt', meta.image && meta.imageAlt)}${tag('property', 'og:locale', LOCALES[site.language])}${tag('property', 'article:published_time', article ? meta.published : '')}${tag('property', 'article:modified_time', article ? meta.modified : '')}${tag('property', 'article:section', article ? meta.section : '')}${article ? meta.tags.map((name) => tag('property', 'article:tag', name)) : ''}${tag('name', 'twitter:card', meta.image ? 'summary_large_image' : 'summary')}${tag('name', 'twitter:title', meta.ogTitle)}${tag('name', 'twitter:description', meta.ogDescription)}${tag('name', 'twitter:image', meta.image)}${tag('name', 'twitter:site', global.twitterHandle && `@${global.twitterHandle}`)}${tag('name', 'google-site-verification', global.verification.google)}${tag('name', 'msvalidate.01', global.verification.bing)}${icon ? html`<link rel="icon" href="${icon}">\n` : ''}<link rel="alternate" type="application/rss+xml" title="${site.title}" href="${url('/feed.xml')}">
${meta.jsonLd.map(ldScript)}`;
}
