import { useState } from 'react';
import { useData } from '../../app/data.jsx';
import { PastelTag } from '../../components/fields.jsx';
import { ListPage } from '../../components/ListPage.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { api } from '../../lib/api.js';
import { formatDateTime } from '../../lib/format.js';
import { navigate } from '../../lib/router.jsx';
import { useCollection } from '../../lib/useCollection.js';
import { NotFound } from '../Placeholder.jsx';

const UNTITLED = '(Tanpa judul)';

// Dialog kecil untuk membuat dokumen baru: cukup judul, lalu langsung
// masuk ke layer editor.
function NewDocDialog({ noun, endpoint, basePath, onClose }) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const create = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const doc = await api.post(endpoint, { title: title.trim() });
      navigate(`${basePath}/${doc.id}`);
    } catch (failure) {
      setError(failure.code === 'CONFLICT' ? 'Judul ini sudah dipakai. Gunakan judul lain.' : failure.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label={`${noun} baru`}>
      <form className="modal-box max-w-sm" onSubmit={create}>
        <h3 className="font-semibold">{noun} baru</h3>
        <input
          className={`input mt-3 w-full ${error ? 'input-error' : ''}`}
          placeholder="Judul"
          aria-label="Judul"
          value={title}
          autoFocus
          onChange={(event) => {
            setTitle(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => event.key === 'Escape' && onClose()}
        />
        {error && <p className="mt-2 text-xs text-error" role="alert">{error}</p>}
        <div className="modal-action">
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>Batal</button>
          <button type="submit" className="btn btn-sm btn-primary" disabled={busy || !title.trim()}>
            {busy && <span className="loading loading-spinner loading-xs" />}
            Buat
          </button>
        </div>
      </form>
      <button type="button" className="modal-backdrop" aria-label="Tutup" onClick={onClose} />
    </div>
  );
}

// Daftar dokumen ber-editor: post (per post type) atau page.
//   kind = 'posts' | 'pages'
export function DocList({ kind, params, path }) {
  const { postTypes } = useData();
  const isPost = kind === 'posts';
  const type = isPost ? postTypes.find((item) => item.id === params.type) : null;
  const valid = !isPost || Boolean(type);
  const endpoint = !valid ? null : isPost ? `/posts/${type.id}` : '/pages';

  const collection = useCollection(endpoint);
  const categories = useCollection(isPost && type ? `/categories/${type.id}` : null);
  const [creating, setCreating] = useState(false);
  if (!valid) return <NotFound />;

  const noun = isPost ? 'Post' : 'Page';
  const categoryById = Object.fromEntries(categories.items.map((item) => [item.id, item]));

  const columns = [
    { header: 'Judul', cell: (item) => item.title || UNTITLED },
    { header: 'Status', cell: (item) => <StatusBadge status={item.status} /> },
    isPost && {
      header: 'Kategori',
      cell: (item) => (
        <span className="flex flex-wrap gap-1">
          {item.categoryIds.map(
            (id) => categoryById[id] && <PastelTag key={id} color={categoryById[id].color}>{categoryById[id].name}</PastelTag>,
          )}
        </span>
      ),
    },
    { header: 'Diperbarui', cell: (item) => formatDateTime(item.updatedAt), className: 'whitespace-nowrap' },
  ].filter(Boolean);

  return (
    <>
      <ListPage
        title={isPost ? `Post ${type.label}` : 'Page'}
        description={isPost ? undefined : 'Halaman umum seperti Tentang atau Kontak.'}
        collection={collection}
        endpoint={endpoint}
        rowTo={(item) => `${path}/${item.id}`}
        add={{ label: `${noun} baru`, onClick: () => setCreating(true) }}
        nameOf={(item) => item.title || UNTITLED}
        emptyText={`Belum ada ${noun.toLowerCase()}.`}
        columns={columns}
      />
      {creating && (
        <NewDocDialog noun={noun} endpoint={endpoint} basePath={path} onClose={() => setCreating(false)} />
      )}
    </>
  );
}
