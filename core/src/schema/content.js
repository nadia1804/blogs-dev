import { z } from 'zod';
import { id, slug, timestamp, pastel, imageRef, seo, schemaMarkup, block } from './common.js';

const base = {
  id,
  slug,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const publishable = {
  title: z.string().max(200).default(''),
  status: z.enum(['draft', 'scheduled', 'published']).default('draft'),
  scheduledAt: timestamp.nullable().default(null), // dipakai saat status 'scheduled'
  excerpt: z.string().max(500).default(''),
  cover: imageRef.nullable().default(null),
  content: z.array(block).default([]),
  seo,
  schema: schemaMarkup,
  publishedAt: timestamp.nullable().default(null),
};

export const post = z.object({
  ...base,
  ...publishable,
  type: slug, // id post type
  categoryIds: z.array(id).default([]), // kategori terisolasi per post type
  authorIds: z.array(id).default([]), // author lintas post type
  tags: z.array(z.string()).default([]),
});

export const page = z.object({
  ...base,
  ...publishable,
});

export const category = z.object({
  ...base,
  postType: slug,
  name: z.string().min(1).max(80),
  description: z.string().max(300).default(''),
  color: pastel.default('sky'),
  parentId: id.nullable().default(null),
  seo,
});

export const author = z.object({
  ...base,
  name: z.string().min(1).max(80),
  bio: z.string().max(600).default(''),
  avatar: imageRef.nullable().default(null),
  links: z
    .array(z.object({ label: z.string(), url: z.url() }))
    .default([]),
  seo,
});

// Tujuan item menu. Konten dirujuk lewat ID, bukan URL, supaya menu
// tidak putus saat slug diganti. Builder yang menerjemahkannya ke URL.
const navTarget = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('home') }),
  z.object({ kind: z.literal('url'), url: z.string().min(1), newTab: z.boolean().default(false) }),
  z.object({ kind: z.literal('postType'), postType: slug }),
  z.object({ kind: z.literal('post'), postType: slug, id }),
  z.object({ kind: z.literal('category'), postType: slug, id }),
  z.object({ kind: z.literal('page'), id }),
]);

const navLeaf = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(60),
  icon: z.string().default(''), // nama ikon Lucide, kosong = tanpa ikon
  target: navTarget,
});

// Menu situs (header, footer, ...). Submenu dibatasi satu tingkat.
export const navigation = z.object({
  id: slug,
  label: z.string().min(1).max(40),
  items: z.array(navLeaf.extend({ children: z.array(navLeaf).default([]) })).default([]),
  createdAt: timestamp,
  updatedAt: timestamp,
});

// Post type memakai slug sebagai ID, karena ID-nya menjadi nama folder dan dasar URL.
export const postType = z.object({
  id: slug,
  label: z.string().min(1).max(40),
  labelPlural: z.string().max(40).default(''),
  icon: z.string().default('file-text'), // nama ikon Lucide
  system: z.boolean().default(false),
  defaultSchema: z.string().default('Article'),
  fallbackColors: z.array(pastel).min(1).default(['sky', 'mint', 'lavender']),
  createdAt: timestamp,
  updatedAt: timestamp,
});
