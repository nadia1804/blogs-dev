const fs = require('fs');
const path = require('path');
const { escapeHtml } = require('./notion-engine');
const { getGithubIcon } = require('../src/icons/github-icons');

const ROOT_DIR = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const PREVIEW_DIR = path.join(ROOT_DIR, 'src', 'themes', 'fruition-capsule', 'preview');

function readJsonSafe(filePath, fallback = null) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {}
  return fallback;
}

function getAllFruits() {
  const fruitsDir = path.join(CONTENT_DIR, 'fruits');
  if (!fs.existsSync(fruitsDir)) return [];
  return fs.readdirSync(fruitsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => readJsonSafe(path.join(fruitsDir, f)))
    .filter(Boolean);
}

function getCollectionItems(collectionName) {
  const dir = path.join(CONTENT_DIR, collectionName);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => readJsonSafe(path.join(dir, f)))
    .filter(item => item && item.published !== false)
    .sort((a, b) => new Date(b.date || b.createdTime || 0) - new Date(a.date || a.createdTime || 0));
}

function getAllAuthors() {
  const dir = path.join(CONTENT_DIR, 'authors');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => readJsonSafe(path.join(dir, f)))
    .filter(item => item && (item.name || item.title))
    .map(item => ({
      id: item.id,
      name: item.name || item.title,
      slug: item.slug || 'deddy-hidayat',
      role: item.role || item.category || 'Writer',
      bio: item.bio || item.description || 'Penulis & Kontributor Ruang Baca',
      avatar: item.avatar || item.coverImage || '/assets/notion/author-deddy-hidayat.webp'
    }));
}

function getAllPostsAcrossAllFruits() {
  const collections = new Set();
  const fruits = getAllFruits();
  fruits.forEach(f => {
    const pt = f.postType || f.id;
    const coll = f.targetCollection || f.postType || f.id;
    if (pt && pt !== 'page' && pt !== 'authors' && pt !== 'settings') {
      collections.add(coll);
      collections.add(pt);
    }
  });

  if (fs.existsSync(CONTENT_DIR)) {
    fs.readdirSync(CONTENT_DIR).forEach(entry => {
      const p = path.join(CONTENT_DIR, entry);
      try {
        if (fs.statSync(p).isDirectory() && !['settings', 'authors', 'pages', 'fruits', 'node_modules'].includes(entry)) {
          collections.add(entry);
        }
      } catch (e) {}
    });
  }
  collections.add('read');

  const allPosts = [];
  const seenKeys = new Set();
  collections.forEach(coll => {
    const items = getCollectionItems(coll);
    items.forEach(item => {
      const pt = item.postType || coll;
      const key = `${pt}:${item.slug}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allPosts.push({
          ...item,
          postType: pt
        });
      }
    });
  });

  return allPosts.sort((a, b) => new Date(b.date || b.createdTime || 0) - new Date(a.date || a.createdTime || 0));
}

function postMatchesAuthor(post, author) {
  if (!post || !author) return false;
  const targetSlug = String(author.slug || '').trim().toLowerCase();
  const targetName = String(author.name || '').trim().toLowerCase();
  const targetId = String(author.id || '').trim().toLowerCase();

  const candidates = [];
  if (post.author) candidates.push(post.author);
  if (post.authors) {
    if (Array.isArray(post.authors)) candidates.push(...post.authors);
    else candidates.push(post.authors);
  }
  if (post.Author) candidates.push(post.Author);

  for (const a of candidates) {
    if (!a) continue;
    if (typeof a === 'string') {
      const str = a.trim().toLowerCase();
      if (str === targetSlug || str === targetName) return true;
    } else if (typeof a === 'object') {
      const aSlug = String(a.slug || '').trim().toLowerCase();
      const aName = String(a.name || a.title || '').trim().toLowerCase();
      const aId = String(a.id || '').trim().toLowerCase();
      if (targetId && aId && targetId === aId) return true;
      if (targetSlug && aSlug && targetSlug === aSlug) return true;
      if (targetName && aName && targetName === aName) return true;
    }
  }
  return false;
}

function buildCardHtml(post) {
  const postType = post.postType || 'read';
  const postUrl = `/${postType}/${post.slug}`;
  const category = post.category || 'General';
  const readingTime = post.readingTime || '2 min read';
  const excerpt = post.description || '';
  const dateStr = post.formattedDate || '';
  const postAuthor = post.author || (Array.isArray(post.authors) ? post.authors[0] : post.authors) || {};
  const authorName = postAuthor.name || postAuthor.title || 'Deddy Hidayat';
  const authorSlug = postAuthor.slug || 'deddy-hidayat';
  const authorAvatar = postAuthor.avatar || postAuthor.avatarUrl || '/assets/notion/author-deddy-hidayat.webp';
  const pastel = post.fallbackPastel || 'pastel-blossom';

  const coverHtml = post.coverImage
    ? `<div class="card-pastel-cover ${pastel}" style="overflow:hidden; position:relative;">
         <img src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.title)}" style="width:100%; height:100%; object-fit:cover; display:block;" loading="lazy" />
       </div>`
    : `<div class="card-pastel-cover ${pastel}"></div>`;

  return `
      <article class="capsule-card" data-category="${escapeHtml(category)}">
        <div class="card-cover-wrap">
          ${coverHtml}
        </div>
        <div class="card-content">
          <div class="card-meta-row">
            <span class="card-badge" data-post-type="${escapeHtml(postType)}" data-cat="${escapeHtml(category)}">${escapeHtml(category)}</span>
            <span class="card-reading-time">${escapeHtml(readingTime)}</span>
          </div>
          <h3 class="card-title">
            <a href="${escapeHtml(postUrl)}" class="card-title-link">${escapeHtml(post.title)}</a>
          </h3>
          <p class="card-excerpt">
            ${escapeHtml(excerpt)}
          </p>
          <div class="card-footer">
            <a href="/authors/${escapeHtml(authorSlug)}" class="card-author-link" title="Lihat profil ${escapeHtml(authorName)}">
              <img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(authorName)}" class="card-author-avatar-img" style="object-fit:cover; border-radius:50%;" />
              <span class="card-author-name">${escapeHtml(authorName)}</span>
            </a>
            <span class="card-date">${escapeHtml(dateStr)}</span>
          </div>
        </div>
      </article>`;
}

function getThemeConfig() {
  const themePath = path.join(ROOT_DIR, 'src', 'themes', 'fruition-capsule', 'theme.json');
  return readJsonSafe(themePath, {});
}

function buildCardGridWrapper(cardsHtml) {
  const themeConfig = getThemeConfig();
  const cardSettings = themeConfig.components?.cards || {};
  const mode = cardSettings.defaultMode || 'default';
  const cols = cardSettings.gridColumns || {};
  const sm = cols.sm || cols.mobile || 1;
  const md = cols.md || cols.tablet || 2;
  const lg = cols.lg || cols.desktop || 3;

  const editorial = cardSettings.editorialGrid || {};
  const tier1 = editorial.tier1 || 1;
  const tier2 = editorial.tier2 || 2;
  const tier3 = editorial.tier3 || 4;
  const pattern = editorial.pattern || `${tier1}-${tier2}-${tier3}`;
  const mobileCol = editorial.mobileColumns || editorial.mobile || 2;

  const editorialClass = mode === 'editorial' ? ' mode-editorial' : '';
  const editorialMobileClass = mode === 'editorial' && mobileCol === 2 ? ' editorial-mobile-2' : '';
  const patternAttr = mode === 'editorial' ? ` data-editorial-pattern="${escapeHtml(pattern)}" data-editorial-mobile="${mobileCol}"` : '';
  const inlineStyle = `--grid-cols-sm: ${sm}; --grid-cols-md: ${md}; --grid-cols-lg: ${lg}; --editorial-tier2: ${tier2}; --editorial-tier3: ${tier3};`;

  const colsSmClass = ` cols-sm-${sm}`;
  const dataColsSmAttr = ` data-cols-sm="${sm}"`;
  return `<div class="capsule-card-grid${editorialClass}${editorialMobileClass}${colsSmClass}" id="capsuleCardGrid"${patternAttr}${dataColsSmAttr} style="${inlineStyle}">\n    ${cardsHtml}\n  </div>`;
}

function getSiteSettings() {
  const settingsFile = path.join(CONTENT_DIR, 'settings', 'site.json');
  return readJsonSafe(settingsFile, {
    siteName: 'My Fruition Blog',
    siteIcon: 'fruit',
    faviconUrl: '',
    logoUrl: '',
    headerNav: [
      { id: 'nav-1', label: 'Home', url: '/theme', target: '_self', visible: true },
      { id: 'nav-2', label: 'Read', url: '/read', target: '_self', visible: true },
      { id: 'nav-3', label: 'Authors', url: '/authors', target: '_self', visible: true },
      { id: 'nav-4', label: 'About', url: '/about', target: '_self', visible: true }
    ],
    headerTools: {
      enableSearch: true,
      enableDarkMode: true,
      enableReadMode: true
    },
    footerNav: [
      { id: 'foot-1', label: 'sitemap.xml', url: '/sitemap.xml', target: '_self', visible: true },
      { id: 'foot-2', label: 'rss', url: '/rss', target: '_self', visible: true },
      { id: 'foot-3', label: 'robots.txt', url: '/robots.txt', target: '_self', visible: true },
      { id: 'foot-4', label: 'llms.txt', url: '/llms.txt', target: '_self', visible: true }
    ],
    footerCopyright: '{yyyy} Made with ❤️ by headless blogs'
  });
}

function isRouteActive(itemUrl, activeRoute) {
  if (!itemUrl || !activeRoute) return false;
  const u = String(itemUrl).trim().toLowerCase().replace(/\/+$/, '');
  const r = String(activeRoute).trim().toLowerCase();

  if (r === 'home') {
    return u === '' || u === '/' || u === '/theme' || u === '/home';
  }
  if (r === 'authors') {
    return u === '/authors' || u === '/author' || u.startsWith('/authors/');
  }
  if (r === 'page' || r === 'about') {
    return u === '/about' || u === '/page' || u === '/' + r;
  }
  if (r === 'read' || r === 'posts' || r === 'articles') {
    return u === '/read' || u === '/posts' || u === '/articles' || u === '/' + r;
  }
  return u === '/' + r;
}

function buildNavHtml(activeRoute = 'home') {
  const settings = getSiteSettings();
  const configuredNav = (settings && Array.isArray(settings.headerNav))
    ? settings.headerNav.filter(item => item && item.visible !== false && (item.label || item.url))
    : [];

  if (configuredNav.length > 0) {
    const itemsHtml = configuredNav.map(item => {
      const label = item.label || 'Link';
      const url = item.url || '#';
      const targetAttr = item.target === '_blank' ? ' target="_blank" rel="noopener"' : '';
      // Status aktif sepenuhnya ditentukan oleh admin, tidak otomatis
      const isAct = item.active ? ' class="active"' : '';
      const iconSvg = (item.icon && item.icon !== 'none') ? getGithubIcon(item.icon, { size: 14, className: 'nav-link-icon' }) + ' ' : '';
      return `<li class="capsule-nav-item"><a href="${escapeHtml(url)}"${targetAttr}${isAct}>${iconSvg}<span>${escapeHtml(label)}</span></a></li>`;
    }).join('\n        ');

    return `<ul class="capsule-nav" id="capsuleNavList">\n        ${itemsHtml}\n      </ul>`;
  }

  // Fallback to auto-detected Fruits if headerNav is empty
  const fruits = getAllFruits().filter(f => f.postType !== 'page' && f.postType !== 'authors');
  let postTypeLinks = '';
  if (fruits.length > 0) {
    fruits.forEach(f => {
      const pt = f.postType || f.id || 'read';
      const label = pt === 'read' ? 'Read' : (f.name || pt);
      const isAct = activeRoute === pt ? ' class="active"' : '';
      postTypeLinks += `<li class="capsule-nav-item"><a href="/${escapeHtml(pt)}"${isAct}>${escapeHtml(label)}</a></li>\n        `;
    });
  } else {
    postTypeLinks = `<li class="capsule-nav-item"><a href="/read"${activeRoute === 'read' ? ' class="active"' : ''}>Read</a></li>\n        `;
  }

  return `<ul class="capsule-nav" id="capsuleNavList">
        <li class="capsule-nav-item"><a href="/theme"${activeRoute === 'home' ? ' class="active"' : ''}>Home</a></li>
        ${postTypeLinks}<li class="capsule-nav-item"><a href="/authors"${activeRoute === 'authors' ? ' class="active"' : ''}>Authors</a></li>
        <li class="capsule-nav-item"><a href="/about"${activeRoute === 'page' || activeRoute === 'about' ? ' class="active"' : ''}>About</a></li>
      </ul>`;
}

function buildBrandHtml() {
  const settings = getSiteSettings();
  const siteName = settings.siteName || '';
  const siteIcon = (settings.siteIcon || 'fruit').trim();
  const logoUrl = settings.logoUrl || '';
  const showSiteName = Boolean(settings.showSiteName);

  if (logoUrl) {
    return `<a href="/theme" class="capsule-brand">
        <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(siteName || 'Logo')}" class="capsule-logo-img" />
        ${(showSiteName && siteName) ? `<span class="capsule-name">${escapeHtml(siteName)}</span>` : ''}
      </a>`;
  }

  // Render modular GitHub SVG icon for brand
  const isDefaultIcon = !siteIcon || siteIcon === '🍉' || siteIcon.toLowerCase() === 'fruit';
  const brandIconHtml = isDefaultIcon
    ? getGithubIcon('fruit', { size: 20, color: 'currentColor' })
    : (getGithubIcon(siteIcon) ? getGithubIcon(siteIcon, { size: 20 }) : `<span>${escapeHtml(siteIcon)}</span>`);

  return `<a href="/theme" class="capsule-brand">
        <div class="capsule-icon-wrap capsule-heartbeat" title="${escapeHtml(siteName || 'Home')}">
          ${brandIconHtml}
        </div>
        ${(showSiteName && siteName) ? `<span class="capsule-name">${escapeHtml(siteName)}</span>` : ''}
      </a>`;
}

function buildFooterNavHtml() {
  const settings = getSiteSettings();
  const configuredFooter = (settings && Array.isArray(settings.footerNav))
    ? settings.footerNav.filter(item => item && item.visible !== false && (item.label || item.url))
    : [];

  if (configuredFooter.length > 0) {
    const itemsHtml = configuredFooter.map(item => {
      const targetAttr = item.target === '_blank' ? ' target="_blank" rel="noopener"' : '';
      const iconSvg = (item.icon && item.icon !== 'none') ? getGithubIcon(item.icon, { size: 13, className: 'footer-link-icon' }) + ' ' : '';
      return `<li><a href="${escapeHtml(item.url)}"${targetAttr}>${iconSvg}<span>${escapeHtml(item.label)}</span></a></li>`;
    }).join('\n      ');
    return `<ul class="footer-nav">\n      ${itemsHtml}\n    </ul>`;
  }

  return `<ul class="footer-nav">
      <li><a href="/sitemap.xml">sitemap.xml</a></li>
      <li><a href="/rss">rss</a></li>
      <li><a href="/robots.txt">robots.txt</a></li>
      <li><a href="/llms.txt">llms.txt</a></li>
    </ul>`;
}

function injectCommonNavAndSearch(html, activeRoute, allPosts = []) {
  const settings = getSiteSettings();
  const themeConfig = getThemeConfig();

  // 0a. Inject Active Color Preset from theme.json into both <html> and <body>
  const activePresetName = themeConfig.defaultPreset || 'Blue Sky';
  const presetMap = {
    'light': 'light',
    'mono': 'mono',
    'blue sky': 'blue-sky',
    'blue-sky': 'blue-sky',
    'candy pop': 'candy-pop',
    'candy-pop': 'candy-pop'
  };
  const presetSlug = presetMap[String(activePresetName).toLowerCase().trim()]
    || (themeConfig.presets && themeConfig.presets[activePresetName] && themeConfig.presets[activePresetName].slug)
    || 'blue-sky';

  // Replace data-theme-preset on both <html> and <body>
  html = html.replace(/data-theme-preset=["'][^"']*["']/gi, `data-theme-preset="${escapeHtml(presetSlug)}"`);

  // Sync active state on preview controller bar buttons
  html = html.replace(/<button class="controller-btn(?:\s+active)?"\s+data-preset="([^"]+)"/g, (match, pSlug) => {
    const isAct = pSlug === presetSlug ? ' active' : '';
    return `<button class="controller-btn${isAct}" data-preset="${pSlug}"`;
  });

  // 0. Inject Favicon into <head>
  const faviconUrl = (settings.faviconUrl || '').trim();
  const faviconTag = faviconUrl
    ? `<link rel="icon" href="${escapeHtml(faviconUrl)}" />`
    : `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(getGithubIcon('fruit', { size: 32, color: '#0284c7' }))}" />`;
  if (/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*>/i.test(html)) {
    html = html.replace(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*>/i, faviconTag);
  } else {
    html = html.replace(/<\/head>/i, `  ${faviconTag}\n</head>`);
  }

  // 1. Replace Navigation List
  html = html.replace(/<ul class="capsule-nav" id="capsuleNavList">[\s\S]*?<\/ul>/, buildNavHtml(activeRoute));

  // 2. Replace Header Brand
  html = html.replace(/<a href="\/theme" class="capsule-brand">[\s\S]*?<\/a>/, buildBrandHtml());

  // 3. Header Tools (Instant Search, Dark Mode)
  if (settings.headerTools) {
    if (settings.headerTools.enableSearch === false) {
      html = html.replace(/<button class="capsule-tool-btn" id="btnCapsuleSearch"[\s\S]*?<\/button>/, '');
    }
    if (settings.headerTools.enableDarkMode === false) {
      html = html.replace(/<button class="capsule-tool-btn" id="btnCapsuleDark"[\s\S]*?<\/button>/, '');
    }
  }

  // 4. Footer Brand & Footer Nav & Footer Copyright (Modular SVG Heart)
  html = html.replace(/<ul class="footer-nav">[\s\S]*?<\/ul>/, buildFooterNavHtml());
  const currentYear = new Date().getFullYear();
  const copyrightPattern = settings.footerCopyright || '{yyyy} Made with {heart} by headless blogs';
  const copyrightText = copyrightPattern.replace(/\{yyyy\}/g, String(currentYear));
  
  const heartSvg = `<span class="heartbeat-pulse" aria-label="heartbeat">${getGithubIcon('heart', { size: 14, color: '#e11d48' })}</span>`;
  const formattedCopyright = escapeHtml(copyrightText)
    .replace(/\{heart\}|\{heartbeat\}|\{heart\s*beat\}|\{heart-beat\}|❤️|&#10084;&#65039;|&#x2764;&#xfe0f;/gi, heartSvg);

  html = html.replace(/<span class="footer-copyright">[\s\S]*?<\/span>/, `<span class="footer-copyright">${formattedCopyright}</span>`);

  // 5. Replace any remaining preview / template emojis with clean GitHub SVG icons
  html = html.replace(/<span>\s*🌙\s*Dark Mode<\/span>/g, `${getGithubIcon('moon', { size: 14 })} <span>Dark Mode</span>`);
  html = html.replace(/<span>\s*⚙️\s*Open Admin<\/span>/g, `${getGithubIcon('gear', { size: 14 })} <span>Open Admin</span>`);
  html = html.replace(/<span>\s*🖨️\s*Print<\/span>/g, `${getGithubIcon('printer', { size: 14 })} <span>Print</span>`);

  // 5. Replace Search Quick Tags with real categories & tags from Notion
  const tagSet = new Set();
  allPosts.forEach(p => {
    if (p.category) tagSet.add(p.category);
    (p.tags || []).forEach(t => tagSet.add(t));
  });
  const tagsList = Array.from(tagSet).slice(0, 6);
  if (tagsList.length > 0) {
    const quickTagsHtml = `<div class="capsule-search-quick-tags" id="searchQuickTags">
          <span class="quick-tag-label">Suggested:</span>
          ${tagsList.map(t => `<button type="button" class="quick-tag-pill" data-query="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('\n          ')}
        </div>`;
    html = html.replace(/<div class="capsule-search-quick-tags" id="searchQuickTags">[\s\S]*?<\/div>/, quickTagsHtml);
  }

  // 3. Replace indexedArticles fallback array with live Notion items
  const indexedJson = JSON.stringify(allPosts.map(p => ({
    title: p.title,
    url: p.postType === 'page' ? `/${p.slug}` : `/${p.postType || 'read'}/${p.slug}`,
    postType: p.postType || 'read',
    category: p.category || 'General',
    excerpt: p.description || ''
  })), null, 2);

  html = html.replace(/const indexedArticles = \[[\s\S]*?\];/, `const indexedArticles = ${indexedJson};`);
  html = html.replace(/6 articles indexed/g, `${allPosts.length} articles indexed`);

  return injectPlugins(html);
}

function injectPlugins(html) {
  try {
    const safelinkFile = path.join(__dirname, '..', 'content', 'plugins', 'safelink.json');
    if (fs.existsSync(safelinkFile)) {
      const safelink = JSON.parse(fs.readFileSync(safelinkFile, 'utf-8'));
      if (safelink.enabled) {
        const s = safelink.settings || {};
        const safelinkPath = s.safelinkPath || '/safelink';
        const urlParam = s.urlParam || 'url';
        const encryption = s.encryption || 'base64';
        const whitelist = Array.isArray(s.whitelist) ? s.whitelist : ['localhost', '127.0.0.1'];
        const safelinkScript = `
<!-- Plugin: Safelink External Link Protection Interceptor -->
<script>
  (function() {
    const safelinkPath = ${JSON.stringify(safelinkPath)};
    const urlParam = ${JSON.stringify(urlParam)};
    const encryption = ${JSON.stringify(encryption)};
    const whitelist = ${JSON.stringify(whitelist)};

    function initSafelinkRewriter() {
      const container = document.querySelector('.notion-article-body, .post-prose, #main-content, .capsule-single-page, .post-body-layout');
      if (!container) return;

      const links = container.querySelectorAll('a[href]');
      const currentHost = window.location.hostname.toLowerCase();

      links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        if (!href.startsWith('http://') && !href.startsWith('https://')) return;

        try {
          const urlObj = new URL(href);
          const linkHost = urlObj.hostname.toLowerCase();
          if (linkHost === currentHost) return;

          const isWhitelisted = whitelist.some(w => {
            const cleaned = String(w).trim().toLowerCase();
            return cleaned && (linkHost === cleaned || linkHost.endsWith('.' + cleaned));
          });
          if (isWhitelisted) return;

          let encodedUrl = href;
          if (encryption === 'base64') {
            try {
              encodedUrl = btoa(href);
            } catch (e) {
              encodedUrl = encodeURIComponent(href);
            }
          } else {
            encodedUrl = encodeURIComponent(href);
          }

          const safelinkUrl = \`\${safelinkPath}?\${urlParam}=\${encodedUrl}\`;
          link.setAttribute('href', safelinkUrl);
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
          link.setAttribute('data-safelink-protected', 'true');
        } catch (e) {}
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSafelinkRewriter);
    } else {
      initSafelinkRewriter();
    }
  })();
</script>`;
        if (/<\/body>/i.test(html)) {
          html = html.replace(/<\/body>/i, `${safelinkScript}\n</body>`);
        } else {
          html += safelinkScript;
        }
      }
    }
  } catch (e) {}
  return html;
}

// 1. RENDER INDEX (/theme or /)
function renderIndexPage() {
  let html = fs.readFileSync(path.join(PREVIEW_DIR, 'index.html'), 'utf-8');
  const fruits = getAllFruits();
  const indexFruits = fruits.filter(f => f.showOnIndex !== false && f.postType !== 'page' && f.postType !== 'authors');

  let indexPosts = [];
  if (indexFruits.length > 0) {
    indexFruits.forEach(f => {
      const coll = f.targetCollection || f.postType || f.id;
      const items = getCollectionItems(coll);
      indexPosts = indexPosts.concat(items);
    });
  } else {
    indexPosts = getCollectionItems('read');
  }

  indexPosts.sort((a, b) => new Date(b.date || b.createdTime || 0) - new Date(a.date || a.createdTime || 0));

  const cardsHtml = indexPosts.map(buildCardHtml).join('\n');

  html = html.replace(
    /<span class="capsule-version-pill">6 Articles<\/span>/,
    `<span class="capsule-version-pill">${indexPosts.length} Articles</span>`
  );

  html = html.replace(
    /<div class="capsule-card-grid" id="capsuleCardGrid">[\s\S]*?<\/section>/,
    `${buildCardGridWrapper(cardsHtml)}\n  </section>`
  );

  // Update category badge click to go to its isolated postType archive
  html = html.replace(
    /window\.location\.href = '\/posts';/g,
    `const pt = badge.getAttribute('data-post-type') || 'read'; const cat = badge.getAttribute('data-cat') || ''; window.location.href = '/' + pt + (cat ? '?category=' + encodeURIComponent(cat) : '');`
  );

  return injectCommonNavAndSearch(html, 'home', indexPosts);
}

// 2. RENDER ARCHIVE (/read, /posts, /[postType])
function renderArchivePage(postType = 'read') {
  let html = fs.readFileSync(path.join(PREVIEW_DIR, 'archive.html'), 'utf-8');
  const fruits = getAllFruits();
  const matchedFruit = fruits.find(f => f.postType === postType || f.id === postType || f.targetCollection === postType);
  const collectionName = matchedFruit ? (matchedFruit.targetCollection || matchedFruit.postType) : postType;

  let posts = getCollectionItems(collectionName);
  if (posts.length === 0 && postType === 'posts') {
    posts = getCollectionItems('read');
  }

  // Isolated categories strictly from this postType
  const categories = Array.from(new Set(posts.map(p => p.category).filter(Boolean)));
  const filterButtonsHtml = [
    `<button type="button" class="archive-filter-pill active" data-category="All">All Topics</button>`,
    ...categories.map(cat => `<button type="button" class="archive-filter-pill" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`)
  ].join('\n          ');

  const archiveTitle = matchedFruit ? matchedFruit.name : `${postType.charAt(0).toUpperCase() + postType.slice(1)} Archive`;
  const cardsHtml = posts.map(buildCardHtml).join('\n');

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(archiveTitle)} — Ruang Baca</title>`);
  html = html.replace(/<span id="gridTitleText">Archived Articles<\/span>/, `<span id="gridTitleText">${escapeHtml(archiveTitle)}</span>`);
  html = html.replace(/<span class="capsule-version-pill" id="postCountBadge">6 Posts<\/span>/, `<span class="capsule-version-pill" id="postCountBadge">${posts.length} Posts</span>`);
  html = html.replace(/Showing all 6 articles/, `Showing all ${posts.length} articles in /${escapeHtml(postType)}`);

  html = html.replace(
    /<div class="archive-filter-bar" id="categoryFilterBar">[\s\S]*?<\/div>/,
    `<div class="archive-filter-bar" id="categoryFilterBar">\n          ${filterButtonsHtml}\n        </div>`
  );

  html = html.replace(
    /<div class="capsule-card-grid" id="capsuleCardGrid">[\s\S]*?<\/main>/,
    `${buildCardGridWrapper(cardsHtml)}\n      </div>\n    </div>\n  </main>`
  );

  html = html.replace(/const totalPosts = 6;/g, `const totalPosts = ${posts.length};`);

  return injectCommonNavAndSearch(html, postType, posts);
}

// 3. RENDER SINGLE POST (/read/[slug], /post)
function renderSinglePostPage(postType = 'read', slug = '') {
  let html = fs.readFileSync(path.join(PREVIEW_DIR, 'single.html'), 'utf-8');
  let posts = getCollectionItems(postType);
  if (posts.length === 0) posts = getCollectionItems('read');

  let post = posts.find(p => p.slug.toLowerCase() === String(slug || '').toLowerCase());
  if (!post) post = posts[0];

  if (!post) {
    return injectCommonNavAndSearch(html, postType, []);
  }

  const currentIdx = posts.findIndex(p => p.slug === post.slug);
  const prevPost = posts[(currentIdx + 1) % posts.length] || post;
  const nextPost = posts[(currentIdx - 1 + posts.length) % posts.length] || post;

  const pt = post.postType || 'read';
  const postFullUrl = `http://localhost:4321/${pt}/${post.slug}`;
  const author = post.author || {
    name: 'Deddy Hidayat',
    slug: 'deddy-hidayat',
    role: 'Educator',
    bio: 'Cats lover',
    avatar: '/assets/notion/author-deddy-hidayat.webp'
  };

  // TOC HTML
  const tocItems = (post.toc && post.toc.length > 0)
    ? post.toc.map((t, idx) => `<li style="padding-left:${(t.level - 2) * 10}px"><a href="#${escapeHtml(t.id)}"${idx === 0 ? ' class="active"' : ''}>${escapeHtml(t.text)}</a></li>`).join('\n            ')
    : `<li><a href="#top" class="active">${escapeHtml(post.title)}</a></li>`;

  // Featured Media
  const featuredMediaHtml = post.coverImage
    ? `<div class="post-featured-media">
      <div class="card-pastel-cover ${post.fallbackPastel || 'pastel-blossom'}" style="height: 380px; position: relative; overflow: hidden; border-radius: 20px;">
        <img src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.title)}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
      </div>
    </div>`
    : `<div class="post-featured-media">
      <div class="card-pastel-cover ${post.fallbackPastel || 'pastel-blossom'}" style="height: 380px; position: relative;"></div>
    </div>`;

  // Tags Pills
  const tagsHtml = (post.tags && post.tags.length > 0)
    ? post.tags.map(t => `<span class="meta-item" style="color:var(--theme-primary); font-weight:600;">#${escapeHtml(t)}</span>`).join('\n          ')
    : '';

  // Main Replacement
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(post.title)} — Ruang Baca</title>`);

  const newMainHtml = `<main class="capsule-single-post" id="top">
    <!-- Breadcrumb -->
    <nav class="post-breadcrumb" aria-label="Breadcrumb">
      <a href="/theme">Home</a>
      <span>/</span>
      <a href="/${escapeHtml(pt)}">${escapeHtml(pt)}</a>
      <span>/</span>
      <span style="color: var(--theme-primary); font-weight: 600;">${escapeHtml(post.category || 'General')}</span>
    </nav>

    <!-- Post Header -->
    <header class="post-header-capsule">
      <h1 class="post-title">${escapeHtml(post.title)}</h1>

      ${post.description ? `<p class="post-lead">${escapeHtml(post.description)}</p>` : ''}

      <!-- Meta Bar with Capsule Pill & Print Button -->
      <div class="post-meta-bar">
        <div class="post-meta-capsule" role="group" aria-label="Article metadata">
          <span class="meta-item">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Published ${escapeHtml(post.formattedDate || '')}
          </span>
          <span class="meta-item">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            ${escapeHtml(post.readingTime || '2 min read')}
          </span>
          ${tagsHtml}
        </div>

        <button type="button" class="btn-print-article" onclick="window.print()" title="Print only article content">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          <span>Print Article</span>
        </button>
      </div>
    </header>

    ${featuredMediaHtml}

    <!-- Post Body Grid: Main Content + Sticky Sidebar -->
    <div class="post-body-layout">
      <!-- Article Prose -->
      <article class="post-prose">
        <!-- Table of Contents (Mobile & Tablet Viewport: Inlined before article content) -->
        <div class="mobile-toc-box">
          <div class="sidebar-widget-title" style="margin-bottom: 12px;">Table of Contents</div>
          <ul class="toc-list">
            ${tocItems}
          </ul>
        </div>

        ${post.contentHtml || `<p>${escapeHtml(post.description || '')}</p>`}

        <!-- Social Share Bar (Below Article Content) -->
        <div class="post-social-share">
          <div class="share-label">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <span>Share this article:</span>
          </div>
          <div class="share-buttons">
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(postFullUrl)}" target="_blank" rel="noopener" class="btn-share" title="Share on X / Twitter">
              <span>X</span>
            </a>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postFullUrl)}" target="_blank" rel="noopener" class="btn-share" title="Share on Facebook">
              <span>Facebook</span>
            </a>
            <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(post.title + ' ' + postFullUrl)}" target="_blank" rel="noopener" class="btn-share" title="Share on WhatsApp">
              <span>WhatsApp</span>
            </a>
            <a href="https://t.me/share/url?url=${encodeURIComponent(postFullUrl)}&text=${encodeURIComponent(post.title)}" target="_blank" rel="noopener" class="btn-share" title="Share on Telegram">
              <span>Telegram</span>
            </a>
          </div>
        </div>

        <!-- Authors Box (Mobile & Tablet Viewport: Inlined below article content) -->
        <div class="mobile-authors-box">
          <div class="sidebar-widget-title">Authors</div>
          <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 12px;">
            <img src="${escapeHtml(author.avatar)}" alt="${escapeHtml(author.name)}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;" />
            <div>
              <div style="font-weight: 700; font-size: 1rem; color: var(--theme-text);">${escapeHtml(author.name)}</div>
              <div style="font-size: 0.82rem; color: var(--theme-text-muted);">${escapeHtml(author.role)}</div>
            </div>
          </div>
          <p style="font-size: 0.9rem; color: var(--theme-text-muted); line-height: 1.55;">
            ${escapeHtml(author.bio)}
          </p>
        </div>
      </article>

      <!-- Sticky Sidebar (Desktop & Tablet) -->
      <aside class="post-sidebar">
        <!-- Table of Contents -->
        <div class="sidebar-widget post-toc-card post-toc capsule-toc">
          <div class="sidebar-widget-title">Table of Contents</div>
          <ul class="toc-list">
            ${tocItems}
          </ul>
        </div>

        <!-- Authors Widget -->
        <div class="sidebar-widget post-author-sidebar author-sidebar-card post-author-box">
          <div class="sidebar-widget-title">Authors</div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <img src="${escapeHtml(author.avatar)}" alt="${escapeHtml(author.name)}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;" />
            <div>
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--theme-text);">${escapeHtml(author.name)}</div>
              <div style="font-size: 0.8rem; color: var(--theme-text-muted);">${escapeHtml(author.role)}</div>
            </div>
          </div>
          <p style="font-size: 0.86rem; color: var(--theme-text-muted); line-height: 1.5; margin-bottom: 16px;">
            ${escapeHtml(author.bio)}
          </p>
          <a href="/authors/${escapeHtml(author.slug)}" class="card-link-arrow" style="font-size: 0.85rem;">
            <span>View Full Profile</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
        </div>
      </aside>
    </div>

    <!-- Adjacent Posts Navigation -->
    <nav class="post-nav-capsule" aria-label="Adjacent Articles">
      <a href="/${escapeHtml(pt)}/${escapeHtml(prevPost.slug)}" class="post-nav-card">
        <div class="post-nav-dir">&larr; Previous Article</div>
        <div class="post-nav-card-title">${escapeHtml(prevPost.title)}</div>
      </a>
      <a href="/${escapeHtml(pt)}/${escapeHtml(nextPost.slug)}" class="post-nav-card" style="text-align: right;">
        <div class="post-nav-dir">Next Article &rarr;</div>
        <div class="post-nav-card-title">${escapeHtml(nextPost.title)}</div>
      </a>
    </nav>
  </main>`;

  html = html.replace(/<main class="capsule-single-post">[\s\S]*?<\/main>/, newMainHtml);

  return injectCommonNavAndSearch(html, pt, posts);
}

// 4. RENDER AUTHORS DIRECTORY (/authors)
function renderAuthorsPage() {
  let html = fs.readFileSync(path.join(PREVIEW_DIR, 'authors.html'), 'utf-8');
  const authors = getAllAuthors();
  const allPosts = getAllPostsAcrossAllFruits();

  if (authors.length > 0) {
    const authorCardsHtml = authors.map(a => {
      const count = allPosts.filter(p => postMatchesAuthor(p, a)).length;
      return `
        <a href="/authors/${escapeHtml(a.slug)}" class="author-card">
          <div class="author-card-avatar-wrap">
            <img src="${escapeHtml(a.avatar)}" alt="${escapeHtml(a.name)}" class="author-card-avatar" style="object-fit:cover; border-radius:50%;" />
          </div>
          <h3 class="author-card-name">${escapeHtml(a.name)}</h3>
          <span class="author-card-role">${escapeHtml(a.role)}</span>
          <p class="author-card-bio">
            ${escapeHtml(a.bio)}
          </p>
          <div class="author-card-footer">
            <span class="author-card-articles-count">${count} Article${count !== 1 ? 's' : ''} Published</span>
            <span class="author-card-link-btn">
              <span>View Articles</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </span>
          </div>
        </a>`;
    }).join('\n');

    html = html.replace(/<span class="capsule-version-pill">5 Authors<\/span>/, `<span class="capsule-version-pill">${authors.length} Author${authors.length > 1 ? 's' : ''}</span>`);
    html = html.replace(/<div class="capsule-authors-grid">[\s\S]*?<\/main>/, `<div class="capsule-authors-grid">${authorCardsHtml}\n      </div>\n    </div>\n  </main>`);
  }

  return injectCommonNavAndSearch(html, 'authors', allPosts);
}

// 5. RENDER SINGLE AUTHOR (/authors/[slug] or /author)
function renderSingleAuthorPage(authorSlug = '') {
  let html = fs.readFileSync(path.join(PREVIEW_DIR, 'author.html'), 'utf-8');
  const authors = getAllAuthors();
  const cleanParam = decodeURIComponent(String(authorSlug || '')).trim().toLowerCase();
  const slugifiedParam = cleanParam.replace(/\s+/g, '-');

  const author = authors.find(a =>
    a.slug.toLowerCase() === cleanParam ||
    a.slug.toLowerCase() === slugifiedParam ||
    a.name.toLowerCase() === cleanParam
  ) || authors[0] || {
    name: 'Deddy Hidayat',
    slug: 'deddy-hidayat',
    role: 'Educator',
    bio: 'Cats lover',
    avatar: '/assets/notion/author-deddy-hidayat.webp'
  };

  const allPosts = getAllPostsAcrossAllFruits();
  const posts = allPosts.filter(p => postMatchesAuthor(p, author));
  const displayPosts = posts.length > 0 ? posts : allPosts;
  const cardsHtml = displayPosts.map(buildCardHtml).join('\n');

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(author.name)} — Author Profile</title>`);

  const newMain = `<main class="capsule-archive">
    <div class="card-grid-container" style="padding-top: 40px;">
      <nav class="post-breadcrumb" aria-label="Breadcrumb" style="margin-bottom: 24px;">
        <a href="/theme">Home</a>
        <span>/</span>
        <a href="/authors">Authors</a>
        <span>/</span>
        <span id="authorBreadcrumbName" style="color: var(--theme-primary); font-weight: 600;">${escapeHtml(author.name)}</span>
      </nav>

      <header class="author-hero-capsule">
        <div class="author-hero-avatar-wrap">
          <img id="authorHeroAvatar" src="${escapeHtml(author.avatar)}" alt="${escapeHtml(author.name)}" class="author-hero-avatar" style="object-fit:cover; border-radius:50%;" />
        </div>
        <div class="author-hero-content">
          <h1 id="authorHeroName" class="author-hero-name">${escapeHtml(author.name)}</h1>
          <div class="author-hero-badges" style="margin-bottom: 12px;">
            <span id="authorHeroRole" class="author-card-role" style="margin-bottom: 0;">${escapeHtml(author.role)}</span>
            <span id="authorHeroCount" class="capsule-version-pill">${posts.length} Published Articles</span>
          </div>
          <p id="authorHeroBio" class="author-hero-bio">
            ${escapeHtml(author.bio)}
          </p>
        </div>
      </header>

      <div class="card-grid-header">
        <div class="archive-heading-group">
          <h2 class="grid-section-title">
            <span>Published Articles</span>
            <span id="authorArticlesCountBadge" class="capsule-version-pill">${posts.length} Posts</span>
          </h2>
          <div id="authorArticlesMetaDesc" class="archive-meta-count">
            Articles authored and published by ${escapeHtml(author.name)}
          </div>
        </div>
      </div>

      ${buildCardGridWrapper(cardsHtml)}
    </div>
  </main>`;

  html = html.replace(/<main class="capsule-archive">[\s\S]*?<\/main>/, newMain);
  // Remove client-side hardcoded author override script if present
  html = html.replace(/const authorDatabase = \{[\s\S]*?renderAuthorDynamic\(\);/m, '');

  return injectCommonNavAndSearch(html, 'authors', posts);
}

// 6. RENDER STATIC PAGE (/[slug] or /about or /page)
function renderStaticPage(slug = 'about') {
  let html = fs.readFileSync(path.join(PREVIEW_DIR, 'page.html'), 'utf-8');
  const pages = getCollectionItems('pages');
  const pageItem = pages.find(p => p.slug.toLowerCase() === String(slug || '').toLowerCase()) || pages[0];
  const readPosts = getCollectionItems('read');

  if (pageItem) {
    const tocItems = (pageItem.toc && pageItem.toc.length > 0)
      ? pageItem.toc.map((t, idx) => `<li><a href="#${escapeHtml(t.id)}"${idx === 0 ? ' class="active"' : ''}>${escapeHtml(t.text)}</a></li>`).join('\n            ')
      : `<li><a href="#top" class="active">${escapeHtml(pageItem.title)}</a></li>`;

    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(pageItem.title)} — Ruang Baca</title>`);

    const newMain = `<main class="capsule-single-page" id="top">
    <nav class="post-breadcrumb" aria-label="Breadcrumb">
      <a href="/theme">Home</a>
      <span>/</span>
      <span style="color: var(--theme-primary); font-weight: 600;">${escapeHtml(pageItem.title)}</span>
    </nav>

    <header class="post-header-capsule">
      <h1 class="post-title" style="text-transform: capitalize;">${escapeHtml(pageItem.title)}</h1>
      ${pageItem.description ? `<p class="post-lead">${escapeHtml(pageItem.description)}</p>` : ''}
    </header>

    <div class="post-body-layout">
      <div class="post-prose">
        ${pageItem.contentHtml || `<p>${escapeHtml(pageItem.description || '')}</p>`}
      </div>

      <aside class="post-sidebar">
        <div class="sidebar-widget post-toc-card post-toc capsule-toc">
          <div class="sidebar-widget-title">On This Page</div>
          <ul class="toc-list">
            ${tocItems}
          </ul>
        </div>
      </aside>
    </div>
  </main>`;

    html = html.replace(/<main class="capsule-single-page">[\s\S]*?<\/main>/, newMain);
  }

  return injectCommonNavAndSearch(html, 'page', readPosts);
}

module.exports = {
  renderIndexPage,
  renderArchivePage,
  renderSinglePostPage,
  renderAuthorsPage,
  renderSingleAuthorPage,
  renderStaticPage,
  getAllFruits,
  getCollectionItems,
  getAllAuthors,
  getAllPostsAcrossAllFruits,
  getSiteSettings
};
