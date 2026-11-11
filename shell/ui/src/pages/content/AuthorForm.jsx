import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { slugify } from '@blogs/core/slug';
import { Field, TextArea, TextField } from '../../components/fields.jsx';
import { FormPage } from '../../components/FormPage.jsx';
import { ImageInput } from '../../components/ImageInput.jsx';
import { useDocForm } from '../../lib/useDocForm.js';

const DEFAULTS = { name: '', slug: '', bio: '', avatar: null, links: [] };

function LinksEditor({ links, error, onChange }) {
  const update = (index, patch) => onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));

  return (
    <Field label="Tautan" error={error} hint="Situs pribadi atau media sosial. URL lengkap, diawali https://">
      <div className="flex flex-col gap-2">
        {links.map((link, index) => (
          <div key={index} className="flex gap-2">
            <input
              className="input w-1/3"
              placeholder="Label"
              aria-label={`Label tautan ${index + 1}`}
              value={link.label}
              onChange={(event) => update(index, { label: event.target.value })}
            />
            <input
              className="input flex-1"
              placeholder="https://"
              aria-label={`URL tautan ${index + 1}`}
              value={link.url}
              onChange={(event) => update(index, { url: event.target.value })}
            />
            <button
              type="button"
              className="btn btn-ghost btn-square"
              aria-label={`Hapus tautan ${index + 1}`}
              onClick={() => onChange(links.filter((_, i) => i !== index))}
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-sm btn-ghost self-start"
          onClick={() => onChange([...links, { label: '', url: '' }])}
        >
          <Plus className="size-4" /> Tambah tautan
        </button>
      </div>
    </Field>
  );
}

export function AuthorForm({ params, path }) {
  const form = useDocForm({
    endpoint: '/authors',
    id: params.id,
    path,
    listPath: '/authors',
    defaults: DEFAULTS,
    titleOf: (doc) => doc.name,
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const { doc, set, errors } = form;
  const linksError = Object.entries(errors).find(([key]) => key.startsWith('links'))?.[1];

  return (
    <FormPage title={form.isNew ? 'Author baru' : 'Ubah author'} form={form}>
      {doc && (
        <>
          <TextField
            label="Nama"
            value={doc.name}
            error={errors.name}
            autoFocus={form.isNew}
            onChange={(name) => set({ name, ...(form.isNew && !slugTouched ? { slug: slugify(name) } : {}) })}
          />
          <TextField
            label="Slug"
            prefix="/"
            value={doc.slug}
            error={errors.slug}
            hint="Bagian alamat URL halaman author."
            onChange={(slug) => {
              setSlugTouched(true);
              set({ slug });
            }}
          />
          <TextArea label="Bio" rows={4} value={doc.bio} error={errors.bio} onChange={(bio) => set({ bio })} />
          <LinksEditor links={doc.links} error={linksError} onChange={(links) => set({ links })} />
          <div className="max-w-40">
            <ImageInput
              label="Foto"
              aspect="aspect-square"
              value={doc.avatar?.src ?? ''}
              onChange={(src) => set({ avatar: src ? { src, alt: doc.name } : null })}
            />
          </div>
        </>
      )}
    </FormPage>
  );
}
