import { withLock } from './atomic.js';
import { conflict, forbidden, notFound, validate } from './errors.js';
import { newId, slugify } from './ids.js';

const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const defaultSummary = ({ id, slug, title, name, label, updatedAt }) => ({
  id,
  slug,
  title: title ?? name ?? label ?? '',
  updatedAt,
});

// Koleksi dokumen: satu file JSON per dokumen di `dir`, plus index ringkas
// di `.index/` untuk daftar. Index hanyalah cache dan bisa dibangun ulang.
//
// opsi:
//   fixed        field yang dipaksa pada setiap dokumen (mis. { type: 'blog' })
//   summarize    doc -> ringkasan untuk index
//   beforeRemove doc -> void, lempar error untuk membatalkan penghapusan
//   afterRemove  id -> void, bersih-bersih rujukan setelah dokumen terhapus
export function createCollection({ adapter, dir, schema, label = 'Dokumen', fixed = {}, summarize = defaultSummary, beforeRemove, afterRemove }) {
  const indexPath = `.index/${dir.replaceAll('/', '__')}.json`;
  const lockKey = adapter.key(dir);

  function docPath(id) {
    if (typeof id !== 'string' || !SAFE_ID.test(id)) throw forbidden(`ID tidak valid: ${id}`);
    return `${dir}/${id}.json`;
  }

  const sortItems = (items) => items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  async function readIndex() {
    const index = await adapter.read(indexPath);
    return index?.items ?? (await rebuild());
  }

  const writeIndex = (items) => adapter.write(indexPath, { version: 1, items: sortItems(items) });

  async function rebuild() {
    const ids = await adapter.list(dir);
    const docs = await Promise.all(ids.map((id) => adapter.read(docPath(id))));
    const items = docs.filter(Boolean).map(summarize);
    await writeIndex(items);
    return items;
  }

  async function persist(doc) {
    const valid = validate(schema, { ...doc, ...fixed });
    const items = await readIndex();
    if (valid.slug && items.some((item) => item.slug === valid.slug && item.id !== valid.id)) {
      throw conflict(`Slug "${valid.slug}" sudah dipakai`);
    }
    await adapter.write(docPath(valid.id), valid);
    await writeIndex([...items.filter((item) => item.id !== valid.id), summarize(valid)]);
    return valid;
  }

  return {
    dir,

    get: (id) => adapter.read(docPath(id)),

    async list() {
      return sortItems([...(await readIndex())]);
    },

    create(input = {}) {
      return withLock(lockKey, async () => {
        const id = input.id ?? newId();
        if (await adapter.read(docPath(id))) throw conflict(`${label} "${id}" sudah ada`);
        const now = new Date().toISOString();
        const doc = { ...input, id, createdAt: now, updatedAt: now };
        // Dokumen ber-slug tanpa slug: turunkan dari judul/nama, atau pakai ID.
        if ('slug' in schema.shape && !doc.slug) {
          doc.slug = slugify(doc.title ?? doc.name) || id;
        }
        return persist(doc);
      });
    },

    update(id, patch) {
      return withLock(lockKey, async () => {
        const existing = await adapter.read(docPath(id));
        if (!existing) throw notFound(label);
        return persist({
          ...existing,
          ...patch,
          id,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString(),
        });
      });
    },

    remove(id) {
      return withLock(lockKey, async () => {
        const existing = await adapter.read(docPath(id));
        if (!existing) throw notFound(label);
        await beforeRemove?.(existing);
        await adapter.remove(docPath(id));
        const items = await readIndex();
        await writeIndex(items.filter((item) => item.id !== id));
      }).then(() => afterRemove?.(id));
    },

    rebuildIndex: () => withLock(lockKey, rebuild),
  };
}
