import { Search } from 'lucide-react';
import { useData } from '../../../app/data.jsx';
import { Field, TextArea, TextField } from '../../../components/fields.jsx';
import { Section } from './Section.jsx';
import { SeoAnalysis } from './SeoAnalysis.jsx';

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

// Penghitung panjang: netral saat wajar, kuning saat melewati batas tampil Google.
const counter = (text, limit) => (
  <span className={text.length > limit ? 'text-warning' : undefined}>{text.length}/{limit}</span>
);

// Pratinjau hasil pencarian Google, memakai fallback yang sama dengan builder.
function SearchPreview({ doc, pathPrefix }) {
  const { settings } = useData();
  const title = settings.seo.titleTemplate
    .replace('%title%', doc.seo.title || doc.title || 'Judul halaman')
    .replace('%site%', settings.site.title);
  const description = doc.seo.description || doc.excerpt || 'Deskripsi diambil dari awal tulisan bila dikosongkan.';
  const origin = (settings.site.url || 'https://situs-anda.com').replace(/\/$/, '');

  return (
    <Field label="Pratinjau di Google">
      <div className="rounded-field border border-base-300 bg-base-100 p-3">
        <p className="truncate text-xs text-base-content/60">{origin}{pathPrefix}/{doc.slug}</p>
        <p className="line-clamp-1 text-base text-info">{title}</p>
        <p className="line-clamp-2 text-xs text-base-content/70">{description}</p>
      </div>
    </Field>
  );
}

export const meta = { id: 'seo', title: 'SEO', icon: Search };

export function SeoSection({ doc, set, errors, pathPrefix }) {
  const seo = doc.seo;
  const setSeo = (patch) => set({ seo: { ...seo, ...patch } });
  const setRobots = (patch) => setSeo({ robots: { ...seo.robots, ...patch } });

  return (
    <Section {...meta}>
      <SeoAnalysis doc={doc} />
      <SearchPreview doc={doc} pathPrefix={pathPrefix} />
      <TextField
        label="Judul SEO"
        value={seo.title}
        error={errors['seo.title']}
        placeholder={doc.title}
        hint={<>Kosong = memakai judul. {counter(seo.title, TITLE_LIMIT)}</>}
        onChange={(title) => setSeo({ title })}
      />
      <TextArea
        label="Deskripsi SEO"
        value={seo.description}
        error={errors['seo.description']}
        placeholder={doc.excerpt}
        hint={<>Kosong = memakai excerpt. {counter(seo.description, DESCRIPTION_LIMIT)}</>}
        onChange={(description) => setSeo({ description })}
      />
      <TextField
        label="Kata kunci fokus"
        value={seo.focusKeyword}
        hint="Kata atau frasa yang ingin Anda menangkan. Dipakai analisis SEO di atas."
        onChange={(focusKeyword) => setSeo({ focusKeyword })}
      />
      <TextField
        label="URL canonical"
        value={seo.canonical}
        error={errors['seo.canonical']}
        placeholder="Otomatis: alamat halaman ini"
        hint="Isi hanya jika konten aslinya ada di alamat lain."
        onChange={(canonical) => setSeo({ canonical })}
      />
      <Field label="Robots">
        <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
          Boleh diindeks mesin pencari
          <input
            type="checkbox"
            className="toggle toggle-sm toggle-primary"
            checked={seo.robots.index}
            onChange={(event) => setRobots({ index: event.target.checked })}
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
          Boleh mengikuti tautan
          <input
            type="checkbox"
            className="toggle toggle-sm toggle-primary"
            checked={seo.robots.follow}
            onChange={(event) => setRobots({ follow: event.target.checked })}
          />
        </label>
      </Field>
    </Section>
  );
}
