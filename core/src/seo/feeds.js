import { escapeHtml } from '../util/html.js';

// Berkas pendukung SEO: sitemap.xml, robots.txt, dan feed RSS.
// Semuanya butuh alamat absolut; tanpa alamat situs, sitemap dan feed dilewati.

const FEED_LIMIT = 20;
const xml = escapeHtml;

// Hanya halaman yang boleh diindeks yang masuk sitemap.
export function sitemap(entries) {
  const urls = entries
    .map(
      ({ loc, lastmod, image }) =>
        `  <url><loc>${xml(loc)}</loc>${lastmod ? `<lastmod>${xml(lastmod.slice(0, 10))}</lastmod>` : ''}${
          image ? `<image:image><image:loc>${xml(image)}</image:loc></image:image>` : ''
        }</url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`;
}

export function robotsTxt({ allow, sitemapUrl }) {
  if (!allow) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\n${sitemapUrl ? `\nSitemap: ${sitemapUrl}\n` : ''}`;
}

export function rss({ site, abs, posts, descriptionOf }) {
  const items = posts
    .slice(0, FEED_LIMIT)
    .map(
      (post) => `    <item>
      <title>${xml(post.title)}</title>
      <link>${xml(abs(post.path))}</link>
      <guid isPermaLink="true">${xml(abs(post.path))}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${xml(descriptionOf(post))}</description>
    </item>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(site.title)}</title>
    <link>${xml(abs('/'))}</link>
    <description>${xml(site.description || site.tagline)}</description>
    <language>${xml(site.language)}</language>
    <atom:link href="${xml(abs('/feed.xml'))}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}
