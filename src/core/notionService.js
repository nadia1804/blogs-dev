import { Client } from '@notionhq/client';

export class NotionService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.client = new Client({ auth: apiKey });
  }

  /**
   * Mengambil metadata database Notion dan skema propertinya
   */
  async getDatabaseInfo(databaseId) {
    const cleanId = databaseId.replace(/-/g, '');
    const db = await this.client.databases.retrieve({ database_id: cleanId });

    let title = 'Untitled Database';
    if (Array.isArray(db.title)) {
      title = db.title.map(t => t.plain_text).join('') || 'Untitled Database';
    }

    let properties = {};
    let dataSourceId = null;

    // SDK 2026+: Database memiliki data_sources
    if (Array.isArray(db.data_sources) && db.data_sources.length > 0) {
      dataSourceId = db.data_sources[0].id;
      const ds = await this.client.dataSources.retrieve({ data_source_id: dataSourceId });
      properties = ds.properties || {};
    } else if (db.properties) {
      // Legacy Notion DB properties
      properties = db.properties;
    }

    return {
      id: db.id,
      title,
      dataSourceId,
      properties
    };
  }

  /**
   * Mengambil semua row / halaman dari database Notion
   */
  async queryDatabaseItems(databaseId, pageSize = 50) {
    const cleanId = databaseId.replace(/-/g, '');
    const dbInfo = await this.getDatabaseInfo(cleanId);

    let results = [];

    if (dbInfo.dataSourceId && this.client.dataSources?.query) {
      const resp = await this.client.dataSources.query({
        data_source_id: dbInfo.dataSourceId,
        page_size: pageSize
      });
      results = resp.results || [];
    } else if (this.client.databases?.query) {
      const resp = await this.client.databases.query({
        database_id: cleanId,
        page_size: pageSize
      });
      results = resp.results || [];
    }

    // Normalisasi setiap baris data halaman
    const normalizedRows = results.map(row => this.normalizePageProperties(row));
    return {
      dbInfo,
      rows: normalizedRows,
      rawPages: results
    };
  }

  /**
   * Menormalisasi objek properti halaman Notion ke bentuk data bersih
   */
  normalizePageProperties(page) {
    const props = page.properties || {};
    const normalized = {
      id: page.id,
      url: page.url,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
      properties: {}
    };

    for (const [key, prop] of Object.entries(props)) {
      const type = prop.type;
      let val = null;

      switch (type) {
        case 'title':
          val = prop.title?.map(t => t.plain_text).join('') || '';
          break;
        case 'rich_text':
          val = prop.rich_text?.map(t => t.plain_text).join('') || '';
          break;
        case 'date':
          val = prop.date?.start || '';
          break;
        case 'checkbox':
          val = prop.checkbox ?? false;
          break;
        case 'select':
          val = prop.select?.name || '';
          break;
        case 'multi_select':
          val = prop.multi_select?.map(s => s.name) || [];
          break;
        case 'files':
          val = prop.files?.map(f => f.file?.url || f.external?.url || f.name) || [];
          break;
        case 'relation':
          val = prop.relation?.map(r => r.id) || [];
          break;
        default:
          val = prop[type] ?? null;
      }

      normalized.properties[key] = {
        type,
        value: val,
        raw: prop
      };
    }

    return normalized;
  }

  /**
   * Mengambil blok konten dari halaman secara rekursif (nested block children)
   */
  async fetchBlocksRecursive(blockId) {
    const blocks = [];
    let cursor = undefined;

    while (true) {
      const resp = await this.client.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100
      });

      for (const block of resp.results) {
        // Ambil nested children jika ada
        if (block.has_children) {
          block.children = await this.fetchBlocksRecursive(block.id);
        }
        blocks.push(block);
      }

      if (!resp.has_more) break;
      cursor = resp.next_cursor;
    }

    return blocks;
  }
}
