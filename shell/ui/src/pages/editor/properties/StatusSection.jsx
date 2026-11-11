import { CircleDot } from 'lucide-react';
import { Field, SelectField, TextArea, TextField } from '../../../components/fields.jsx';
import { ImageInput } from '../../../components/ImageInput.jsx';
import { formatDateTime } from '../../../lib/format.js';
import { Section } from './Section.jsx';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'published', label: 'Terbit' },
];

// ISO (UTC) <-> nilai <input type="datetime-local"> (waktu lokal).
const toLocalInput = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);

export const meta = { id: 'status', title: 'Status dan dasar', icon: CircleDot };

export function StatusSection({ doc, set, errors }) {
  return (
    <Section {...meta} defaultOpen>
      <SelectField
        label="Status"
        value={doc.status}
        error={errors.status}
        options={STATUS_OPTIONS}
        onChange={(status) =>
          set({
            status,
            scheduledAt: status === 'scheduled' ? doc.scheduledAt : null,
            publishedAt: status === 'published' ? doc.publishedAt ?? new Date().toISOString() : doc.publishedAt,
          })
        }
      />
      {doc.status === 'scheduled' && (
        <Field label="Jadwal tayang" error={errors.scheduledAt} hint="Tayang otomatis baru berjalan setelah builder tersedia.">
          <input
            type="datetime-local"
            className="input w-full"
            aria-label="Jadwal tayang"
            value={toLocalInput(doc.scheduledAt)}
            onChange={(event) => set({ scheduledAt: fromLocalInput(event.target.value) })}
          />
        </Field>
      )}
      <p className="text-xs text-base-content/60">
        {doc.publishedAt ? `Terbit ${formatDateTime(doc.publishedAt)}. ` : ''}
        Diperbarui {formatDateTime(doc.updatedAt)}.
      </p>
      <TextField
        label="Slug"
        prefix="/"
        value={doc.slug}
        error={errors.slug}
        hint="Bagian alamat URL. Mengubah slug mengubah alamat halaman."
        onChange={(slug) => set({ slug })}
      />
      <TextArea
        label="Excerpt"
        value={doc.excerpt}
        error={errors.excerpt}
        hint={`Ringkasan di kartu post dan cadangan deskripsi SEO. ${doc.excerpt.length}/500`}
        onChange={(excerpt) => set({ excerpt })}
      />
      <ImageInput
        label="Gambar cover"
        value={doc.cover?.src ?? ''}
        onChange={(src) => set({ cover: src ? { src, alt: doc.cover?.alt ?? '' } : null })}
      />
      {doc.cover && (
        <TextField
          label="Teks alt cover"
          value={doc.cover.alt}
          hint="Deskripsi gambar untuk pembaca layar dan SEO."
          onChange={(alt) => set({ cover: { ...doc.cover, alt } })}
        />
      )}
    </Section>
  );
}
