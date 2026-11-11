import { ToggleField } from '../../components/fields.jsx';
import { FormPage } from '../../components/FormPage.jsx';
import { useSettingsForm } from '../../lib/useSettingsForm.js';

// Caching dan prefetch untuk situs yang dipublikasikan. Preview tidak terpengaruh.
export function CachingSettings() {
  const form = useSettingsForm();
  const { caching } = form.values;
  const setCaching = (patch) => form.setIn('caching', patch);

  return (
    <FormPage title="Caching" form={form}>
      <p className="text-sm text-base-content/70">
        Berlaku untuk situs produksi. Gambar olahan dan CSS selalu diberi nama ber-hash dan aturan cache jangka
        panjang, tanpa perlu diatur di sini.
      </p>
      <ToggleField
        label="Prefetch halaman"
        hint="Halaman tujuan dimuat diam-diam saat pengunjung mengarahkan kursor atau menyentuh tautan, sehingga perpindahan terasa instan."
        value={caching.prefetch}
        onChange={(prefetch) => setCaching({ prefetch })}
      />
      <ToggleField
        label="Cache lokal (service worker)"
        hint="Halaman yang pernah dibuka tersimpan di perangkat pengunjung dan bisa dibaca saat offline. Konsekuensinya, pengunjung lama bisa melihat versi sebelumnya satu kali sebelum pembaruan tampil."
        value={caching.serviceWorker}
        onChange={(serviceWorker) => setCaching({ serviceWorker })}
      />
    </FormPage>
  );
}
