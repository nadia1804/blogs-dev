const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const {
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
} = require('./theme-renderer');
const { escapeHtml } = require('./notion-engine');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const BACKUP_DIR = path.join(ROOT_DIR, 'backup');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const THEME_DIR = path.join(ROOT_DIR, 'src', 'themes', 'fruition-capsule');
const ASSETS_DIR = path.join(THEME_DIR, 'assets');
const CAPSULE_CSS = path.join(THEME_DIR, 'styles', 'capsule.css');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeDistFile(relPath, content) {
  const fullPath = path.join(DIST_DIR, relPath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, content, 'utf-8');
  return relPath.replace(/\\/g, '/');
}

function copyDirRecursive(srcDir, destDir, copiedList = [], baseRel = '') {
  if (!fs.existsSync(srcDir)) return copiedList;
  ensureDir(destDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    const relPath = baseRel ? `${baseRel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, copiedList, relPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
      copiedList.push(relPath);
    }
  }
  return copiedList;
}

function getDirSizeAndCount(dirPath) {
  let sizeBytes = 0;
  let fileCount = 0;
  if (!fs.existsSync(dirPath)) return { sizeBytes, fileCount };
  const stack = [dirPath];
  while (stack.length > 0) {
    const curr = stack.pop();
    const entries = fs.readdirSync(curr, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(curr, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        try {
          const st = fs.statSync(full);
          sizeBytes += st.size;
          fileCount += 1;
        } catch (e) {}
      }
    }
  }
  return { sizeBytes, fileCount };
}

function generateDynamicFeeds() {
  const settings = getSiteSettings();
  const baseUrl = (settings.siteUrl || 'http://localhost:4321').replace(/\/+$/, '');
  const siteName = settings.siteName || 'My Fruition Blog';
  const siteDesc = settings.siteDescription || 'A fast, beautiful static blog powered by Notion & Astro SSG';
  const allPosts = getAllPostsAcrossAllFruits();
  const authors = getAllAuthors();
  const pages = getCollectionItems('pages');
  const fruits = getAllFruits().filter(f => f.postType !== 'page' && f.postType !== 'authors');

  const urls = new Set([
    `${baseUrl}/`,
    `${baseUrl}/authors`
  ]);
  fruits.forEach(f => {
    const pt = f.postType || f.id || 'read';
    urls.add(`${baseUrl}/${pt}`);
  });
  authors.forEach(a => {
    urls.add(`${baseUrl}/authors/${a.slug}`);
  });
  pages.forEach(p => {
    urls.add(`${baseUrl}/${p.slug}`);
  });
  allPosts.forEach(p => {
    const pt = p.postType || 'read';
    urls.add(`${baseUrl}/${pt}/${p.slug}`);
  });

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from(urls).map(u => `  <url><loc>${escapeHtml(u)}</loc></url>`).join('\n')}
</urlset>`;

  const rssItemsXml = allPosts.slice(0, 25).map(p => {
    const pt = p.postType || 'read';
    const link = `${baseUrl}/${pt}/${p.slug}`;
    const pubDate = p.date ? new Date(p.date).toUTCString() : new Date().toUTCString();
    return `    <item>
      <title>${escapeHtml(p.title || p.slug)}</title>
      <link>${escapeHtml(link)}</link>
      <guid>${escapeHtml(link)}</guid>
      <pubDate>${escapeHtml(pubDate)}</pubDate>
      <description>${escapeHtml(p.description || '')}</description>
    </item>`;
  }).join('\n');

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeHtml(siteName)}</title>
    <link>${escapeHtml(baseUrl)}/</link>
    <description>${escapeHtml(siteDesc)}</description>
${rssItemsXml}
  </channel>
</rss>`;

  const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`;

  const llmsTxt = `# ${siteName}
> ${siteDesc}

## Archives
${fruits.map(f => `- [${f.name || f.id}](/${f.postType || f.id})`).join('\n')}
- [Authors Directory](/authors)

## Latest Articles
${allPosts.slice(0, 20).map(p => `- [${p.title}](/${p.postType || 'read'}/${p.slug}): ${p.description || ''}`).join('\n')}
`;

  const feedJson = JSON.stringify({
    version: 'https://jsonfeed.org/version/1.1',
    title: siteName,
    home_page_url: `${baseUrl}/`,
    feed_url: `${baseUrl}/feed.json`,
    description: siteDesc,
    items: allPosts.slice(0, 25).map(p => ({
      id: `${p.postType || 'read'}/${p.slug}`,
      url: `${baseUrl}/${p.postType || 'read'}/${p.slug}`,
      title: p.title,
      summary: p.description || '',
      date_published: p.date || p.createdTime || new Date().toISOString()
    }))
  }, null, 2);

  return { sitemapXml, rssXml, robotsTxt, llmsTxt, feedJson };
}

/**
 * Menghasilkan pratinjau teks isi header untuk platform yang dipilih:
 * 'vercel' | 'netlify' | 'github' | 'firebase'
 */
function getPlatformHeaderPreview(targetPlatform, settings = null) {
  if (!settings) {
    try { settings = getSiteSettings(); } catch (e) { settings = {}; }
  }
  let platform = String(targetPlatform || (settings && settings.publishPlatform) || 'vercel').toLowerCase().trim();
  if (platform === 'gh') platform = 'github';

  if (platform === 'vercel') {
    const vercelConfig = {
      "$schema": "https://openapi.vercel.sh/vercel.json",
      "cleanUrls": true,
      "trailingSlash": false,
      "headers": [
        {
          "source": "/(.*)",
          "headers": [
            { "key": "X-Content-Type-Options", "value": "nosniff" },
            { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
            { "key": "X-XSS-Protection", "value": "1; mode=block" },
            { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
            { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
            { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" }
          ]
        },
        {
          "source": "/_astro/(.*)",
          "headers": [
            { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
          ]
        },
        {
          "source": "/assets/(.*)",
          "headers": [
            { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
          ]
        },
        {
          "source": "/(.*)\\.(css|js|woff2|webp|png|jpg|jpeg|svg|ico)",
          "headers": [
            { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
          ]
        }
      ]
    };
    return {
      platform: 'vercel',
      filename: 'vercel.json',
      content: JSON.stringify(vercelConfig, null, 2)
    };
  }

  if (platform === 'netlify') {
    const netlifyHeaders = [
      '# Netlify Security & Performance Headers Generated by Blogs-Dev',
      '/*',
      '  X-Content-Type-Options: nosniff',
      '  X-Frame-Options: SAMEORIGIN',
      '  X-XSS-Protection: 1; mode=block',
      '  Referrer-Policy: strict-origin-when-cross-origin',
      '  Permissions-Policy: camera=(), microphone=(), geolocation=()',
      '  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
      '',
      '/_astro/*',
      '  Cache-Control: public, max-age=31536000, immutable',
      '',
      '/assets/*',
      '  Cache-Control: public, max-age=31536000, immutable',
      '',
      '/*.css',
      '  Cache-Control: public, max-age=31536000, immutable',
      '',
      '/*.js',
      '  Cache-Control: public, max-age=31536000, immutable',
      ''
    ].join('\n');
    return {
      platform: 'netlify',
      filename: '_headers',
      content: netlifyHeaders
    };
  }

  if (platform === 'github') {
    const siteUrl = (settings && settings.siteUrl) ? settings.siteUrl.trim() : '';
    let customDomain = '';
    if (siteUrl && !siteUrl.includes('localhost') && !siteUrl.includes('.github.io')) {
      try { customDomain = new URL(siteUrl).hostname; } catch (e) { customDomain = siteUrl; }
    }
    const ghNotes = [
      '# GitHub Pages Configuration (.nojekyll & CNAME)',
      '# 1. .nojekyll (bypasses Jekyll processing so _astro assets load correctly)',
      '# 2. CNAME domain kanonis (jika menggunakan custom domain): ' + (customDomain || '(default github.io subpath)'),
      '',
      'Security & Headers on GitHub Pages are served with default GitHub TLS & fast CDN.',
      'Headers created: public/.nojekyll, dist/.nojekyll' + (customDomain ? ', CNAME' : '')
    ].join('\n');
    return {
      platform: 'github',
      filename: '.nojekyll (GitHub Pages)',
      content: ghNotes,
      customDomain
    };
  }

  if (platform === 'firebase') {
    const firebaseConfig = {
      "hosting": {
        "public": "dist",
        "cleanUrls": true,
        "trailingSlash": false,
        "ignore": [
          "firebase.json",
          "**/.*",
          "**/node_modules/**"
        ],
        "headers": [
          {
            "source": "**",
            "headers": [
              { "key": "X-Content-Type-Options", "value": "nosniff" },
              { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
              { "key": "X-XSS-Protection", "value": "1; mode=block" },
              { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
              { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
              { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" }
            ]
          },
          {
            "source": "**/*.@(css|js|woff2|webp|png|jpg|jpeg|svg|ico)",
            "headers": [
              { "key": "Cache-Control", "value": "max-age=31536000" }
            ]
          }
        ]
      }
    };
    return {
      platform: 'firebase',
      filename: 'firebase.json',
      content: JSON.stringify(firebaseConfig, null, 2)
    };
  }

  return { platform, filename: 'unknown', content: '' };
}

/**
 * Menghasilkan dan menulis file konfigurasi header sesuai target platform hosting:
 * - vercel -> vercel.json (root & dist/)
 * - netlify -> _headers (public/ & dist/)
 * - github -> .nojekyll (public/ & dist/), CNAME (jika ada)
 * - firebase -> firebase.json (root & dist/)
 */
function generatePlatformHeaders(targetPlatform, settings = null) {
  if (!settings) {
    try { settings = getSiteSettings(); } catch (e) { settings = {}; }
  }
  const preview = getPlatformHeaderPreview(targetPlatform, settings);
  const platform = preview.platform;
  const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
  ensureDir(PUBLIC_DIR);
  const createdFiles = [];

  if (platform === 'vercel') {
    // 1. Root vercel.json
    fs.writeFileSync(path.join(ROOT_DIR, 'vercel.json'), preview.content, 'utf-8');
    createdFiles.push('vercel.json');

    // 2. Dist vercel.json jika dist ada
    if (fs.existsSync(DIST_DIR)) {
      fs.writeFileSync(path.join(DIST_DIR, 'vercel.json'), preview.content, 'utf-8');
      createdFiles.push('dist/vercel.json');
    }
  } else if (platform === 'netlify') {
    // 1. public/_headers
    fs.writeFileSync(path.join(PUBLIC_DIR, '_headers'), preview.content, 'utf-8');
    createdFiles.push('public/_headers');

    // 2. dist/_headers jika dist ada
    if (fs.existsSync(DIST_DIR)) {
      fs.writeFileSync(path.join(DIST_DIR, '_headers'), preview.content, 'utf-8');
      createdFiles.push('dist/_headers');
    }
  } else if (platform === 'github') {
    // 1. .nojekyll di public/ dan dist/
    fs.writeFileSync(path.join(PUBLIC_DIR, '.nojekyll'), '', 'utf-8');
    createdFiles.push('public/.nojekyll');

    if (fs.existsSync(DIST_DIR)) {
      fs.writeFileSync(path.join(DIST_DIR, '.nojekyll'), '', 'utf-8');
      createdFiles.push('dist/.nojekyll');
    }

    if (preview.customDomain) {
      fs.writeFileSync(path.join(PUBLIC_DIR, 'CNAME'), preview.customDomain, 'utf-8');
      createdFiles.push('public/CNAME');
      if (fs.existsSync(DIST_DIR)) {
        fs.writeFileSync(path.join(DIST_DIR, 'CNAME'), preview.customDomain, 'utf-8');
        createdFiles.push('dist/CNAME');
      }
    }
  } else if (platform === 'firebase') {
    // 1. Root firebase.json
    fs.writeFileSync(path.join(ROOT_DIR, 'firebase.json'), preview.content, 'utf-8');
    createdFiles.push('firebase.json');

    // 2. Dist firebase.json jika dist ada
    if (fs.existsSync(DIST_DIR)) {
      fs.writeFileSync(path.join(DIST_DIR, 'firebase.json'), preview.content, 'utf-8');
      createdFiles.push('dist/firebase.json');
    }
  }

  return {
    platform,
    filename: preview.filename,
    content: preview.content,
    createdFiles
  };
}

/**
 * Mode 1: Build seluruh halaman statis dan aset ke folder dist/ via Official Astro SSG
 */
function buildStaticSiteToDist() {
  const startTime = Date.now();
  const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
  ensureDir(PUBLIC_DIR);
  ensureDir(path.join(PUBLIC_DIR, 'assets'));

  const siteSettings = getSiteSettings();

  // 1. Sync public static assets (capsule.css, images, logo, favicon) & Pre-generate Platform Headers
  if (fs.existsSync(CAPSULE_CSS)) {
    fs.copyFileSync(CAPSULE_CSS, path.join(PUBLIC_DIR, 'capsule.css'));
  }
  if (fs.existsSync(ASSETS_DIR)) {
    copyDirRecursive(ASSETS_DIR, path.join(PUBLIC_DIR, 'assets'), [], 'assets');
    const rootAssetFiles = fs.readdirSync(ASSETS_DIR);
    rootAssetFiles.forEach(f => {
      if (/^(logo|favicon)\./i.test(f)) {
        const srcFile = path.join(ASSETS_DIR, f);
        if (fs.statSync(srcFile).isFile()) {
          fs.copyFileSync(srcFile, path.join(PUBLIC_DIR, f));
        }
      }
    });
  }

  // Pre-generate platform headers ke public/ sebelum Astro build
  const platformHeaderResult = generatePlatformHeaders(siteSettings.publishPlatform || 'vercel', siteSettings);

  // 2. Execute Official Astro Build CLI
  try {
    console.log('[Astro Build] Starting official Astro SSG compilation...');
    execSync('npx astro build', { cwd: ROOT_DIR, stdio: 'pipe' });
    console.log('[Astro Build] Astro SSG compilation succeeded!');
  } catch (err) {
    console.error('[Astro Build Error]:', err.stdout ? err.stdout.toString() : err.message);
    throw new Error('Astro build failed: ' + (err.stderr ? err.stderr.toString() : err.message));
  }

  // 3. Generate Technical Feeds (sitemap.xml, rss.xml, robots.txt, llms.txt, feed.json)
  const feeds = generateDynamicFeeds();
  writeDistFile('sitemap.xml', feeds.sitemapXml);
  writeDistFile('rss.xml', feeds.rssXml);
  writeDistFile('rss/index.html', feeds.rssXml);
  writeDistFile('robots.txt', feeds.robotsTxt);
  writeDistFile('llms.txt', feeds.llmsTxt);
  writeDistFile('feed.json', feeds.feedJson);

  // 4. Create /theme alias if index exists
  if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    writeDistFile('theme/index.html', fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8'));
  }

  // 5. Post-generate platform headers ke dist/
  generatePlatformHeaders(siteSettings.publishPlatform || 'vercel', siteSettings);

  const durationMs = Date.now() - startTime;
  const { sizeBytes, fileCount } = getDirSizeAndCount(DIST_DIR);

  return {
    success: true,
    engine: 'Astro v7 (Official SSG)',
    distPath: DIST_DIR,
    relativeDistPath: 'dist/',
    totalFiles: fileCount,
    sizeBytes,
    durationMs,
    timestamp: new Date().toISOString()
  };
}

/**
 * Mode 2: Publish via Git (Build ke dist/ + Push ke GitHub Repository via REST API atau Git CLI)
 */
async function publishViaGit(envConfig = {}) {
  // Langkah 1: Selalu build ke dist/ terlebih dahulu
  const buildResult = buildStaticSiteToDist();
  const settings = getSiteSettings();
  const branch = (settings.gitopsBranch || 'main').trim();
  const token = (envConfig.GITHUB_TOKEN || '').trim();
  const owner = (envConfig.GITHUB_REPO_OWNER || '').trim();
  const repo = (envConfig.GITHUB_REPO_NAME || 'blogs-dev').trim();

  // Jika GITHUB_TOKEN dan GITHUB_REPO_OWNER tersedia, gunakan GitHub Git Data REST API (tanpa bergantung pada git binary lokal)
  if (token && owner && repo) {
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Fruition-Mini-CMS',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      };

      // 1. Ambil SHA commit terakhir di branch target
      const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`, { headers });
      if (!refRes.ok) {
        const errJson = await refRes.json().catch(() => ({}));
        return {
          success: false,
          buildResult,
          message: `Build dist/ selesai (${buildResult.totalFiles} file), namun gagal mengakses branch "${branch}" di GitHub (${owner}/${repo}): ${errJson.message || refRes.statusText}`
        };
      }
      const refData = await refRes.json();
      const latestCommitSha = refData.object.sha;

      // 2. Ambil base tree SHA
      const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers });
      const commitData = await commitRes.json();
      const baseTreeSha = commitData.tree.sha;

      // 3. Kumpulkan file teks di dist/ untuk diunggah ke tree GitHub
      const treeItems = [];
      function collectDistForTree(currDir, relPrefix = 'dist') {
        const entries = fs.readdirSync(currDir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(currDir, entry.name);
          const rel = `${relPrefix}/${entry.name}`;
          if (entry.isDirectory()) {
            collectDistForTree(full, rel);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (['.html', '.css', '.xml', '.txt', '.json', '.svg', '.js'].includes(ext)) {
              treeItems.push({
                path: rel,
                mode: '100644',
                type: 'blob',
                content: fs.readFileSync(full, 'utf-8')
              });
            }
          }
        }
      }
      collectDistForTree(DIST_DIR, 'dist');

      // 4. Buat Tree baru di GitHub
      const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeItems
        })
      });
      if (!treeRes.ok) {
        const errTree = await treeRes.json().catch(() => ({}));
        return {
          success: false,
          buildResult,
          message: `Build dist/ selesai, namun gagal membuat Git Tree di GitHub: ${errTree.message || treeRes.statusText}`
        };
      }
      const treeData = await treeRes.json();

      // 5. Buat Commit baru
      const commitMessage = `chore(publish): build static site to dist/ (${new Date().toISOString()})`;
      const newCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: commitMessage,
          tree: treeData.sha,
          parents: [latestCommitSha]
        })
      });
      const newCommitData = await newCommitRes.json();

      // 6. Update ref branch
      const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sha: newCommitData.sha,
          force: false
        })
      });

      if (updateRefRes.ok) {
        return {
          success: true,
          method: 'github-rest-api',
          buildResult,
          commitSha: newCommitData.sha.slice(0, 7),
          repo: `${owner}/${repo}`,
          branch,
          message: `Publish via Git berhasil! ${buildResult.totalFiles} file dibangun ke dist/ dan di-push ke GitHub (${owner}/${repo}@${branch}, commit ${newCommitData.sha.slice(0, 7)}).`
        };
      } else {
        const errUpdate = await updateRefRes.json().catch(() => ({}));
        return {
          success: false,
          buildResult,
          message: `Gagal memperbarui branch ref di GitHub: ${errUpdate.message || updateRefRes.statusText}`
        };
      }
    } catch (apiErr) {
      return {
        success: false,
        buildResult,
        message: `Build dist/ selesai, namun koneksi ke GitHub API gagal: ${apiErr.message}`
      };
    }
  }

  // Fallback: Coba gunakan Git CLI lokal jika tersedia
  return new Promise((resolve) => {
    exec('git --version', { cwd: ROOT_DIR }, (verErr) => {
      if (verErr) {
        resolve({
          success: false,
          needsConfig: true,
          buildResult,
          message: `Folder dist/ (${buildResult.totalFiles} file) berhasil dibangun, tetapi GITHUB_TOKEN / GITHUB_REPO_OWNER belum diisi di Settings > GitOps & GitHub (dan Git CLI tidak terdeteksi di sistem). Silakan lengkapi kredensial GitHub Anda terlebih dahulu.`
        });
        return;
      }

      const commitMsg = `chore(publish): static build v0.2.3 (${new Date().toISOString()})`;
      exec(`git add -A && git commit -m "${commitMsg}" && git push origin ${branch}`, { cwd: ROOT_DIR }, (gitErr, stdout, stderr) => {
        if (gitErr && !String(stdout + stderr).includes('nothing to commit')) {
          resolve({
            success: false,
            buildResult,
            message: `Folder dist/ berhasil dibangun, namun git push gagal: ${(stderr || gitErr.message).trim()}`
          });
        } else {
          resolve({
            success: true,
            method: 'git-cli',
            buildResult,
            branch,
            message: `Publish via Git CLI berhasil! Seluruh perubahan & folder dist/ (${buildResult.totalFiles} file) telah di-push ke branch "${branch}".`
          });
        }
      });
    });
  });
}

/**
 * ================= BACKUP & RESTORE ENGINE (ke folder backup/) =================
 */
function listBackups() {
  ensureDir(BACKUP_DIR);
  const entries = fs.readdirSync(BACKUP_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const folderPath = path.join(BACKUP_DIR, d.name);
      const manifestPath = path.join(folderPath, 'manifest.json');
      const { sizeBytes, fileCount } = getDirSizeAndCount(folderPath);
      let manifest = {
        id: d.name,
        label: 'Snapshot Backup',
        createdAt: fs.statSync(folderPath).mtime.toISOString(),
        version: '0.2.3'
      };
      if (fs.existsSync(manifestPath)) {
        try {
          manifest = { ...manifest, ...JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) };
        } catch (e) {}
      }
      return {
        ...manifest,
        id: d.name,
        path: `backup/${d.name}`,
        sizeBytes,
        fileCount
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return entries;
}

function createBackup(label = '') {
  ensureDir(BACKUP_DIR);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const backupId = `backup-${stamp}`;
  const targetDir = path.join(BACKUP_DIR, backupId);
  ensureDir(targetDir);

  // 1. Copy content/
  const contentCopied = [];
  if (fs.existsSync(CONTENT_DIR)) {
    copyDirRecursive(CONTENT_DIR, path.join(targetDir, 'content'), contentCopied, 'content');
  }

  // 2. Copy theme.json
  const themeJsonPath = path.join(THEME_DIR, 'theme.json');
  if (fs.existsSync(themeJsonPath)) {
    ensureDir(path.join(targetDir, 'theme'));
    fs.copyFileSync(themeJsonPath, path.join(targetDir, 'theme', 'theme.json'));
  }

  // 3. Copy assets/ (logo, favicon, notion images)
  const assetsCopied = [];
  if (fs.existsSync(ASSETS_DIR)) {
    copyDirRecursive(ASSETS_DIR, path.join(targetDir, 'assets'), assetsCopied, 'assets');
  }

  const fruitsCount = getAllFruits().length;
  const postsCount = getAllPostsAcrossAllFruits().length;
  const { sizeBytes, fileCount } = getDirSizeAndCount(targetDir);

  const manifest = {
    id: backupId,
    label: (label || '').trim() || `Backup Otomatis (${now.toLocaleDateString('id-ID')})`,
    createdAt: now.toISOString(),
    version: '0.2.3',
    stats: {
      fruitsCount,
      postsCount,
      contentFiles: contentCopied.length,
      assetFiles: assetsCopied.length,
      totalFiles: fileCount + 1,
      sizeBytes
    }
  };

  fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  return {
    ...manifest,
    path: `backup/${backupId}`,
    sizeBytes,
    fileCount: fileCount + 1
  };
}

function restoreBackup(backupId) {
  const safeId = path.basename(String(backupId || '').trim());
  const sourceDir = path.join(BACKUP_DIR, safeId);
  if (!safeId || !fs.existsSync(sourceDir)) {
    throw new Error(`Backup "${safeId}" tidak ditemukan di folder backup/.`);
  }

  const restoredFiles = [];

  // 1. Restore content/
  const srcContent = path.join(sourceDir, 'content');
  if (fs.existsSync(srcContent)) {
    if (fs.existsSync(CONTENT_DIR)) {
      fs.rmSync(CONTENT_DIR, { recursive: true, force: true });
    }
    copyDirRecursive(srcContent, CONTENT_DIR, restoredFiles, 'content');
  }

  // 2. Restore theme.json
  const srcThemeJson = path.join(sourceDir, 'theme', 'theme.json');
  if (fs.existsSync(srcThemeJson)) {
    ensureDir(THEME_DIR);
    fs.copyFileSync(srcThemeJson, path.join(THEME_DIR, 'theme.json'));
    restoredFiles.push('src/themes/fruition-capsule/theme.json');
  }

  // 3. Restore assets/
  const srcAssets = path.join(sourceDir, 'assets');
  if (fs.existsSync(srcAssets)) {
    ensureDir(ASSETS_DIR);
    copyDirRecursive(srcAssets, ASSETS_DIR, restoredFiles, 'assets');
  }

  return {
    id: safeId,
    restoredCount: restoredFiles.length,
    timestamp: new Date().toISOString()
  };
}

function deleteBackup(backupId) {
  const safeId = path.basename(String(backupId || '').trim());
  const targetDir = path.join(BACKUP_DIR, safeId);
  if (!safeId || !fs.existsSync(targetDir)) {
    throw new Error(`Backup "${safeId}" tidak ditemukan.`);
  }
  fs.rmSync(targetDir, { recursive: true, force: true });
  return { id: safeId, deleted: true };
}

module.exports = {
  buildStaticSiteToDist,
  publishViaGit,
  generateDynamicFeeds,
  generatePlatformHeaders,
  getPlatformHeaderPreview,
  listBackups,
  createBackup,
  restoreBackup,
  deleteBackup
};
