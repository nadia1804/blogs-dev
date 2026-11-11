import { useState } from 'react';
import { Tags, X } from 'lucide-react';
import { Field, PastelTag } from '../../../components/fields.jsx';
import { Link } from '../../../lib/router.jsx';
import { useCollection } from '../../../lib/useCollection.js';
import { Section } from './Section.jsx';

// Daftar centang untuk memilih beberapa item (kategori, author).
function CheckList({ label, items, selected, onChange, render, empty }) {
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  return (
    <Field label={label}>
      {items.length === 0 ? (
        empty
      ) : (
        <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-field px-1 py-1 text-sm hover:bg-base-content/5">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={selected.includes(item.id)}
                  onChange={() => toggle(item.id)}
                />
                {render(item)}
              </label>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}

function TagsInput({ tags, onChange }) {
  const [text, setText] = useState('');
  const commit = () => {
    const tag = text.trim().replace(/,+$/, '');
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setText('');
  };
  return (
    <Field label="Tag" hint="Tekan Enter atau koma untuk menambah.">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span key={tag} className="badge badge-ghost gap-1">
              {tag}
              <button type="button" aria-label={`Hapus tag ${tag}`} onClick={() => onChange(tags.filter((item) => item !== tag))}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        className="input w-full"
        aria-label="Tambah tag"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            commit();
          }
        }}
      />
    </Field>
  );
}

const EmptyHint = ({ to, children }) => (
  <p className="text-xs text-base-content/60">
    Belum ada. <Link to={to} className="link">{children}</Link>
  </p>
);

export const meta = { id: 'taxonomy', title: 'Kategori, author, tag', icon: Tags };

// Khusus post: kategori (milik post type ini), author (lintas post type), tag.
export function TaxonomySection({ doc, set, type }) {
  const categories = useCollection(`/categories/${type.id}`);
  const authors = useCollection('/authors');

  return (
    <Section {...meta} defaultOpen>
      <CheckList
        label="Kategori"
        items={categories.items}
        selected={doc.categoryIds}
        onChange={(categoryIds) => set({ categoryIds })}
        render={(item) => <PastelTag color={item.color}>{item.name}</PastelTag>}
        empty={<EmptyHint to={`/categories/${type.id}`}>Buat kategori {type.label}</EmptyHint>}
      />
      <CheckList
        label="Author"
        items={authors.items}
        selected={doc.authorIds}
        onChange={(authorIds) => set({ authorIds })}
        render={(item) => <span>{item.title}</span>}
        empty={<EmptyHint to="/authors">Buat author</EmptyHint>}
      />
      <TagsInput tags={doc.tags} onChange={(tags) => set({ tags })} />
    </Section>
  );
}
