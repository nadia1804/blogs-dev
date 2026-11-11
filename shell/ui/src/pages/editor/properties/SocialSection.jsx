import { Share2 } from 'lucide-react';
import { TextArea, TextField } from '../../../components/fields.jsx';
import { ImageInput } from '../../../components/ImageInput.jsx';
import { Section } from './Section.jsx';

export const meta = { id: 'social', title: 'Sosial', icon: Share2 };

// Tampilan saat dibagikan (Open Graph). Semua kosong = mengikuti SEO dan cover.
export function SocialSection({ doc, set }) {
  const og = doc.seo.og;
  const setOg = (patch) => set({ seo: { ...doc.seo, og: { ...og, ...patch } } });

  return (
    <Section {...meta}>
      <TextField
        label="Judul saat dibagikan"
        value={og.title}
        placeholder={doc.seo.title || doc.title}
        hint="Kosong = memakai judul SEO."
        onChange={(title) => setOg({ title })}
      />
      <TextArea
        label="Deskripsi saat dibagikan"
        value={og.description}
        placeholder={doc.seo.description || doc.excerpt}
        hint="Kosong = memakai deskripsi SEO."
        onChange={(description) => setOg({ description })}
      />
      <ImageInput
        label="Gambar saat dibagikan"
        value={og.image}
        aspect="aspect-[1200/630]"
        hint="Kosong = memakai gambar cover, lalu gambar bawaan situs. Ukuran ideal 1200×630."
        onChange={(image) => setOg({ image })}
      />
    </Section>
  );
}
