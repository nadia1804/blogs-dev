import { TextArea, TextField, ToggleField } from '../../components/fields.jsx';
import { FormPage } from '../../components/FormPage.jsx';
import { useSettingsForm } from '../../lib/useSettingsForm.js';

// SEO untuk seluruh situs. SEO per post/page diatur di panel properti editor.
export function SeoGlobal() {
  const form = useSettingsForm();
  const { seo, site } = form.values;
  const setSeo = (patch) => form.setIn('seo', patch);
  const example = seo.titleTemplate.replace('%title%', 'Mengenal Pecahan').replace('%site%', site.title);

  return (
    <FormPage title="SEO global" form={form}>
      <TextField
        label="Template judul"
        value={seo.titleTemplate}
        error={form.errors['seo.titleTemplate']}
        hint={<>%title% = judul halaman, %site% = judul situs. Contoh hasil: <strong>{example}</strong></>}
        onChange={(titleTemplate) => setSeo({ titleTemplate })}
      />
      <ToggleField
        label="Izinkan mesin pencari mengindeks situs"
        hint="Matikan selama situs belum siap. Semua halaman akan diberi noindex."
        value={seo.indexSite}
        onChange={(indexSite) => setSeo({ indexSite })}
      />
      <TextField
        label="Nama organisasi atau pemilik"
        value={seo.organizationName}
        hint="Dipakai di data terstruktur sebagai penerbit. Kosong = judul situs."
        onChange={(organizationName) => setSeo({ organizationName })}
      />
      <TextField
        label="Akun X (Twitter)"
        prefix="@"
        value={seo.twitterHandle}
        onChange={(twitterHandle) => setSeo({ twitterHandle: twitterHandle.replace(/^@/, '').trim() })}
      />
      <TextArea
        label="Profil resmi"
        rows={3}
        value={seo.socialProfiles.join('\n')}
        placeholder={'https://www.instagram.com/akun\nhttps://www.youtube.com/@kanal'}
        hint="Alamat profil media sosial situs, satu per baris. Membantu mesin pencari mengenali pemilik situs."
        onChange={(text) => setSeo({ socialProfiles: text.split('\n').map((line) => line.trim()) })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Verifikasi Google Search Console"
          value={seo.verification.google}
          hint="Isi kode dari tag meta verifikasi."
          onChange={(google) => setSeo({ verification: { ...seo.verification, google: google.trim() } })}
        />
        <TextField
          label="Verifikasi Bing Webmaster"
          value={seo.verification.bing}
          onChange={(bing) => setSeo({ verification: { ...seo.verification, bing: bing.trim() } })}
        />
      </div>
    </FormPage>
  );
}
