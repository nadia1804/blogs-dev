import { withLock } from './atomic.js';
import { createCollection } from './collection.js';
import { createDrafts } from './drafts.js';
import { createFsAdapter } from './fs-adapter.js';
import { conflict, forbidden, validate } from './errors.js';
import * as schemas from '../schema/index.js';
import { DEFAULT_NAVIGATION } from '../defaults/index.js';

const summarizePublishable = (doc) => ({
  id: doc.id,
  slug: doc.slug,
  title: doc.title,
  status: doc.status,
  excerpt: doc.excerpt,
  cover: doc.cover?.src ?? '',
  updatedAt: doc.updatedAt,
  publishedAt: doc.publishedAt,
  scheduledAt: doc.scheduledAt,
});

const summarizePost = (doc) => ({
  ...summarizePublishable(doc),
  type: doc.type,
  categoryIds: doc.categoryIds,
  authorIds: doc.authorIds,
  tags: doc.tags,
});

const summarizeCategory = ({ id, slug, name, color, parentId, postType, updatedAt }) => ({
  id, slug, name, color, parentId, postType, updatedAt,
});

const summarizePostType = ({ id, label, labelPlural, icon, system, defaultSchema, fallbackColors, updatedAt }) => ({
  id, label, labelPlural, icon, system, defaultSchema, fallbackColors, updatedAt,
});

// Dokumen tunggal (settings.json). Belum ada file = nilai default skema.
function createDocument({ adapter, path, schema }) {
  return {
    async get() {
      return validate(schema, (await adapter.read(path)) ?? {});
    },
    save(data) {
      return withLock(adapter.key(path), async () => {
        const valid = validate(schema, data);
        await adapter.write(path, valid);
        return valid;
      });
    },
  };
}

// Pintu masuk tunggal ke seluruh konten. `adapter` bisa diganti (mis. GitHub).
export function createStore(dataDir, adapter = createFsAdapter(dataDir)) {
  const cache = new Map();
  const collection = (dir, options) => {
    if (!cache.has(dir)) cache.set(dir, createCollection({ adapter, dir, ...options }));
    return cache.get(dir);
  };
  const typeId = (type) => validate(schemas.common.slug, type);
  const drafts = createDrafts(adapter);

  // Post dan kategori terisolasi per post type: masing-masing punya folder sendiri.
  // Draft autosave ikut dihapus bersama dokumennya.
  const posts = (type) => {
    const dir = `posts/${typeId(type)}`;
    return collection(dir, {
      schema: schemas.post,
      label: 'Post',
      fixed: { type },
      summarize: summarizePost,
      afterRemove: (id) => drafts.remove(dir, id),
    });
  };

  // Lepas rujukan ke dokumen yang dihapus dari semua post yang memakainya.
  async function unlinkFromPosts(type, field, removedId) {
    const collectionOfType = posts(type);
    for (const item of await collectionOfType.list()) {
      if (!item[field].includes(removedId)) continue;
      await collectionOfType.update(item.id, { [field]: item[field].filter((id) => id !== removedId) });
    }
  }

  const categories = (type) =>
    collection(`categories/${typeId(type)}`, {
      schema: schemas.category,
      label: 'Kategori',
      fixed: { postType: type },
      summarize: summarizeCategory,
      async beforeRemove(doc) {
        const siblings = await categories(type).list();
        if (siblings.some((item) => item.parentId === doc.id)) {
          throw conflict(`Kategori "${doc.name}" masih punya subkategori`);
        }
      },
      afterRemove: (id) => unlinkFromPosts(type, 'categoryIds', id),
    });

  const postTypes = collection('post-types', {
    schema: schemas.postType,
    label: 'Post type',
    summarize: summarizePostType,
    async beforeRemove(doc) {
      if (doc.system) throw forbidden(`Post type "${doc.id}" bawaan sistem dan tidak bisa dihapus`);
      const [postCount, categoryCount] = await Promise.all([
        posts(doc.id).list().then((items) => items.length),
        categories(doc.id).list().then((items) => items.length),
      ]);
      if (postCount || categoryCount) {
        throw conflict(
          `Post type "${doc.label}" masih berisi ${postCount} post dan ${categoryCount} kategori. Hapus isinya dulu.`,
        );
      }
    },
  });

  return {
    adapter,
    settings: createDocument({ adapter, path: 'settings.json', schema: schemas.settings }),
    drafts,
    postTypes,
    posts,
    categories,

    navigation: collection('navigation', {
      schema: schemas.navigation,
      label: 'Menu',
      beforeRemove(doc) {
        // Menu bawaan dipakai tema default, jadi hanya boleh dikosongkan.
        if (DEFAULT_NAVIGATION.some((menu) => menu.id === doc.id)) {
          throw forbidden(`Menu "${doc.label}" bawaan sistem dan tidak bisa dihapus`);
        }
      },
    }),

    // Author lintas post type, jadi penghapusannya dibersihkan dari semua post type.
    authors: collection('authors', {
      schema: schemas.author,
      label: 'Author',
      async afterRemove(id) {
        for (const type of await postTypes.list()) await unlinkFromPosts(type.id, 'authorIds', id);
      },
    }),

    pages: collection('pages', {
      schema: schemas.page,
      label: 'Page',
      summarize: summarizePublishable,
      afterRemove: (id) => drafts.remove('pages', id),
    }),
  };
}
