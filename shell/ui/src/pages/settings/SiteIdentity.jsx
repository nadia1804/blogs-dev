import { TextArea, TextField } from '../../components/fields.jsx';
import { FormPage } from '../../components/FormPage.jsx';
import { ImageInput } from '../../components/ImageInput.jsx';
import { useSettingsForm } from '../../lib/useSettingsForm.js';

const Heading = ({ children }) => (
  <h2 className="border-b border-base-300 pb-2 text-sm font-semibold text-base-content/70">{children}</h2>
);

// Identitas situs: dipakai tema (navbar, hero, favicon) dan SEO.
export function SiteIdentity() {
  const form = useSettingsForm();
  const { site, hero } = form.values;
  const setSite = (patch) => form.setIn('site', patch);
  const setHero = (patch) => form.setIn('hero', patch);
  const error = (key) => form.errors[key];

  return (
    <FormPage title="Identitas situs" form={form}>
      <Heading>Situs</Heading>
      <TextField label="Judul situs" value={site.title} error={error('site.title')} onChange={(title) => setSite({ title })} />
      <TextField label="Tagline" value={site.tagline} error={error('site.tagline')} onChange={(tagline) => setSite({ tagline })} />
      <TextArea
        label="Deskripsi"
        value={site.description}
        error={error('site.description')}
        hint="Deskripsi bawaan untuk mesin pencari bila sebuah halaman tidak punya deskripsi sendiri."
        onChange={(description) => setSite({ description })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Alamat situs"
          value={site.url}
          error={error('site.url')}
          placeholder="https://situs-anda.com"
          hint="Wajib sebelum publish: dipakai untuk canonical dan sitemap."
          onChange={(url) => setSite({ url: url.trim() })}
        />
        <TextField
          label="Kode bahasa"
          value={site.language}
          error={error('site.language')}
          hint="Misalnya id atau en."
          onChange={(language) => setSite({ language: language.trim() })}
        />
      </div>

      <Heading>Gambar</Heading>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <ImageInput label="Logo" aspect="aspect-[3/1]" value={site.logo} onChange={(logo) => setSite({ logo })} />
        <ImageInput
          label="Ikon"
          aspect="aspect-square"
          value={site.icon}
          hint="Persegi, minimal 512 px."
          onChange={(icon) => setSite({ icon })}
        />
      </div>
      <ImageInput
        label="Gambar berbagi bawaan"
        aspect="aspect-[1200/630]"
        value={site.ogImage}
        hint="Dipakai saat halaman dibagikan dan tidak punya gambar sendiri. Ukuran ideal 1200×630."
        onChange={(ogImage) => setSite({ ogImage })}
      />

      <Heading>Hero beranda</Heading>
      <TextField label="Judul hero" value={hero.title} error={error('hero.title')} onChange={(title) => setHero({ title })} />
      <TextArea label="Subjudul hero" rows={2} value={hero.subtitle} error={error('hero.subtitle')} onChange={(subtitle) => setHero({ subtitle })} />
    </FormPage>
  );
}
