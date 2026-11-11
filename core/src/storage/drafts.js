import { withLock } from './atomic.js';
import { forbidden } from './errors.js';

const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Draft autosave. Disimpan terpisah di `.drafts/` sehingga dokumen asli
// (termasuk versi yang sudah publish) tidak tersentuh sampai disimpan sungguhan.
// Isi draft tidak divalidasi skema: boleh setengah jadi.
//
// `baseUpdatedAt` = updatedAt dokumen asli saat draft dibuat, untuk mendeteksi
// draft yang sudah usang (dokumen asli berubah setelahnya).
export function createDrafts(adapter) {
  function path(dir, id) {
    if (typeof id !== 'string' || !SAFE_ID.test(id)) throw forbidden(`ID tidak valid: ${id}`);
    return `.drafts/${dir.replaceAll('/', '__')}/${id}.json`;
  }

  return {
    get: (dir, id) => adapter.read(path(dir, id)),

    save(dir, id, { data, baseUpdatedAt = null }) {
      const file = path(dir, id);
      return withLock(adapter.key(file), async () => {
        const draft = { id, baseUpdatedAt, savedAt: new Date().toISOString(), data };
        await adapter.write(file, draft);
        return draft;
      });
    },

    remove: (dir, id) => adapter.remove(path(dir, id)),
  };
}
