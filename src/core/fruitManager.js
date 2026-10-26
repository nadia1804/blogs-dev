import fs from 'node:fs/promises';
import path from 'node:path';
import { NotionService } from './notionService.js';
import { BlockTransformer } from './blockTransformer.js';
import { CORE_POST_PROPERTIES, CORE_PAGE_PROPERTIES, CORE_AUTHOR_PROPERTIES } from './schema.js';

export class FruitManager {
  constructor(baseDir = process.cwd()) {
    this.baseDir = baseDir;
    this.fruitsDir = path.join(this.baseDir, 'fruits');
  }

  async ensureFruitsDirectory() {
    await fs.mkdir(this.fruitsDir, { recursive: true });
  }

  slugify(text) {
    return (text || '')
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  async getFruitOrder() {
    try {
      const orderPath = path.join(this.fruitsDir, '.order.json');
      const content = await fs.readFile(orderPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  async saveFruitOrder(order = []) {
    await this.ensureFruitsDirectory();
    const orderPath = path.join(this.fruitsDir, '.order.json');
    await fs.writeFile(orderPath, JSON.stringify(order, null, 2), 'utf8');
    return order;
  }

  async listFruits() {
    await this.ensureFruitsDirectory();
    const entries = await fs.readdir(this.fruitsDir, { withFileTypes: true });
    const fruits = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const configPath = path.join(this.fruitsDir, entry.name, '.fruit', 'fruit.config.json');
        try {
          const content = await fs.readFile(configPath, 'utf8');
          const config = JSON.parse(content);
          
          let itemsCount = 0;
          try {
            const itemsPath = path.join(this.fruitsDir, entry.name, 'content', 'items.json');
            const itemsContent = await fs.readFile(itemsPath, 'utf8');
            itemsCount = JSON.parse(itemsContent).length;
          } catch {
            itemsCount = 0;
          }

          fruits.push({
            name: entry.name,
            path: path.join(this.fruitsDir, entry.name),
            config,
            itemsCount
          });
        } catch {
          // Folder non-fruit dilewati
        }
      }
    }

    const order = await this.getFruitOrder();
    if (Array.isArray(order) && order.length > 0) {
      fruits.sort((a, b) => {
        const idxA = order.indexOf(a.name);
        const idxB = order.indexOf(b.name);
        if (idxA === -1 && idxB === -1) return a.name.localeCompare(b.name);
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }

    return fruits;
  }

  /**
   * Otomatis mendeteksi pemetaan kolom Notion ke Core Fields
   */
  autoDetectColumnMapping(discoveredProps = [], targetType = 'post') {
    const mapping = {
      title: '',
      slug: '_auto_slug_',
      authors: '_none_',
      date: '_auto_created_',
      published: '_always_published_',
      meta_description: '_none_',
      og: '_none_',
      bio: '_none_',
      role: '_none_',
      pic: '_none_'
    };

    // 1. Title / Name: Setiap database Notion PASTI memiliki tepat satu properti bertipe 'title'
    const titleCol = discoveredProps.find(p => p.type === 'title');
    if (titleCol) {
      mapping.title = titleCol.key;
    }

    // 2. Slug: cari yang bernama 'slug', 'permalink', atau 'url'
    const slugCol = discoveredProps.find(p => /^slug$|^permalink$|^url$/i.test(p.key));
    if (slugCol) {
      mapping.slug = slugCol.key;
    } else {
      mapping.slug = '_auto_slug_'; // Dibuat otomatis dari title via slugify
    }

    // 3. Authors: cari bertipe 'relation' atau bernama author
    const authorCol = discoveredProps.find(p => p.type === 'relation' || /author|penulis/i.test(p.key));
    if (authorCol) {
      mapping.authors = authorCol.key;
    }

    // 4. Date: cari bertipe 'date' atau bernama date / tanggal
    const dateCol = discoveredProps.find(p => p.type === 'date' || /date|tanggal|publish/i.test(p.key));
    if (dateCol) {
      mapping.date = dateCol.key;
    }

    // 5. Published: cari bertipe 'checkbox' atau bernama status/published
    const pubCol = discoveredProps.find(p => p.type === 'checkbox' || /^publish|^status/i.test(p.key));
    if (pubCol) {
      mapping.published = pubCol.key;
    }

    // 6. Meta Description: cari bernama meta, description, ringkasan, atau tp
    const metaCol = discoveredProps.find(p => /meta.*desc|description|ringkasan|summary|^tp$/i.test(p.key));
    if (metaCol) {
      mapping.meta_description = metaCol.key;
    }

    // 7. OG / Cover: cari bertipe 'files' atau bernama og, cover, thumbnail, media, foto
    const ogCol = discoveredProps.find(p => p.type === 'files' || /og|cover|thumbnail|file|media|gambar/i.test(p.key));
    if (ogCol) {
      mapping.og = ogCol.key;
    }

    // Khusus Authors target
    if (targetType === 'authors') {
      const bioCol = discoveredProps.find(p => /bio|tentang|about/i.test(p.key));
      if (bioCol) mapping.bio = bioCol.key;

      const roleCol = discoveredProps.find(p => /role|jabatan|profesi/i.test(p.key));
      if (roleCol) mapping.role = roleCol.key;

      const picCol = discoveredProps.find(p => p.type === 'files' || /pic|foto|avatar|image/i.test(p.key));
      if (picCol) mapping.pic = picCol.key;
    }

    return mapping;
  }

  /**
   * Mengambil nilai core fields dari sebuah item Notion berdasarkan mapping kolom aktif
   */
  resolveItemCoreFields(item, columnsMapping = {}) {
    const props = item?.properties || {};

    // 1. Title / Name:
    let title = '';
    if (columnsMapping?.title && props[columnsMapping.title]) {
      title = props[columnsMapping.title].value || '';
    }
    if (!title) {
      // Auto-fallback: cari property apapun yang bertipe 'title'
      const titleProp = Object.values(props).find(p => p.type === 'title');
      title = titleProp?.value || '';
    }
    if (!title) {
      title = props.Nama?.value || props.Title?.value || props.Name?.value || 'Untitled';
    }

    // 2. Slug:
    let slug = '';
    if (columnsMapping?.slug && columnsMapping.slug !== '_auto_slug_' && props[columnsMapping.slug]) {
      slug = props[columnsMapping.slug].value || '';
    }
    if (!slug) {
      slug = this.slugify(title);
    }
    if (slug && !slug.startsWith('/')) {
      slug = '/' + slug;
    }

    // 3. Authors:
    let authors = [];
    if (columnsMapping?.authors && columnsMapping.authors !== '_none_' && props[columnsMapping.authors]) {
      const val = props[columnsMapping.authors].value;
      authors = Array.isArray(val) ? val : (val ? [val] : []);
    } else if (!columnsMapping?.authors) {
      const relProp = Object.values(props).find(p => p.type === 'relation');
      authors = relProp?.value || [];
    }

    // 4. Date:
    let date = '';
    if (columnsMapping?.date && columnsMapping.date !== '_auto_created_' && props[columnsMapping.date]) {
      date = props[columnsMapping.date].value || '';
    } else if (!columnsMapping?.date) {
      const dateProp = Object.values(props).find(p => p.type === 'date');
      date = dateProp?.value || '';
    }
    if (!date && item?.createdTime) {
      date = item.createdTime.split('T')[0];
    }

    // 5. Published:
    let published = true;
    if (columnsMapping?.published && columnsMapping.published !== '_always_published_' && props[columnsMapping.published]) {
      published = Boolean(props[columnsMapping.published].value);
    } else if (!columnsMapping?.published) {
      const chkProp = Object.values(props).find(p => p.type === 'checkbox');
      if (chkProp) published = Boolean(chkProp.value);
      else published = true;
    }

    // 6. Meta Description:
    let meta_description = '';
    if (columnsMapping?.meta_description && columnsMapping.meta_description !== '_none_' && props[columnsMapping.meta_description]) {
      meta_description = props[columnsMapping.meta_description].value || '';
    } else if (!columnsMapping?.meta_description) {
      const metaKey = Object.keys(props).find(k => /meta.*desc|ringkasan|summary|^tp$/i.test(k));
      if (metaKey) meta_description = props[metaKey].value || '';
    }

    // 7. OG / Cover:
    let og = [];
    if (columnsMapping?.og && columnsMapping.og !== '_none_' && props[columnsMapping.og]) {
      const val = props[columnsMapping.og].value;
      og = Array.isArray(val) ? val : (val ? [val] : []);
    } else if (!columnsMapping?.og) {
      const fileProp = Object.values(props).find(p => p.type === 'files');
      og = fileProp?.value || [];
    }

    // 8. Authors fields:
    let bio = '';
    if (columnsMapping?.bio && columnsMapping.bio !== '_none_' && props[columnsMapping.bio]) {
      bio = props[columnsMapping.bio].value || '';
    } else {
      const bioKey = Object.keys(props).find(k => /bio|tentang|about/i.test(k));
      if (bioKey) bio = props[bioKey].value || '';
    }

    let role = '';
    if (columnsMapping?.role && columnsMapping.role !== '_none_' && props[columnsMapping.role]) {
      role = props[columnsMapping.role].value || '';
    } else {
      const roleKey = Object.keys(props).find(k => /role|jabatan|profesi/i.test(k));
      if (roleKey) role = props[roleKey].value || '';
    }

    let pic = '';
    if (columnsMapping?.pic && columnsMapping.pic !== '_none_' && props[columnsMapping.pic]) {
      const pVal = props[columnsMapping.pic].value;
      pic = Array.isArray(pVal) ? pVal[0] : (pVal || '');
    } else {
      const picKey = Object.keys(props).find(k => /pic|foto|avatar|image/i.test(k));
      if (picKey) {
        const pVal = props[picKey].value;
        pic = Array.isArray(pVal) ? pVal[0] : (pVal || '');
      }
    }

    return {
      title,
      slug,
      authors,
      date,
      published,
      meta_description,
      og,
      bio,
      role,
      pic
    };
  }

  async createFruit(name, options = {}) {
    await this.ensureFruitsDirectory();
    const safeName = this.slugify(name) || 'fruit-' + Date.now();
    const fruitPath = path.join(this.fruitsDir, safeName);
    const targetType = options.targetType || 'post';

    await fs.mkdir(path.join(fruitPath, '.fruit'), { recursive: true });
    await fs.mkdir(path.join(fruitPath, 'content', 'blocks'), { recursive: true });
    await fs.mkdir(path.join(fruitPath, 'dist'), { recursive: true });

    const initialConfig = {
      name: safeName,
      targetType,
      notion: {
        apiKey: options.apiKey || '',
        databaseId: options.databaseId || '',
        databaseTitle: ''
      },
      mapping: {
        columns: {},
        discovered: [],
        required: targetType === 'authors' ? CORE_AUTHOR_PROPERTIES : (targetType === 'page' ? CORE_PAGE_PROPERTIES : CORE_POST_PROPERTIES)
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSyncAt: null
    };

    await fs.writeFile(
      path.join(fruitPath, '.fruit', 'fruit.config.json'),
      JSON.stringify(initialConfig, null, 2),
      'utf8'
    );

    await fs.writeFile(
      path.join(fruitPath, 'content', 'items.json'),
      JSON.stringify([], null, 2),
      'utf8'
    );

    return {
      name: safeName,
      path: fruitPath,
      config: initialConfig
    };
  }

  async loadFruit(name) {
    const fruitPath = path.join(this.fruitsDir, name);
    const configPath = path.join(fruitPath, '.fruit', 'fruit.config.json');
    const itemsPath = path.join(fruitPath, 'content', 'items.json');

    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    let items = [];
    try {
      items = JSON.parse(await fs.readFile(itemsPath, 'utf8'));
    } catch { items = []; }

    // Jika mapping columns belum lengkap tapi sudah ada discovered, lakukan auto-detect
    if ((!config.mapping?.columns || Object.keys(config.mapping.columns).length === 0) && config.mapping?.discovered?.length > 0) {
      config.mapping.columns = this.autoDetectColumnMapping(config.mapping.discovered, config.targetType);
    }

    return {
      name,
      path: fruitPath,
      config,
      items
    };
  }

  async updateFruitConfig(name, partialConfig) {
    const fruit = await this.loadFruit(name);
    const updated = {
      ...fruit.config,
      ...partialConfig,
      notion: {
        ...fruit.config.notion,
        ...(partialConfig.notion || {})
      },
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(
      path.join(fruit.path, '.fruit', 'fruit.config.json'),
      JSON.stringify(updated, null, 2),
      'utf8'
    );
    return updated;
  }

  /**
   * Menyimpan pemetaan kolom yang diatur user (intervensi manual)
   */
  async updateFruitMapping(name, columns) {
    const fruit = await this.loadFruit(name);
    if (!fruit.config.mapping) fruit.config.mapping = {};
    fruit.config.mapping.columns = {
      ...(fruit.config.mapping.columns || {}),
      ...columns
    };
    fruit.config.updatedAt = new Date().toISOString();

    await fs.writeFile(
      path.join(fruit.path, '.fruit', 'fruit.config.json'),
      JSON.stringify(fruit.config, null, 2),
      'utf8'
    );
    return fruit.config;
  }

  async deleteFruit(name) {
    const safeName = this.slugify(name);
    const fruitPath = path.join(this.fruitsDir, safeName);
    await fs.rm(fruitPath, { recursive: true, force: true });
    return true;
  }

  async deleteFruitItem(fruitName, itemId) {
    const fruit = await this.loadFruit(fruitName);
    fruit.items = (fruit.items || []).filter(item => item.id !== itemId);

    await fs.writeFile(
      path.join(fruit.path, 'content', 'items.json'),
      JSON.stringify(fruit.items, null, 2),
      'utf8'
    );

    try { await fs.rm(path.join(fruit.path, 'content', 'blocks', `${itemId}.json`), { force: true }); } catch {}
    try { await fs.rm(path.join(fruit.path, 'dist', `${itemId}.html`), { force: true }); } catch {}

    await this.rebuildAuthorProfilePages();
    return true;
  }

  async getAllAuthors() {
    try {
      const authorsFruit = await this.loadFruit('authors');
      const cols = authorsFruit.config?.mapping?.columns || {};
      return (authorsFruit.items || []).map(row => {
        const core = this.resolveItemCoreFields(row, cols);
        return {
          id: row.id,
          name: core.title || 'Author',
          bio: core.bio,
          role: Array.isArray(core.role) ? core.role.join(', ') : (core.role || ''),
          pic: core.pic
        };
      });
    } catch {
      return [];
    }
  }

  async getAllPosts() {
    const fruits = await this.listFruits();
    const allPosts = [];

    for (const f of fruits) {
      if (f.config?.targetType !== 'authors') {
        try {
          const loaded = await this.loadFruit(f.name);
          for (const item of (loaded.items || [])) {
            allPosts.push({
              ...item,
              fruitName: f.name
            });
          }
        } catch {}
      }
    }
    return allPosts;
  }

  async rebuildAuthorProfilePages() {
    try {
      const authorsFruit = await this.loadFruit('authors');
      await fs.mkdir(path.join(authorsFruit.path, 'dist'), { recursive: true });
      const allPosts = await this.getAllPosts();
      const cols = authorsFruit.config?.mapping?.columns || {};

      for (const row of (authorsFruit.items || [])) {
        const core = this.resolveItemCoreFields(row, cols);
        const authorObj = {
          id: row.id,
          name: core.title || 'Author',
          bio: core.bio,
          role: Array.isArray(core.role) ? core.role.join(', ') : (core.role || ''),
          pic: core.pic
        };

        const authorPosts = allPosts.filter(post => {
          const authorIds = post.properties?.Authors?.value || post.properties?.[cols.authors]?.value || [];
          return Array.isArray(authorIds) && authorIds.includes(row.id);
        });

        const html = BlockTransformer.renderAuthorProfilePageHtml(authorObj, authorPosts);
        await fs.writeFile(
          path.join(authorsFruit.path, 'dist', `${row.id}.html`),
          html,
          'utf8'
        );
      }
    } catch {
      // Abaikan jika authors belum dibuat
    }
  }

  /**
   * Mengompilasi ulang seluruh file HTML pada Fruit berdasarkan mapping kolom aktif
   */
  async rebuildFruitHtml(fruitName) {
    const fruit = await this.loadFruit(fruitName);
    await fs.mkdir(path.join(fruit.path, 'dist'), { recursive: true });
    const cols = fruit.config?.mapping?.columns || {};
    const authors = await this.getAllAuthors();

    if (fruit.config.targetType === 'authors') {
      await this.rebuildAuthorProfilePages();
      return;
    }

    for (const item of (fruit.items || [])) {
      try {
        let blocks = [];
        try {
          const blocksFile = await fs.readFile(path.join(fruit.path, 'content', 'blocks', `${item.id}.json`), 'utf8');
          blocks = JSON.parse(blocksFile);
        } catch {
          blocks = [];
        }

        const core = this.resolveItemCoreFields(item, cols);
        const metadata = {
          date: core.date,
          category: item.properties?.mapel?.value || item.properties?.Category?.value || '',
          meta_description: core.meta_description,
          authors: core.authors
        };

        const html = BlockTransformer.renderDocumentHtml(core.title, metadata, blocks, authors);
        await fs.writeFile(
          path.join(fruit.path, 'dist', `${item.id}.html`),
          html,
          'utf8'
        );
      } catch (err) {
        console.error(`Gagal rebuild HTML ${item.id}:`, err.message);
      }
    }

    await this.rebuildAuthorProfilePages();
  }

  /**
   * Tarik data dari database Notion dan simpan ke lokal Fruit
   */
  async syncFruitFromNotion(name) {
    const fruit = await this.loadFruit(name);
    const { apiKey, databaseId } = fruit.config.notion;

    if (!apiKey || !databaseId) {
      throw new Error(`Fruit ${name} belum memiliki API Key atau Database ID Notion.`);
    }

    const service = new NotionService(apiKey);
    const { dbInfo, rows, rawPages } = await service.queryDatabaseItems(databaseId);

    // Ambil authors terhubung
    const authors = await this.getAllAuthors();

    // Simpan judul database Notion
    fruit.config.notion.databaseTitle = dbInfo.title;
    fruit.config.lastSyncAt = new Date().toISOString();

    // Auto-detect custom properties
    const discoveredProps = Object.keys(dbInfo.properties).map(k => ({
      key: k,
      type: dbInfo.properties[k].type
    }));

    fruit.config.mapping.discovered = discoveredProps;

    // Otomatis deteksi mapping kolom jika belum diatur secara manual oleh user
    const autoCols = this.autoDetectColumnMapping(discoveredProps, fruit.config.targetType);
    fruit.config.mapping.columns = {
      ...autoCols,
      ...(fruit.config.mapping.columns || {})
    };

    await fs.writeFile(
      path.join(fruit.path, '.fruit', 'fruit.config.json'),
      JSON.stringify(fruit.config, null, 2),
      'utf8'
    );

    // Simpan rows yang ditarik ke content/items.json
    await fs.mkdir(path.join(fruit.path, 'content', 'blocks'), { recursive: true });
    await fs.mkdir(path.join(fruit.path, 'dist'), { recursive: true });
    await fs.writeFile(
      path.join(fruit.path, 'content', 'items.json'),
      JSON.stringify(rows, null, 2),
      'utf8'
    );

    // Jika targetType adalah authors, hasilkan halaman profil khusus author
    if (fruit.config.targetType === 'authors') {
      const allPosts = await this.getAllPosts();
      for (const row of rows) {
        const core = this.resolveItemCoreFields(row, fruit.config.mapping.columns);
        const authorObj = {
          id: row.id,
          name: core.title || 'Author',
          bio: core.bio,
          role: Array.isArray(core.role) ? core.role.join(', ') : (core.role || ''),
          pic: core.pic
        };

        const authorPosts = allPosts.filter(post => {
          const authorIds = post.properties?.Authors?.value || [];
          return Array.isArray(authorIds) && authorIds.includes(row.id);
        });

        const html = BlockTransformer.renderAuthorProfilePageHtml(authorObj, authorPosts);
        await fs.writeFile(
          path.join(fruit.path, 'dist', `${row.id}.html`),
          html,
          'utf8'
        );
      }
    } else {
      // Tarik recursive blocks untuk setiap page dan kompilasi static HTML
      for (const page of rawPages) {
        try {
          const blocks = await service.fetchBlocksRecursive(page.id);
          await fs.writeFile(
            path.join(fruit.path, 'content', 'blocks', `${page.id}.json`),
            JSON.stringify(blocks, null, 2),
            'utf8'
          );

          const norm = service.normalizePageProperties(page);
          const core = this.resolveItemCoreFields(norm, fruit.config.mapping.columns);
          const metadata = {
            date: core.date,
            category: norm.properties?.mapel?.value || norm.properties?.Category?.value || '',
            meta_description: core.meta_description,
            authors: core.authors
          };

          const html = BlockTransformer.renderDocumentHtml(core.title, metadata, blocks, authors);
          await fs.writeFile(
            path.join(fruit.path, 'dist', `${page.id}.html`),
            html,
            'utf8'
          );
        } catch (err) {
          console.error(`Gagal menarik blok untuk halaman ${page.id}:`, err.message);
        }
      }

      await this.rebuildAuthorProfilePages();
    }

    return {
      dbInfo,
      count: rows.length,
      rows
    };
  }

  /**
   * Tarik data untuk seluruh Fruit secara sekaligus dari Notion
   */
  async syncAllFruitsFromNotion() {
    const fruits = await this.listFruits();
    // Prioritaskan fruit bertipe 'authors' terlebih dahulu agar relasi penulis pada post langsung sinkron
    const sortedFruits = [...fruits].sort((a, b) => {
      if (a.config?.targetType === 'authors') return -1;
      if (b.config?.targetType === 'authors') return 1;
      return 0;
    });

    const results = [];
    for (const f of sortedFruits) {
      if (f.config?.notion?.apiKey && f.config?.notion?.databaseId) {
        try {
          const res = await this.syncFruitFromNotion(f.name);
          results.push({ name: f.name, success: true, count: res.count });
        } catch (err) {
          console.error(`Gagal menarik data untuk fruit ${f.name}:`, err.message);
          results.push({ name: f.name, success: false, error: err.message });
        }
      }
    }

    await this.rebuildAuthorProfilePages();
    return results;
  }

  /**
   * Menghasilkan file index.html (Homepage / Beranda) lengkap berdasarkan tema aktif
   */
  async buildHomepageHtml(customSettings = null) {
    let settings = customSettings;
    if (!settings) {
      try {
        const themeData = JSON.parse(await fs.readFile(path.join(this.baseDir, 'themes', 'capsule', 'theme.json'), 'utf8'));
        settings = themeData?.settings || {};
      } catch {
        settings = {};
      }
    }

    const fruits = await this.listFruits();
    const authors = await this.getAllAuthors();

    // Tentukan sumber artikel
    const sourceFruit = settings.postCardFruitSource || 'all';
    let targetFruits = fruits.filter(f => f.config?.targetType === 'post');
    if (sourceFruit !== 'all') {
      targetFruits = targetFruits.filter(f => f.name.toLowerCase() === sourceFruit.toLowerCase());
    }

    const allPosts = [];
    for (const f of targetFruits) {
      const loaded = await this.loadFruit(f.name).catch(() => null);
      if (!loaded || !loaded.items) continue;
      const cols = loaded.config?.mapping?.columns || {};

      for (const item of loaded.items) {
        const core = this.resolveItemCoreFields(item, cols);
        if (core.published === false) continue;

        let authorObj = null;
        if (core.authors && core.authors.length > 0) {
          authorObj = authors.find(a => a.id === core.authors[0]);
        }

        const categoryVal = item.properties?.mapel?.value ||
          item.properties?.Category?.value ||
          item.properties?.Kategori?.value ||
          f.name.toUpperCase();

        allPosts.push({
          id: item.id,
          fruitName: f.name,
          title: core.title || 'Tanpa Judul',
          slug: core.slug || ('/' + item.id),
          date: typeof core.date === 'string' ? core.date : '',
          category: categoryVal,
          excerpt: core.meta_description || '',
          cover: (core.og && core.og[0]) ? core.og[0] : '',
          author: authorObj ? {
            name: authorObj.title || 'Penulis',
            pic: (authorObj.og && authorObj.og[0]) || authorObj.pic || ''
          } : null,
          url: `/preview?fruit=${encodeURIComponent(f.name)}&pageId=${encodeURIComponent(item.id)}`,
          staticUrl: `/fruits/${encodeURIComponent(f.name)}/dist/${encodeURIComponent(item.id)}.html`
        });
      }
    }

    // Variabel konfigurasi tema
    const primary = settings.primaryColor || '#059669';
    const bg = settings.bgColor || '#f8fafc';
    const font = settings.fontFamily || 'Plus Jakarta Sans';
    const brandText = settings.navBrandText || 'blogs';
    const brandLogoImg = settings.navBrandLogoImage || '';
    const brandLogo = settings.navBrandLogo || 'B';
    const navSticky = settings.navSticky !== false;
    const navStyle = settings.navStyle || 'capsule-floating';
    const isPillNav = navStyle === 'capsule-floating';
    const isMinimalNav = navStyle === 'minimal';

    // Hero Config
    const showHero = settings.showHero !== false;
    const heroAlign = settings.heroAlign || 'center';
    const heroBadge = settings.heroBadge || '✨ Selamat Datang di Blogs';
    const heroTitle = settings.heroTitle || 'Catatan, Cerita & Wawasan Terkurasi';
    const heroSubtitle = settings.heroSubtitle || 'Eksplorasi artikel mendalam seputar teknologi, tutorial, dan catatan penulis pilihan.';
    const heroCtaText = settings.heroCtaText || 'Mulai Membaca 🚀';
    const heroCtaUrl = settings.heroCtaUrl || '#posts';
    const heroSecText = settings.heroSecondaryCtaText || 'Tentang Kami';
    const heroSecUrl = settings.heroSecondaryCtaUrl || '/page';

    // Post Card Config
    const cardLayout = settings.postCardLayout || 'grid-3';
    const cardRadius = settings.postCardRadius || '20px';
    const showCover = settings.showCardCover !== false;
    const showCat = settings.showCardCategory !== false;
    const showDate = settings.showCardDate !== false;
    const showAuthor = settings.showCardAuthor !== false;
    const showExcerpt = settings.showCardExcerpt !== false;

    // Render Navigation
    const navItems = Array.isArray(settings.navItems) && settings.navItems.length > 0
      ? settings.navItems.filter(it => it.enabled !== false)
      : [
          { label: 'Home', url: '/', icon: 'home', enabled: true },
          { label: 'Read', url: '/read', icon: 'book-open', enabled: true },
          { label: 'Pelajaran', url: '/pelajaran', icon: 'graduation-cap', enabled: true },
          { label: 'Authors', url: '/authors', icon: 'users', enabled: true },
          { label: 'About', url: '/page', icon: 'info', enabled: true }
        ];

    const navLinksHtml = navItems.map(item => {
      const rawUrl = (item.url || '/').trim();
      const isActive = rawUrl === '/' || rawUrl === '/index.html';
      const iconTag = item.icon ? `<i data-lucide="${item.icon}" style="width: 14px; height: 14px; margin-right: 6px; vertical-align: -2px; display: inline-block;"></i>` : '';
      let targetHref = rawUrl;
      if (rawUrl === '/') targetHref = '/preview?page=home';
      else {
        const cleanSlug = rawUrl.replace(/^\//, '').toLowerCase();
        const matched = fruits.find(f => f.name.toLowerCase() === cleanSlug);
        if (matched) {
          targetHref = `/preview?fruit=${encodeURIComponent(matched.name)}`;
        }
      }

      return `
        <a href="${targetHref}" class="capsule-nav-link ${isActive ? 'active' : ''}" style="text-decoration: none; font-size: 13px; font-weight: ${isActive ? '700' : '600'}; padding: 6px 14px; border-radius: 999px; transition: all 0.15s; display: inline-flex; align-items: center; ${isActive ? `background: ${primary}; color: #ffffff;` : 'color: #334155;'}">
          ${iconTag}
          <span>${item.label || 'Menu'}</span>
        </a>
      `;
    }).join('');

    const brandLogoHtml = brandLogoImg
      ? `<img src="${brandLogoImg}" alt="${brandText}" style="height: 32px; max-width: 120px; object-fit: contain; vertical-align: middle; border-radius: 4px;" />`
      : `<span style="width: 32px; height: 32px; border-radius: 999px; background: ${primary}; color: #ffffff; font-size: 14px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center;">${brandLogo}</span>`;

    // Render Hero Section
    const heroHtml = showHero ? `
      <section class="capsule-hero-section" style="padding: 56px 20px 48px 20px; text-align: ${heroAlign}; max-width: 860px; margin: 0 auto;">
        ${heroBadge ? `
          <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 999px; font-size: 12px; font-weight: 700; color: ${primary}; box-shadow: 0 2px 6px rgba(0,0,0,0.03); margin-bottom: 20px;">
            <span>${heroBadge}</span>
          </div>
        ` : ''}
        <h1 style="font-size: 42px; font-weight: 800; line-height: 1.2; color: #0f172a; letter-spacing: -0.03em; margin: 0 0 16px 0;">
          ${heroTitle}
        </h1>
        <p style="font-size: 18px; line-height: 1.65; color: #64748b; margin: 0 0 28px 0; max-width: 680px; ${heroAlign === 'center' ? 'margin-left: auto; margin-right: auto;' : ''}">
          ${heroSubtitle}
        </p>
        <div style="display: flex; gap: 12px; ${heroAlign === 'center' ? 'justify-content: center;' : 'justify-content: flex-start;'} flex-wrap: wrap;">
          ${heroCtaText ? `
            <a href="${heroCtaUrl}" style="text-decoration: none; background: ${primary}; color: #ffffff; font-size: 14px; font-weight: 700; padding: 12px 26px; border-radius: 999px; box-shadow: 0 4px 14px rgba(0,0,0,0.1); transition: transform 0.15s, opacity 0.15s; display: inline-flex; align-items: center; gap: 8px;">
              <span>${heroCtaText}</span>
            </a>
          ` : ''}
          ${heroSecText ? `
            <a href="${heroSecUrl}" style="text-decoration: none; background: #ffffff; color: #334155; border: 1px solid #cbd5e1; font-size: 14px; font-weight: 700; padding: 12px 22px; border-radius: 999px; transition: all 0.15s; display: inline-flex; align-items: center; gap: 8px;">
              <span>${heroSecText}</span>
            </a>
          ` : ''}
        </div>
      </section>
    ` : '';

    // Render Post Cards
    let gridTemplate = 'grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));';
    if (cardLayout === 'grid-2') {
      gridTemplate = 'grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));';
    } else if (cardLayout === 'list') {
      gridTemplate = 'grid-template-columns: 1fr;';
    }

    const postCardsHtml = allPosts.map(post => {
      const coverHtml = showCover ? (post.cover ? `
        <div style="position: relative; width: 100%; height: ${cardLayout === 'list' ? '180px' : '200px'}; overflow: hidden; background: #e2e8f0;">
          <img src="${post.cover}" alt="${post.title}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;" class="post-card-img" />
        </div>
      ` : `
        <div style="width: 100%; height: ${cardLayout === 'list' ? '150px' : '150px'}; background: linear-gradient(135deg, ${primary}15, #f1f5f9); display: flex; align-items: center; justify-content: center; color: ${primary}; font-size: 28px;">
          <span>📝</span>
        </div>
      `) : '';

      return `
        <article class="capsule-post-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: ${cardRadius}; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.03); transition: transform 0.2s ease, box-shadow 0.2s ease; display: flex; flex-direction: column;">
          ${coverHtml}
          <div style="padding: 22px; display: flex; flex-direction: column; flex: 1;">
            ${showCat && post.category ? `
              <div style="margin-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: ${primary}18; color: ${primary}; padding: 4px 10px; border-radius: 999px;">
                  ${post.category}
                </span>
              </div>
            ` : ''}
            <h2 style="font-size: 18px; font-weight: 800; line-height: 1.35; margin: 0 0 10px 0; color: #0f172a;">
              <a href="${post.url}" style="text-decoration: none; color: inherit; transition: color 0.15s;" class="post-title-link">
                ${post.title}
              </a>
            </h2>
            ${showExcerpt && post.excerpt ? `
              <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 0 0 16px 0; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                ${post.excerpt}
              </p>
            ` : '<div style="flex: 1;"></div>'}

            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px solid #f1f5f9; padding-top: 14px; font-size: 12px; color: #94a3b8;">
              ${showAuthor && post.author ? `
                <div style="display: flex; align-items: center; gap: 8px;">
                  ${post.author.pic ? `<img src="${post.author.pic}" style="width: 24px; height: 24px; border-radius: 999px; object-fit: cover;" />` : ''}
                  <span style="font-weight: 600; color: #475569;">${post.author.name}</span>
                </div>
              ` : '<div></div>'}
              ${showDate && post.date ? `
                <div style="display: flex; align-items: center; gap: 4px;">
                  <i data-lucide="calendar" style="width: 12px; height: 12px;"></i>
                  <span>${post.date}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');

    const emptyPostsHtml = `
      <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: ${cardRadius}; color: #64748b;">
        <div style="font-size: 32px; margin-bottom: 12px;">📭</div>
        <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Belum ada artikel yang dipublikasikan</div>
        <div style="font-size: 13px;">Tarik data Notion dari menu Fruit untuk menampilkan artikel di beranda.</div>
      </div>
    `;

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandText} • ${heroTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="/assets/lucide.min.js"></script>
  <style>
    :root {
      --primary: ${primary};
      --bg: ${bg};
      --capsule-radius: 999px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      font-family: '${font}', sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .capsule-post-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 28px rgba(0,0,0,0.08) !important;
    }
    .capsule-post-card:hover .post-card-img {
      transform: scale(1.04);
    }
    .capsule-post-card:hover .post-title-link {
      color: var(--primary) !important;
    }
    .capsule-nav-link:hover {
      background: ${primary}15 !important;
      color: ${primary} !important;
    }
  </style>
</head>
<body>
  <!-- Header Navigasi Capsule -->
  <div class="capsule-theme-navbar-wrap" style="${navSticky ? 'position: sticky; top: 16px; z-index: 50;' : ''} max-width: 900px; margin: 16px auto 32px auto; padding: 0 16px;">
    <nav class="capsule-theme-navbar" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 18px; background: ${isMinimalNav ? 'transparent' : 'rgba(255, 255, 255, 0.92)'}; ${navSticky && !isMinimalNav ? 'backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);' : ''} border: ${isMinimalNav ? 'none' : '1px solid #e2e8f0'}; border-radius: ${isPillNav ? 'var(--capsule-radius)' : '12px'}; box-shadow: ${isMinimalNav ? 'none' : '0 4px 16px rgba(0, 0, 0, 0.04)'};">
      <a href="/preview?page=home" style="text-decoration: none; display: flex; align-items: center; gap: 10px;">
        ${brandLogoHtml}
        <span style="font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">${brandText}</span>
      </a>
      <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
        ${navLinksHtml}
      </div>
    </nav>
  </div>

  <!-- Hero Section -->
  ${heroHtml}

  <!-- Post Cards Section -->
  <main id="posts" style="max-width: 1140px; margin: 0 auto; padding: 16px 20px 64px 20px;">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; letter-spacing: -0.02em;">
          Artikel & Tulisan Terbaru
        </h2>
        <div style="font-size: 13px; color: #64748b;">
          Daftar postingan terpilih yang baru saja diperbarui.
        </div>
      </div>
      <span style="font-size: 12px; font-weight: 700; color: ${primary}; background: #ffffff; padding: 5px 12px; border-radius: 999px; border: 1px solid #e2e8f0;">
        ${allPosts.length} Artikel
      </span>
    </div>

    <div style="display: grid; ${gridTemplate} gap: 24px;">
      ${allPosts.length > 0 ? postCardsHtml : emptyPostsHtml}
    </div>
  </main>

  <!-- Footer Capsule -->
  <footer style="border-top: 1px solid #e2e8f0; background: #ffffff; padding: 36px 20px; text-align: center; font-size: 13px; color: #64748b;">
    <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px; font-weight: 800; color: #0f172a;">
      ${brandLogoHtml}
      <span>${brandText}</span>
    </div>
    <div>Dipublikasikan dengan Fruition Mini • Capsule Design Theme</div>
  </footer>

  <script>
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
    document.addEventListener('keydown', function(e) {
      var isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && !e.shiftKey && !e.altKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'FRUITION_SHORTCUT', action: 'toggle-preview' }, '*');
        }
      } else if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS')) {
        e.preventDefault();
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'FRUITION_SHORTCUT', action: 'save' }, '*');
        }
      }
    });
  </script>
</body>
</html>`;

    // Tulis ke dist/index.html dan index.html di root
    await fs.mkdir(path.join(this.baseDir, 'dist'), { recursive: true });
        // Salin library lucide.min.js ke folder dist untuk ekspor statis offline
    try {
      const localLucidePath = path.join(this.baseDir, 'node_modules', 'lucide', 'dist', 'umd', 'lucide.min.js');
      await fs.copyFile(localLucidePath, path.join(this.baseDir, 'dist', 'lucide.min.js'));
    } catch {}
    await fs.writeFile(path.join(this.baseDir, 'dist', 'index.html'), html, 'utf8');
    await fs.writeFile(path.join(this.baseDir, 'index.html'), html, 'utf8');

    return html;
  }

}
