// Membaca seluruh konten dari store untuk satu kali build.
//
//   mode 'production' : hanya yang terbit (atau terjadwal dan sudah waktunya)
//   mode 'preview'    : semua dokumen, dan draft autosave ditimpakan di atas
//                       dokumen aslinya, sehingga preview menampilkan apa
//                       yang sedang ditulis admin.

async function loadAll(store, collection, preview) {
  const items = await collection.list();
  const docs = await Promise.all(
    items.map(async ({ id }) => {
      const doc = await collection.get(id);
      if (!doc || !preview) return doc;
      const draft = await store.drafts.get(collection.dir, id);
      return draft ? { ...doc, ...draft.data, id: doc.id } : doc;
    }),
  );
  return docs.filter(Boolean);
}

export async function loadContent(store, { mode, now = new Date() }) {
  const preview = mode === 'preview';
  const visible = (doc) =>
    preview ||
    doc.status === 'published' ||
    (doc.status === 'scheduled' && doc.scheduledAt && new Date(doc.scheduledAt) <= now);

  const settings = await store.settings.get();
  const postTypes = await loadAll(store, store.postTypes, false);
  postTypes.sort((a, b) => Number(b.system) - Number(a.system) || a.label.localeCompare(b.label));

  const perType = await Promise.all(
    postTypes.map(async (type) => ({
      posts: (await loadAll(store, store.posts(type.id), preview)).filter(visible),
      categories: await loadAll(store, store.categories(type.id), false),
    })),
  );

  return {
    settings,
    postTypes,
    posts: perType.flatMap((entry) => entry.posts),
    categories: perType.flatMap((entry) => entry.categories),
    pages: (await loadAll(store, store.pages, preview)).filter(visible),
    authors: await loadAll(store, store.authors, false),
    menus: await loadAll(store, store.navigation, false),
  };
}
