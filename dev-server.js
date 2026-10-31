const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { syncFullFruitDatabase } = require('./scripts/notion-engine');
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
} = require('./scripts/theme-renderer');
const {
  buildStaticSiteToDist,
  publishViaGit,
  generateDynamicFeeds,
  generatePlatformHeaders,
  getPlatformHeaderPreview,
  listBackups,
  createBackup,
  restoreBackup,
  deleteBackup
} = require('./scripts/static-builder');

const PORT = 4321;
const ROOT_DIR = __dirname;
const SERVER_START_TIME = new Date().toISOString();
const SERVER_BOOT_ID = `boot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ADMIN_DIR = path.join(__dirname, 'admin');
const PREVIEW_DIR = path.join(__dirname, 'src', 'themes', 'fruition-capsule', 'preview');
const THEME_PREVIEW = path.join(PREVIEW_DIR, 'index.html');
const AUTHORS_PREVIEW = path.join(PREVIEW_DIR, 'authors.html');
const AUTHOR_PREVIEW = path.join(PREVIEW_DIR, 'author.html');
const ARCHIVE_PREVIEW = path.join(PREVIEW_DIR, 'archive.html');
const SINGLE_PREVIEW = path.join(PREVIEW_DIR, 'single.html');
const PAGE_PREVIEW = path.join(PREVIEW_DIR, 'page.html');
const CAPSULE_CSS = path.join(__dirname, 'src', 'themes', 'fruition-capsule', 'styles', 'capsule.css');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.astro': 'text/plain; charset=utf-8'
};

function serveFile(res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + filePath);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.on('error', (streamErr) => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      res.end('Server stream error: ' + streamErr.message);
    });
    stream.pipe(res);
  });
}

function parseEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  const resObj = {
    NOTION_API_KEY: '',
    GITHUB_TOKEN: '',
    GITHUB_REPO_OWNER: '',
    GITHUB_REPO_NAME: 'blogs-dev',
    PORT: '4321'
  };
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, 'utf-8');
    text.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq !== -1) {
        const k = trimmed.slice(0, eq).trim();
        const v = trimmed.slice(eq + 1).trim();
        resObj[k] = v;
      }
    });
  }
  return resObj;
}

const server = http.createServer((req, res) => {
  let reqUrl = decodeURI(req.url.split('?')[0]);

  // ================= SYSTEM OVERVIEW & BOOT SESSION REST API =================
  if (reqUrl === '/api/system-overview' && req.method === 'GET') {
    try {
      const getDirMetrics = (dirPath) => {
        let sizeBytes = 0;
        let fileCount = 0;
        if (!fs.existsSync(dirPath)) return { sizeBytes, fileCount };
        const stack = [dirPath];
        while (stack.length > 0) {
          const curr = stack.pop();
          const entries = fs.readdirSync(curr, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(curr, entry.name);
            if (entry.isDirectory()) stack.push(full);
            else if (entry.isFile()) {
              try {
                sizeBytes += fs.statSync(full).size;
                fileCount += 1;
              } catch (e) {}
            }
          }
        }
        return { sizeBytes, fileCount };
      };

      const fruits = getAllFruits();
      const allPosts = getAllPostsAcrossAllFruits();
      const authors = getAllAuthors();
      const pages = getCollectionItems('pages');
      const siteSettings = getSiteSettings();
      const env = parseEnv();
      const backups = listBackups();

      const themeManifestPath = path.join(__dirname, 'src', 'themes', 'fruition-capsule', 'theme.json');
      const themeConfig = fs.existsSync(themeManifestPath)
        ? JSON.parse(fs.readFileSync(themeManifestPath, 'utf-8'))
        : {};

      const collectionsBreakdown = fruits.map(f => {
        const pt = f.postType || f.id;
        const coll = f.targetCollection || (pt === 'page' ? 'pages' : pt);
        const items = getCollectionItems(coll);
        return {
          id: f.id,
          name: f.name || f.id,
          postType: pt,
          count: items.length || f.totalItems || 0,
          webpCount: f.webpMediaCount || 0,
          showOnIndex: f.showOnIndex !== false,
          fallbackColor: f.settings?.fallbackColor || 'Pastel Blossom',
          lastSync: f.lastSync || null
        };
      });

      const categoryMap = {};
      let coverImageCount = 0;
      let fallbackCoverCount = 0;
      allPosts.forEach(p => {
        const cat = p.category || 'Uncategorized';
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
        if (p.coverImage) coverImageCount += 1;
        else fallbackCoverCount += 1;
      });
      const categoriesBreakdown = Object.entries(categoryMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      const contentMetrics = getDirMetrics(path.join(__dirname, 'content'));
      const assetsMetrics = getDirMetrics(path.join(__dirname, 'src', 'themes', 'fruition-capsule', 'assets'));
      const distMetrics = getDirMetrics(path.join(__dirname, 'dist'));
      const backupMetrics = getDirMetrics(path.join(__dirname, 'backup'));

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({
        success: true,
        bootId: SERVER_BOOT_ID,
        startedAt: SERVER_START_TIME,
        uptimeSeconds: Math.floor(process.uptime()),
        totals: {
          fruits: fruits.length,
          posts: allPosts.length,
          pages: pages.length,
          authors: authors.length,
          totalDocuments: allPosts.length + pages.length + authors.length,
          webpImages: assetsMetrics.fileCount,
          coverImageCount,
          fallbackCoverCount
        },
        collectionsBreakdown,
        categoriesBreakdown,
        storageBreakdown: [
          { id: 'content', label: 'Database JSON (content/)', ...contentMetrics, color: '#0969da' },
          { id: 'assets', label: 'Aset Media & WebP (assets/)', ...assetsMetrics, color: '#2da44e' },
          { id: 'dist', label: 'Build Produksi Statis (dist/)', ...distMetrics, color: '#8250df' },
          { id: 'backup', label: 'Snapshot Cadangan (backup/)', ...backupMetrics, color: '#bf8700' }
        ],
        systemHealth: {
          coreVersion: '0.2.7',
          themeName: themeConfig.displayName || 'Fruition-capsule',
          themeVersion: themeConfig.version || '0.2.7',
          activePreset: themeConfig.defaultPreset || 'Blue Sky',
          cardMode: themeConfig.components?.cards?.defaultMode || 'default',
          editorialPattern: themeConfig.components?.cards?.editorialGrid?.pattern || '1-2-4',
          notionConnected: Boolean(env.NOTION_API_KEY && env.NOTION_API_KEY.length > 5),
          gitopsEnabled: Boolean(siteSettings.gitopsAutoSync),
          distBuilt: distMetrics.fileCount > 0,
          distFileCount: distMetrics.fileCount,
          backupsCount: backups.length
        }
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // ================= FRUIT CONNECTOR REST API =================
  if (reqUrl.startsWith('/api/fruits')) {
    const fruitsDir = path.join(__dirname, 'content', 'fruits');
    if (!fs.existsSync(fruitsDir)) {
      fs.mkdirSync(fruitsDir, { recursive: true });
    }

    // GET /api/fruits
    if (req.method === 'GET') {
      try {
        const files = fs.readdirSync(fruitsDir).filter(f => f.endsWith('.json'));
        const fruits = files.map(f => {
          try {
            return JSON.parse(fs.readFileSync(path.join(fruitsDir, f), 'utf-8'));
          } catch (e) {
            return null;
          }
        }).filter(Boolean);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, fruits }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    // POST /api/fruits/test-handshake (Live Notion DB Verification)
    if (req.method === 'POST' && reqUrl.includes('/test-handshake')) {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const dbId = (payload.databaseId || '').replace(/-/g, '').trim();
          const env = parseEnv();
          const token = env.NOTION_API_KEY;

          if (!token) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, message: 'Token NOTION_API_KEY di .env belum diisi.' }));
            return;
          }
          if (!dbId) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, message: 'Database ID kosong.' }));
            return;
          }

          const notionRes = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Notion-Version': '2022-06-28'
            }
          });

          if (notionRes.ok) {
            const dbData = await notionRes.json();
            const dbTitle = (dbData.title && dbData.title[0]) ? dbData.title[0].plain_text : 'Untitled Database';
            const propKeys = Object.keys(dbData.properties || {});
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              success: true,
              message: `Handshake Sukses! Terhubung ke Notion Database "${dbTitle}" (${propKeys.length} properti terdeteksi).`,
              title: dbTitle,
              properties: propKeys
            }));
          } else {
            const errData = await notionRes.json().catch(() => ({}));
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              success: false,
              message: `Gagal Handshake (HTTP ${notionRes.status}): ${errData.message || 'Database tidak dapat diakses atau bot belum diundang'}`
            }));
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // POST /api/fruits/sync (Live Notion Sync to Content Collections)
    if (req.method === 'POST' && reqUrl.includes('/sync')) {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const fruitId = payload.id || reqUrl.split('/')[3] || 'read';
          const fruitFile = path.join(fruitsDir, `${fruitId}.json`);

          if (!fs.existsSync(fruitFile)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Fruit not found' }));
            return;
          }

          const current = JSON.parse(fs.readFileSync(fruitFile, 'utf-8'));
          const env = parseEnv();
          const token = env.NOTION_API_KEY;

          let syncedCount = current.totalItems || 0;
          let syncMsg = `Fruit "${current.name}" disinkronkan.`;

          // Jika ada token dan databaseId, query real data + blocks + media dari Notion
          if (token && current.databaseId) {
            try {
              const syncStats = await syncFullFruitDatabase(current, token);
              syncedCount = syncStats.syncedCount;
              current.totalItems = syncedCount;
              current.webpMediaCount = syncStats.mediaCount;
              const targetColl = current.targetCollection || current.postType || current.id || 'read';
              syncMsg = `Berhasil menyinkronkan ${syncedCount} artikel beserta isi blok & media langsung dari Notion Database ke content/${targetColl}/!`;
            } catch (notionErr) {
              console.warn('Live Notion query warning:', notionErr.message);
            }
          }

          current.lastSync = new Date().toISOString();
          current.status = 'active';
          fs.writeFileSync(fruitFile, JSON.stringify(current, null, 2), 'utf-8');

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, message: syncMsg, fruit: current }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // POST /api/fruits/toggle-index (Toggle on/off tampil di beranda/index)
    if (req.method === 'POST' && reqUrl.includes('/toggle-index')) {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const fruitId = payload.id;
          const fruitFile = path.join(fruitsDir, `${fruitId}.json`);
          if (fs.existsSync(fruitFile)) {
            const fruitData = JSON.parse(fs.readFileSync(fruitFile, 'utf-8'));
            fruitData.showOnIndex = typeof payload.showOnIndex === 'boolean' ? payload.showOnIndex : !fruitData.showOnIndex;
            fs.writeFileSync(fruitFile, JSON.stringify(fruitData, null, 2), 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              success: true,
              message: `Status tampil di beranda untuk "${fruitData.name}" diubah menjadi: ${fruitData.showOnIndex ? 'Aktif' : 'Nonaktif'}`,
              showOnIndex: fruitData.showOnIndex
            }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Fruit not found' }));
          }
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // POST /api/fruits (Create or Update Fruit)
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const fruit = JSON.parse(body);
          if (!fruit.id || !fruit.databaseId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'ID and Database ID are required.' }));
            return;
          }
          const fruitFile = path.join(fruitsDir, `${fruit.id}.json`);
          fruit.lastSync = fruit.lastSync || new Date().toISOString();
          fruit.status = fruit.status || 'active';
          fs.writeFileSync(fruitFile, JSON.stringify(fruit, null, 2), 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Fruit connector saved!', fruit }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // DELETE /api/fruits/:id
    if (req.method === 'DELETE') {
      const parts = reqUrl.split('/');
      const fruitId = parts[parts.length - 1];
      const fruitFile = path.join(fruitsDir, `${fruitId}.json`);
      if (fs.existsSync(fruitFile)) {
        fs.unlinkSync(fruitFile);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Fruit deleted' }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Fruit not found' }));
      }
      return;
    }
  }

  // ================= SETTINGS & NAVIGATION REST API =================
  if (reqUrl.startsWith('/api/settings')) {
    const settingsFile = path.join(__dirname, 'content', 'settings', 'site.json');

    // GET /api/settings
    if (req.method === 'GET') {
      try {
        if (fs.existsSync(settingsFile)) {
          const data = fs.readFileSync(settingsFile, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(data);
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Settings not found' }));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // POST /api/settings
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const dir = path.dirname(settingsFile);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(settingsFile, JSON.stringify(parsed, null, 2), 'utf-8');

          // Otomatis sinkronkan file header platform yang dipilih
          let headerResult = null;
          if (parsed.publishPlatform) {
            try {
              headerResult = generatePlatformHeaders(parsed.publishPlatform, parsed);
            } catch (hErr) {
              console.warn('[Header Generator Warning]:', hErr.message);
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            message: 'Settings & Navigation saved successfully!',
            settings: parsed,
            headerResult
          }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }
  }

  // ================= UPLOAD LOGO REST API =================
  if (reqUrl.startsWith('/api/upload-logo') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const dataUrl = parsed.data || '';
        const rawFilename = parsed.filename || 'logo.png';
        const ext = path.extname(rawFilename).toLowerCase() || '.png';
        const allowedExts = ['.png', '.svg', '.jpg', '.jpeg', '.webp', '.gif', '.ico'];
        if (!allowedExts.includes(ext)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Format file tidak didukung. Gunakan PNG, SVG, JPG, atau WebP.' }));
          return;
        }

        const base64Index = dataUrl.indexOf(';base64,');
        if (base64Index === -1) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Data gambar tidak valid.' }));
          return;
        }

        const base64Content = dataUrl.substring(base64Index + 8);
        const buffer = Buffer.from(base64Content, 'base64');
        const targetFilename = `logo${ext}`;
        const targetDir = path.join(__dirname, 'src', 'themes', 'fruition-capsule', 'assets');
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        
        fs.writeFileSync(path.join(targetDir, targetFilename), buffer);

        // Update site.json logoUrl
        const settingsFile = path.join(__dirname, 'content', 'settings', 'site.json');
        if (fs.existsSync(settingsFile)) {
          try {
            const current = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
            current.logoUrl = `/${targetFilename}`;
            fs.writeFileSync(settingsFile, JSON.stringify(current, null, 2), 'utf-8');
          } catch (e) {}
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          message: 'Logo berhasil diunggah!',
          url: `/${targetFilename}`,
          filename: targetFilename
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // ================= UPLOAD FAVICON REST API =================
  if (reqUrl.startsWith('/api/upload-favicon') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const dataUrl = parsed.data || '';
        const rawFilename = parsed.filename || 'favicon.png';
        const ext = path.extname(rawFilename).toLowerCase() || '.png';
        const allowedExts = ['.ico', '.png', '.svg', '.webp', '.jpg', '.jpeg', '.gif'];
        if (!allowedExts.includes(ext)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Format favicon tidak didukung. Gunakan ICO, PNG, SVG, atau WebP.' }));
          return;
        }

        const base64Index = dataUrl.indexOf(';base64,');
        if (base64Index === -1) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Data gambar favicon tidak valid.' }));
          return;
        }

        const base64Content = dataUrl.substring(base64Index + 8);
        const buffer = Buffer.from(base64Content, 'base64');
        const targetFilename = `favicon${ext}`;
        const targetDir = path.join(__dirname, 'src', 'themes', 'fruition-capsule', 'assets');
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        fs.writeFileSync(path.join(targetDir, targetFilename), buffer);

        // Update site.json faviconUrl
        const settingsFile = path.join(__dirname, 'content', 'settings', 'site.json');
        if (fs.existsSync(settingsFile)) {
          try {
            const current = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
            current.faviconUrl = `/${targetFilename}`;
            fs.writeFileSync(settingsFile, JSON.stringify(current, null, 2), 'utf-8');
          } catch (e) {}
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          message: 'Favicon berhasil diunggah!',
          url: `/${targetFilename}`,
          filename: targetFilename
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // ================= PUBLISH ENGINE REST API (LOCAL dist/ & GIT) =================
  if (reqUrl === '/api/publish/local' && req.method === 'POST') {
    try {
      const result = buildStaticSiteToDist();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        message: `Publish Lokal berhasil via Astro SSG! ${result.totalFiles} berkas produksi telah dibangun ke folder dist/ dalam ${result.durationMs}ms.`,
        result
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (reqUrl === '/api/publish/git' && req.method === 'POST') {
    (async () => {
      try {
        const envConfig = parseEnv();
        const result = await publishViaGit(envConfig);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    })();
    return;
  }

  // ================= PLATFORM HEADERS GENERATOR REST API =================
  if (reqUrl.startsWith('/api/header-preview') && req.method === 'GET') {
    try {
      const u = new URL(req.url, 'http://localhost:4321');
      const platform = u.searchParams.get('platform') || 'vercel';
      const siteSettings = getSiteSettings();
      const preview = getPlatformHeaderPreview(platform, siteSettings);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, preview }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (reqUrl.startsWith('/api/generate-headers') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        const siteSettings = getSiteSettings();
        const platform = parsed.platform || siteSettings.publishPlatform || 'vercel';
        const result = generatePlatformHeaders(platform, { ...siteSettings, publishPlatform: platform });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          message: `Header untuk ${platform} berhasil dibuat!`,
          result
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // ================= BACKUP & RESTORE REST API (folder backup/) =================
  if (reqUrl.startsWith('/api/backups')) {
    if (req.method === 'GET') {
      try {
        const backups = listBackups();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, backups }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    if (req.method === 'POST' && reqUrl.endsWith('/create')) {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const backup = createBackup(payload.label || '');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            message: `Snapshot backup "${backup.id}" berhasil disimpan ke folder backup/!`,
            backup
          }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    if (req.method === 'POST' && reqUrl.endsWith('/restore')) {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const result = restoreBackup(payload.id);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            message: `Restore berhasil! ${result.restoredCount} berkas dari "${result.id}" telah dipulihkan.`,
            result
          }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      try {
        const parts = reqUrl.split('/');
        const backupId = parts[parts.length - 1];
        const result = deleteBackup(backupId);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          message: `Backup "${result.id}" telah dihapus dari folder backup/.`,
          result
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }
  }

  // ================= TRACKED SITE URLS REST API =================
  if (reqUrl.startsWith('/api/tracked-urls')) {
    try {
      const contentDir = path.join(__dirname, 'content');
      const items = [];

      // 1. Beranda
      items.push({ group: '🏠 Halaman Utama', title: 'Beranda (Home) — /theme', url: '/theme', labelSuggestion: 'Home' });

      // 2. Fruit Collections & Archives
      const fruitsDir = path.join(contentDir, 'fruits');
      const postCollections = new Set();
      if (fs.existsSync(fruitsDir)) {
        fs.readdirSync(fruitsDir).filter(f => f.endsWith('.json')).forEach(f => {
          try {
            const fruit = JSON.parse(fs.readFileSync(path.join(fruitsDir, f), 'utf-8'));
            const pt = fruit.postType || fruit.id;
            const coll = fruit.targetCollection || fruit.postType || fruit.id;
            if (pt && pt !== 'page' && pt !== 'authors' && pt !== 'settings') {
              items.push({ group: '📚 Arsip Post Type', title: `${fruit.name || pt} — /${pt}`, url: `/${pt}`, labelSuggestion: fruit.name || pt });
              if (coll) postCollections.add(coll);
            }
          } catch (e) {}
        });
      }
      postCollections.add('read');

      // 3. Authors Directory & Single Authors
      items.push({ group: '✍️ Penulis (Authors)', title: 'Direktori Semua Penulis — /authors', url: '/authors', labelSuggestion: 'Authors' });
      const authorsDir = path.join(contentDir, 'authors');
      if (fs.existsSync(authorsDir)) {
        fs.readdirSync(authorsDir).filter(f => f.endsWith('.json')).forEach(f => {
          try {
            const author = JSON.parse(fs.readFileSync(path.join(authorsDir, f), 'utf-8'));
            const slug = author.slug || path.basename(f, '.json');
            const name = author.name || author.title || slug;
            items.push({ group: '✍️ Profil Penulis', title: `${name} — /authors/${slug}`, url: `/authors/${slug}`, labelSuggestion: name });
          } catch (e) {}
        });
      }

      // 4. Static Pages
      const pagesDir = path.join(contentDir, 'pages');
      if (fs.existsSync(pagesDir)) {
        fs.readdirSync(pagesDir).filter(f => f.endsWith('.json')).forEach(f => {
          try {
            const page = JSON.parse(fs.readFileSync(path.join(pagesDir, f), 'utf-8'));
            const slug = page.slug || path.basename(f, '.json');
            const title = page.title || page.name || slug;
            const capTitle = title.charAt(0).toUpperCase() + title.slice(1);
            items.push({ group: '📄 Halaman Statis (Page)', title: `${capTitle} — /${slug}`, url: `/${slug}`, labelSuggestion: capTitle });
          } catch (e) {}
        });
      }

      // 5. Individual Posts across all Fruit collections
      postCollections.forEach(coll => {
        const collDir = path.join(contentDir, coll);
        if (fs.existsSync(collDir)) {
          fs.readdirSync(collDir).filter(f => f.endsWith('.json')).forEach(f => {
            try {
              const post = JSON.parse(fs.readFileSync(path.join(collDir, f), 'utf-8'));
              const slug = post.slug || path.basename(f, '.json');
              const title = post.title || slug;
              const pt = post.postType || coll;
              items.push({ group: `📝 Artikel (${pt})`, title: `${title} — /${pt}/${slug}`, url: `/${pt}/${slug}`, labelSuggestion: title });
            } catch (e) {}
          });
        }
      });

      // 6. Berkas Teknis & Feeds (Technical & Feeds)
      items.push({ group: '⚙️ Berkas Teknis & Feeds', title: 'Sitemap XML — /sitemap.xml', url: '/sitemap.xml', labelSuggestion: 'sitemap.xml' });
      items.push({ group: '⚙️ Berkas Teknis & Feeds', title: 'RSS Feed — /rss', url: '/rss', labelSuggestion: 'rss' });
      items.push({ group: '⚙️ Berkas Teknis & Feeds', title: 'RSS XML — /rss.xml', url: '/rss.xml', labelSuggestion: 'rss.xml' });
      items.push({ group: '⚙️ Berkas Teknis & Feeds', title: 'Robots TXT — /robots.txt', url: '/robots.txt', labelSuggestion: 'robots.txt' });
      items.push({ group: '⚙️ Berkas Teknis & Feeds', title: 'LLMs TXT — /llms.txt', url: '/llms.txt', labelSuggestion: 'llms.txt' });
      items.push({ group: '⚙️ Berkas Teknis & Feeds', title: 'Feed JSON — /feed.json', url: '/feed.json', labelSuggestion: 'feed.json' });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ success: true, urls: items }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // ================= SYSTEM ENVIRONMENT (.env) REST API =================
  if (reqUrl.startsWith('/api/env')) {
    const envPath = path.join(ROOT_DIR, '.env');

    if (req.method === 'GET') {
      try {
        const env = parseEnv();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, env }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const updates = JSON.parse(body || '{}');
          let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
          
          Object.keys(updates).forEach(key => {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            const newLine = `${key}=${updates[key]}`;
            if (regex.test(content)) {
              content = content.replace(regex, newLine);
            } else {
              content += `\n${newLine}`;
            }
          });
          fs.writeFileSync(envPath, content, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, message: 'File .env berhasil diperbarui!' }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }
  }

  // ================= TEST NOTION CONNECTION API =================
  if (reqUrl.startsWith('/api/test-notion') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        let token = payload.token;
        if (!token) {
          // Fallback ke .env token
          const envPath = path.join(ROOT_DIR, '.env');
          if (fs.existsSync(envPath)) {
            const text = fs.readFileSync(envPath, 'utf-8');
            const m = text.match(/^NOTION_API_KEY=(.*)$/m);
            if (m) token = m[1].trim();
          }
        }

        if (!token || token.length < 5) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, message: 'NOTION_API_KEY belum diisi. Masukkan token integrasi internal (secret_...).' }));
          return;
        }

        try {
          const notionRes = await fetch('https://api.notion.com/v1/users/me', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Notion-Version': '2022-06-28'
            }
          });

          if (notionRes.ok) {
            const data = await notionRes.json();
            const botName = data.name || data.bot?.owner?.user?.name || 'Fruition Integration Bot';
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              success: true,
              message: `Koneksi Notion API berhasil! Terhubung sebagai "${botName}".`,
              bot: data
            }));
          } else {
            const errData = await notionRes.json().catch(() => ({}));
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              success: false,
              message: `Gagal verifikasi token Notion (HTTP ${notionRes.status}): ${errData.message || 'Token tidak valid'}`
            }));
          }
        } catch (fetchErr) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: false,
            message: `Gagal menghubungi endpoint Notion: ${fetchErr.message}. Pastikan koneksi internet aktif.`
          }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // ================= CLEAR CACHE API =================
  if (reqUrl.startsWith('/api/cache/clear') && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, message: 'Cache JSON dan media berhasil dibersihkan.' }));
    return;
  }

  // ================= GLOBAL TEXT SEARCH API (CROSS POST TYPE) =================
  if (reqUrl.startsWith('/api/search')) {
    try {
      const q = (new URL(req.url, 'http://localhost:4321').searchParams.get('q') || '').toLowerCase().trim();
      const contentDir = path.join(__dirname, 'content');
      
      const allIndexedItems = [];
      const collections = fs.readdirSync(contentDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name !== 'fruits' && d.name !== 'settings')
        .map(d => d.name);

      collections.forEach(coll => {
        const collPath = path.join(contentDir, coll);
        const files = fs.readdirSync(collPath).filter(f => f.endsWith('.json'));

        files.forEach(f => {
          try {
            const item = JSON.parse(fs.readFileSync(path.join(collPath, f), 'utf-8'));
            const postType = coll; // 'read', 'posts', 'pages', 'authors'
            const slug = item.slug || path.basename(f, '.json');
            const title = item.title || item.properties?.Title?.title?.[0]?.plain_text || item.properties?.Name?.title?.[0]?.plain_text || slug;
            const excerpt = item.description || item.properties?.Meta_description?.rich_text?.[0]?.plain_text || item.properties?.Bio?.rich_text?.[0]?.plain_text || '';
            const category = item.category || item.properties?.Category?.select?.name || '';
            const tags = item.tags || (item.properties?.Tags?.multi_select || []).map(t => t.name);

            // Routing logic: page is /[slug], read is /read/[slug], authors is /authors/[author-name]
            let url = `/${postType}/${slug}`;
            if (postType === 'pages' || postType === 'page') {
              url = `/${slug}`;
            } else if (postType === 'authors') {
              url = `/authors/${slug}`;
            }

            allIndexedItems.push({
              id: item.id || slug,
              title,
              slug,
              postType,
              url,
              category,
              tags,
              excerpt
            });
          } catch(e) {}
        });
      });

      // Filter by text query across all fields
      const results = q
        ? allIndexedItems.filter(it => 
            it.title.toLowerCase().includes(q) ||
            it.excerpt.toLowerCase().includes(q) ||
            it.category.toLowerCase().includes(q) ||
            it.tags.some(t => t.toLowerCase().includes(q)) ||
            it.postType.toLowerCase().includes(q)
          )
        : allIndexedItems;

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, count: results.length, query: q, results }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // ================= THEMES REGISTRY REST API =================
  if (reqUrl.startsWith('/api/themes')) {
    const themesDir = path.join(__dirname, 'src', 'themes');

    // Sub-route: /api/themes/:themeId/config (GET & POST)
    if (reqUrl.includes('/config')) {
      const parts = reqUrl.split('?')[0].split('/');
      const themeId = parts[3] || 'fruition-capsule';
      const manifestPath = path.join(themesDir, themeId, 'theme.json');

      if (req.method === 'GET') {
        try {
          if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, themeId, config: manifest }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Theme not found' }));
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (!fs.existsSync(manifestPath)) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Theme not found' }));
              return;
            }
            const current = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            
            // Merge defaultPreset if provided
            if (parsed.defaultPreset) {
              current.defaultPreset = parsed.defaultPreset;
            }

            // Merge deep configurations
            if (parsed.components) {
              current.components = current.components || {};
              if (parsed.components.cards) {
                current.components.cards = {
                  ...current.components.cards,
                  ...parsed.components.cards,
                  gridColumns: {
                    ...(current.components.cards ? current.components.cards.gridColumns : {}),
                    ...(parsed.components.cards.gridColumns || {})
                  },
                  editorialGrid: {
                    ...(current.components.cards ? current.components.cards.editorialGrid : {}),
                    ...(parsed.components.cards.editorialGrid || {})
                  }
                };
              }
              if (parsed.components.hero) {
                current.components.hero = { ...current.components.hero, ...parsed.components.hero };
              }
              if (parsed.components.header) {
                current.components.header = { ...current.components.header, ...parsed.components.header };
              }
            }

            fs.writeFileSync(manifestPath, JSON.stringify(current, null, 2), 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, message: 'Theme settings saved!', config: current }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
        return;
      }
    }

    if (req.method === 'GET') {
      try {
        const themeFolders = fs.readdirSync(themesDir, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name);

        const themes = themeFolders.map(folder => {
          const manifestPath = path.join(themesDir, folder, 'theme.json');
          if (fs.existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
              return {
                id: folder,
                name: manifest.displayName || manifest.name || folder,
                version: manifest.version || '0.2.0',
                author: manifest.author || 'Fruition Team',
                description: manifest.description || 'Theme for Fruition Mini',
                activePreset: manifest.defaultPreset || 'Blue Sky',
                availablePresets: Object.keys(manifest.presets || { 'Blue Sky': {}, 'Mono': {}, 'Candy Pop': {} }),
                path: `src/themes/${folder}/`,
                isActive: folder === 'fruition-capsule'
              };
            } catch (e) {
              return null;
            }
          }
          return null;
        }).filter(Boolean);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, themes }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }
  }

  // ================= PLUGINS REGISTRY REST API =================
  if (reqUrl.startsWith('/api/plugins')) {
    const pluginsDir = path.join(__dirname, 'content', 'plugins');
    if (!fs.existsSync(pluginsDir)) {
      fs.mkdirSync(pluginsDir, { recursive: true });
    }

    // Sub-route: /api/plugins/:id/toggle (POST)
    if (reqUrl.includes('/toggle') && req.method === 'POST') {
      const parts = reqUrl.split('?')[0].split('/');
      const pluginId = parts[3];
      const pluginFile = path.join(pluginsDir, `${pluginId}.json`);

      if (!fs.existsSync(pluginFile)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Plugin not found' }));
        return;
      }

      try {
        const config = JSON.parse(fs.readFileSync(pluginFile, 'utf-8'));
        config.enabled = !config.enabled;
        fs.writeFileSync(pluginFile, JSON.stringify(config, null, 2), 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          pluginId,
          enabled: config.enabled,
          message: `Plugin ${config.name} berhasil di-${config.enabled ? 'aktifkan' : 'nonaktifkan'}.`
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    // Sub-route: /api/plugins/:id/config (GET & POST)
    if (reqUrl.includes('/config')) {
      const parts = reqUrl.split('?')[0].split('/');
      const pluginId = parts[3];
      const pluginFile = path.join(pluginsDir, `${pluginId}.json`);

      if (req.method === 'GET') {
        try {
          if (fs.existsSync(pluginFile)) {
            const config = JSON.parse(fs.readFileSync(pluginFile, 'utf-8'));
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, pluginId, config }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Plugin not found' }));
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            let current = {};
            if (fs.existsSync(pluginFile)) {
              current = JSON.parse(fs.readFileSync(pluginFile, 'utf-8'));
            }
            const updated = {
              ...current,
              ...parsed,
              id: pluginId,
              settings: {
                ...(current.settings || {}),
                ...(parsed.settings || {})
              }
            };
            fs.writeFileSync(pluginFile, JSON.stringify(updated, null, 2), 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              success: true,
              pluginId,
              message: `Konfigurasi plugin ${updated.name || pluginId} berhasil disimpan.`,
              config: updated
            }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
        return;
      }
    }

    // Default: GET /api/plugins
    if (req.method === 'GET') {
      try {
        const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.json'));
        const plugins = files.map(file => {
          try {
            return JSON.parse(fs.readFileSync(path.join(pluginsDir, file), 'utf-8'));
          } catch (e) {
            return null;
          }
        }).filter(Boolean);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, total: plugins.length, plugins }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }
  }

  // Route 1: Theme preview at /theme or / (Dynamic Notion Data Renderer)
  if (reqUrl === '/theme' || reqUrl === '/theme/' || reqUrl === '/theme/index.html' || reqUrl === '/') {
    try {
      const html = renderIndexPage();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(html);
    } catch (e) {
      serveFile(res, THEME_PREVIEW);
    }
    return;
  }

  // Route 2: Authors list page preview (/authors)
  if (reqUrl === '/authors' || reqUrl === '/authors/' || reqUrl === '/authors.html' ||
      reqUrl === '/theme/authors' || reqUrl === '/theme/authors/' || reqUrl === '/theme/authors.html') {
    try {
      const html = renderAuthorsPage();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(html);
    } catch (e) {
      serveFile(res, AUTHORS_PREVIEW);
    }
    return;
  }

  // Route 2b: Single author page preview (/authors/:slug or /author)
  if (reqUrl === '/author' || reqUrl === '/author/' || reqUrl === '/author.html' ||
      reqUrl === '/theme/author' || reqUrl === '/theme/author/' || reqUrl === '/theme/author.html' ||
      reqUrl.startsWith('/author/') || reqUrl.startsWith('/authors/')) {
    try {
      const urlObj = new URL(req.url, 'http://localhost:4321');
      const parts = reqUrl.replace(/^\/+|\/+$/g, '').split('/');
      const authorSlug = parts[1] || urlObj.searchParams.get('author') || 'deddy-hidayat';
      const html = renderSingleAuthorPage(authorSlug);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(html);
    } catch (e) {
      serveFile(res, AUTHOR_PREVIEW);
    }
    return;
  }

  // Route 3: Archive / Post Type page preview (Supports /read, /posts & any registered Fruit Post Type)
  const cleanRoute = reqUrl.replace(/^\/theme\//, '/').replace(/\/+$/, '').replace(/\.html$/, '');
  const routeParts = cleanRoute.replace(/^\/+/, '').split('/').filter(Boolean);
  const firstSeg = routeParts[0] || '';
  const secondSeg = routeParts[1] || '';

  const contentCollDir = path.join(__dirname, 'content', firstSeg);
  const isPostTypeCollection = firstSeg &&
    !['admin', 'api', 'src', 'assets', 'fruits', 'settings', 'pages', 'authors'].includes(firstSeg) &&
    (fs.existsSync(contentCollDir) || ['read', 'posts', 'archive', 'articles'].includes(firstSeg));

  if (routeParts.length === 1 && isPostTypeCollection) {
    try {
      const targetPt = ['posts', 'archive', 'articles'].includes(firstSeg) ? 'read' : firstSeg;
      const html = renderArchivePage(targetPt);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(html);
    } catch (e) {
      serveFile(res, ARCHIVE_PREVIEW);
    }
    return;
  }

  // Route 4: Single post preview (Supports /read/:slug, /[postType]/:slug, /post)
  if (cleanRoute === '/post' || cleanRoute === '/single' || (routeParts.length === 2 && isPostTypeCollection)) {
    try {
      const targetPt = (routeParts.length === 2 && !['posts', 'articles'].includes(firstSeg)) ? firstSeg : 'read';
      const targetSlug = secondSeg || '';
      const html = renderSinglePostPage(targetPt, targetSlug);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(html);
    } catch (e) {
      serveFile(res, SINGLE_PREVIEW);
    }
    return;
  }

  // Route 5: Single static page preview (Konsep Fruit: page === /[slug], e.g. /about)
  const slugCandidate = cleanRoute.replace(/^\//, '');
  const pageFile = path.join(__dirname, 'content', 'pages', `${slugCandidate}.json`);
  if (cleanRoute === '/page' || cleanRoute === '/about' ||
      (slugCandidate && !slugCandidate.includes('/') && !slugCandidate.includes('.') && fs.existsSync(pageFile))) {
    try {
      const targetPageSlug = (cleanRoute === '/page') ? 'about' : slugCandidate;
      const html = renderStaticPage(targetPageSlug);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(html);
    } catch (e) {
      serveFile(res, PAGE_PREVIEW);
    }
    return;
  }

  // Route 4b: Modular Plugin Safelink page (/safelink)
  if (cleanRoute === '/safelink' || reqUrl === '/safelink' || reqUrl.startsWith('/safelink?') || reqUrl.startsWith('/safelink/')) {
    const safelinkDist = path.join(__dirname, 'dist', 'safelink', 'index.html');
    if (fs.existsSync(safelinkDist)) {
      serveFile(res, safelinkDist);
      return;
    }
  }

  // Route 5: Direct capsule.css
  if (reqUrl === '/capsule.css') {
    serveFile(res, CAPSULE_CSS);
    return;
  }

  // Route 5b: Direct logo & favicon files & assets
  if (['/logo.png', '/logo.svg', '/logo.webp', '/logo.jpg', '/logo.jpeg', '/logo.ico',
       '/favicon.ico', '/favicon.png', '/favicon.svg', '/favicon.webp', '/favicon.jpg', '/favicon.jpeg'].includes(reqUrl)) {
    serveFile(res, path.join(__dirname, 'src', 'themes', 'fruition-capsule', 'assets', path.basename(reqUrl)));
    return;
  }

  if (reqUrl.startsWith('/assets/')) {
    const assetSub = reqUrl.replace('/assets/', '');
    serveFile(res, path.join(__dirname, 'src', 'themes', 'fruition-capsule', 'assets', assetSub));
    return;
  }

  // Route 5c: Footer Links (sitemap.xml, rss, robots.txt, llms.txt, feed.json)
  if (reqUrl === '/sitemap.xml') {
    const feeds = generateDynamicFeeds();
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(feeds.sitemapXml);
    return;
  }

  if (reqUrl === '/rss' || reqUrl === '/rss.xml') {
    const feeds = generateDynamicFeeds();
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(feeds.rssXml);
    return;
  }

  if (reqUrl === '/robot.txt' || reqUrl === '/robots.txt') {
    const feeds = generateDynamicFeeds();
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(feeds.robotsTxt);
    return;
  }

  if (reqUrl === '/llms.txt') {
    const feeds = generateDynamicFeeds();
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(feeds.llmsTxt);
    return;
  }

  if (reqUrl === '/feed.json') {
    const feeds = generateDynamicFeeds();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(feeds.feedJson);
    return;
  }

  // Route 6: Files inside src/ (themes, styles, components, manifest)
  if (reqUrl.startsWith('/src/')) {
    const filePath = path.join(ROOT_DIR, reqUrl);
    serveFile(res, filePath);
    return;
  }

  // Route 4: Admin dashboard
  if (reqUrl === '/admin' || reqUrl === '/admin/') {
    serveFile(res, path.join(ADMIN_DIR, 'index.html'));
    return;
  }

  // Route 5: Static admin files
  let adminSubPath = reqUrl;
  if (adminSubPath.startsWith('/admin/')) {
    adminSubPath = adminSubPath.replace('/admin', '');
  }

  const adminFilePath = path.join(ADMIN_DIR, adminSubPath);
  fs.stat(adminFilePath, (err, stats) => {
    if (!err && stats.isFile()) {
      serveFile(res, adminFilePath);
      return;
    }

    // Fallback: check root dir
    const rootFilePath = path.join(ROOT_DIR, reqUrl);
    serveFile(res, rootFilePath);
  });
});

server.on('error', (err) => {
  console.error('[Fruition Dev Server Error]', err.message);
});

process.on('uncaughtException', (err) => {
  console.error('[Dev Server Uncaught Exception]', err.message);
});

server.listen(PORT, () => {
  const themeUrl = `http://localhost:${PORT}/theme`;
  const adminUrl = `http://localhost:${PORT}/admin`;
  console.log(`[Fruition Dev Server] Running at: http://localhost:${PORT}`);
  console.log(`  -> Theme Preview: ${themeUrl}`);
  console.log(`  -> Admin Shell:   ${adminUrl}`);

  // Auto open browser on Windows (guarded)
  try {
    exec(`start ${themeUrl}`, () => {});
  } catch (e) {}
});
