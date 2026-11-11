import { useState } from 'react';
import { slugify } from '@blogs/core/slug';
import { useData } from '../../app/data.jsx';
import { PastelPicker, SelectField, TextField } from '../../components/fields.jsx';
import { IconPickerField } from '../../components/IconPicker.jsx';
import { FormPage } from '../../components/FormPage.jsx';
import { useDocForm } from '../../lib/useDocForm.js';

const DEFAULTS = {
  id: '',
  label: '',
  labelPlural: '',
  icon: 'file-text',
  defaultSchema: 'Article',
  fallbackColors: ['sky', 'mint', 'lavender'],
};

export function PostTypeForm({ params, path }) {
  const data = useData();
  const form = useDocForm({
    endpoint: '/post-types',
    id: params.id,
    path,
    listPath: '/settings/post-types',
    defaults: DEFAULTS,
    titleOf: (doc) => doc.label,
    onSaved: data.reload,
  });
  const [idTouched, setIdTouched] = useState(false);
  const { doc, set, errors } = form;

  return (
    <FormPage title={form.isNew ? 'Post type baru' : 'Ubah post type'} form={form}>
      {doc && (
        <>
          <TextField
            label="Label"
            value={doc.label}
            error={errors.label}
            autoFocus={form.isNew}
            placeholder="mis. Pelajaran"
            onChange={(label) => set({ label, ...(form.isNew && !idTouched ? { id: slugify(label) } : {}) })}
          />
          <TextField
            label="ID"
            prefix="/"
            value={doc.id}
            error={errors.id}
            disabled={!form.isNew}
            hint={
              form.isNew
                ? 'Menjadi awalan URL dan nama folder penyimpanan. Tidak bisa diubah setelah dibuat.'
                : 'ID tidak bisa diubah setelah post type dibuat.'
            }
            onChange={(id) => {
              setIdTouched(true);
              set({ id });
            }}
          />
          <TextField
            label="Label jamak"
            value={doc.labelPlural}
            error={errors.labelPlural}
            hint="Opsional. Dipakai untuk judul halaman arsip."
            onChange={(labelPlural) => set({ labelPlural })}
          />
          <IconPickerField label="Ikon" value={doc.icon} error={errors.icon} onChange={(icon) => set({ icon })} />
          <SelectField
            label="Content schema default"
            value={doc.defaultSchema}
            error={errors.defaultSchema}
            hint="Schema yang dipakai post baru di post type ini. Bisa diganti per post."
            options={data.contentSchemas.map((schema) => ({ value: schema.id, label: schema.label, group: schema.group }))}
            onChange={(defaultSchema) => set({ defaultSchema })}
          />
          <PastelPicker
            multiple
            label="Warna kartu tanpa gambar"
            value={doc.fallbackColors}
            error={errors.fallbackColors}
            hint="Post tanpa gambar cover memakai salah satu warna ini."
            onChange={(fallbackColors) => set({ fallbackColors })}
          />
        </>
      )}
    </FormPage>
  );
}
