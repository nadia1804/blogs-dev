/**
 * Fruition Mini - Schema Definitions
 * 
 * Sesuai arsitektur:
 * - 1 Fruit === 1 Notion Database.
 * - Informasi & Metadata Konten Wajib Core:
 *   1. Judul Post / Page (Title / Name)
 *   2. URL Slug (Permalink)
 *   3. Artikel / Konten (Notion Blocks)
 *   (Relasi Authors khusus post_type)
 * 
 * - Property lain seperti Category, Tags, Meta Description, Date, Published dsb.
 *   adalah property database Notion yang dideteksi secara dinamis.
 */

export const CORE_POST_PROPERTIES = [
  { key: 'title', label: 'Judul Post', notionType: 'title', required: true, mappedTo: 'Title' },
  { key: 'slug', label: 'URL Slug (Permalink)', notionType: 'rich_text', required: true, mappedTo: 'Slug' },
  { key: 'content', label: 'Artikel (Notion Blocks)', notionType: 'blocks', required: true, mappedTo: 'Content' },
  { key: 'authors', label: 'Authors (Relation)', notionType: 'relation', required: false, mappedTo: 'Authors' }
];

export const CORE_PAGE_PROPERTIES = [
  { key: 'title', label: 'Judul Page', notionType: 'title', required: true, mappedTo: 'Title' },
  { key: 'slug', label: 'URL Slug (Permalink)', notionType: 'rich_text', required: true, mappedTo: 'Slug' },
  { key: 'content', label: 'Artikel (Notion Blocks)', notionType: 'blocks', required: true, mappedTo: 'Content' }
];

export const CORE_AUTHOR_PROPERTIES = [
  { key: 'name', label: 'Nama Penulis (Title)', notionType: 'title', required: true, mappedTo: 'Name' },
  { key: 'bio', label: 'Bio Penulis', notionType: 'rich_text', required: false, mappedTo: 'Bio' },
  { key: 'pic', label: 'Foto Profil (Pic)', notionType: 'files', required: false, mappedTo: 'Pic' },
  { key: 'role', label: 'Role / Keahlian', notionType: 'multi_select', required: false, mappedTo: 'Role' }
];

// Compatibility exports
export const POST_SCHEMA_PROPERTIES = CORE_POST_PROPERTIES;
export const PAGE_SCHEMA_PROPERTIES = CORE_PAGE_PROPERTIES;
export const AUTHOR_SCHEMA_PROPERTIES = CORE_AUTHOR_PROPERTIES;
