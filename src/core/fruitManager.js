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
}
