import { useState } from 'react';
import { slugify } from '@blogs/core/slug';
import { PastelPicker, SelectField, TextArea, TextField } from '../../components/fields.jsx';
import { FormPage } from '../../components/FormPage.jsx';
import { useCollection } from '../../lib/useCollection.js';
import { useDocForm } from '../../lib/useDocForm.js';

const DEFAULTS = { name: '', slug: '', description: '', color: 'sky', parentId: null };

export function CategoryForm({ params, path }) {
  const endpoint = `/categories/${params.type}`;
  const siblings = useCollection(endpoint);
  const form = useDocForm({
    endpoint,
    id: params.id,
    path,
    listPath: `/categories/${params.type}`,
    defaults: DEFAULTS,
    titleOf: (doc) => doc.name,
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const { doc, set, errors } = form;

  // Submenu kategori dibatasi dua tingkat: induk harus kategori tanpa induk,
  // dan kategori yang sudah punya anak tidak bisa dijadikan anak.
  const hasChildren = siblings.items.some((item) => item.parentId === params.id);
  const parentOptions = [
    { value: '', label: 'Tanpa induk' },
    ...siblings.items
      .filter((item) => item.id !== params.id && !item.parentId)
      .map((item) => ({ value: item.id, label: item.name })),
  ];

  return (
    <FormPage title={form.isNew ? 'Kategori baru' : 'Ubah kategori'} form={form}>
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
            hint="Bagian alamat URL. Huruf kecil, angka, dan tanda hubung."
            onChange={(slug) => {
              setSlugTouched(true);
              set({ slug });
            }}
          />
          <PastelPicker label="Warna tag" value={doc.color} error={errors.color} onChange={(color) => set({ color })} />
          <SelectField
            label="Induk"
            value={doc.parentId ?? ''}
            error={errors.parentId}
            options={hasChildren ? parentOptions.slice(0, 1) : parentOptions}
            hint={hasChildren ? 'Kategori ini punya subkategori, jadi tidak bisa diberi induk.' : undefined}
            onChange={(value) => set({ parentId: value || null })}
          />
          <TextArea
            label="Deskripsi"
            value={doc.description}
            error={errors.description}
            hint="Tampil di halaman arsip kategori dan dipakai sebagai deskripsi SEO."
            onChange={(description) => set({ description })}
          />
        </>
      )}
    </FormPage>
  );
}
