import { useData } from '../../app/data.jsx';
import { SelectField, TextField } from '../../components/fields.jsx';
import { useCollection } from '../../lib/useCollection.js';

export const KINDS = [
  { value: 'home', label: 'Beranda' },
  { value: 'postType', label: 'Arsip post type' },
  { value: 'post', label: 'Post' },
  { value: 'category', label: 'Kategori' },
  { value: 'page', label: 'Page' },
  { value: 'url', label: 'URL bebas' },
];

export const kindLabel = (kind) => KINDS.find((item) => item.value === kind)?.label ?? kind;

const PICK = { value: '', label: 'Pilih…' };

// Editor tujuan satu item menu. Konten dipilih dari daftar dan disimpan
// sebagai ID, jadi menu tidak putus saat slug berubah.
//
//   onChange(target, suggestedLabel?)  suggestedLabel = judul konten terpilih,
//   dipakai pemanggil untuk mengisi label yang masih kosong.
export function TargetEditor({ target, onChange }) {
  const { postTypes } = useData();
  const { kind } = target;
  const firstType = postTypes[0]?.id ?? '';
  const typeLabel = (id) => postTypes.find((type) => type.id === id)?.label ?? id;

  const posts = useCollection(kind === 'post' && target.postType ? `/posts/${target.postType}` : null);
  const categories = useCollection(kind === 'category' && target.postType ? `/categories/${target.postType}` : null);
  const pages = useCollection(kind === 'page' ? '/pages' : null);

  const changeKind = (next) => {
    if (next === 'home') return onChange({ kind: next }, 'Beranda');
    if (next === 'url') return onChange({ kind: next, url: '', newTab: false });
    if (next === 'postType') return onChange({ kind: next, postType: firstType }, typeLabel(firstType));
    if (next === 'page') return onChange({ kind: next, id: '' });
    return onChange({ kind: next, postType: firstType, id: '' });
  };

  const typeSelect = (
    <SelectField
      label="Post type"
      value={target.postType}
      options={postTypes.map((type) => ({ value: type.id, label: type.label }))}
      onChange={(postType) =>
        kind === 'postType'
          ? onChange({ kind, postType }, typeLabel(postType))
          : onChange({ kind, postType, id: '' })
      }
    />
  );

  // Pemilih dokumen dari sebuah daftar (post, kategori, page).
  const docSelect = (label, collection, nameOf, emptyText) => (
    <SelectField
      label={label}
      value={target.id}
      hint={collection.status === 'ready' && collection.items.length === 0 ? emptyText : undefined}
      options={[PICK, ...collection.items.map((item) => ({ value: item.id, label: nameOf(item) || '(Tanpa judul)' }))]}
      onChange={(id) => {
        const chosen = collection.items.find((item) => item.id === id);
        onChange({ ...target, id }, chosen ? nameOf(chosen) : undefined);
      }}
    />
  );

  return (
    <>
      <SelectField label="Tujuan" value={kind} options={KINDS} onChange={changeKind} />
      {(kind === 'postType' || kind === 'post' || kind === 'category') && typeSelect}
      {kind === 'post' && docSelect('Post', posts, (item) => item.title, 'Belum ada post di post type ini.')}
      {kind === 'category' && docSelect('Kategori', categories, (item) => item.name, 'Belum ada kategori di post type ini.')}
      {kind === 'page' && docSelect('Page', pages, (item) => item.title, 'Belum ada page.')}
      {kind === 'url' && (
        <>
          <TextField
            label="URL"
            value={target.url}
            placeholder="https://"
            hint="Alamat lengkap, atau path di situs ini seperti /tentang."
            onChange={(url) => onChange({ ...target, url })}
          />
          <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
            Buka di tab baru
            <input
              type="checkbox"
              className="toggle toggle-sm toggle-primary"
              checked={target.newTab}
              onChange={(event) => onChange({ ...target, newTab: event.target.checked })}
            />
          </label>
        </>
      )}
    </>
  );
}
