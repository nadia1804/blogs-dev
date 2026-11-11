import { NumberField } from '../../components/fields.jsx';
import { FormPage } from '../../components/FormPage.jsx';
import { useSettingsForm } from '../../lib/useSettingsForm.js';

// Jeda autosave draft di editor.
export function WatcherSettings() {
  const form = useSettingsForm();
  const { watcher } = form.values;
  const setWatcher = (patch) => form.setIn('watcher', patch);

  return (
    <FormPage title="Watcher" form={form}>
      <p className="text-sm text-base-content/70">
        Watcher menyimpan perubahan di editor ke draft otomatis. Dokumen asli baru berubah saat Anda menekan Save atau
        Publish.
      </p>
      <NumberField
        label="Simpan setelah berhenti mengetik"
        suffix="detik"
        min={1}
        max={60}
        value={watcher.idleSeconds}
        error={form.errors['watcher.idleSeconds']}
        hint="1 sampai 60 detik."
        onChange={(idleSeconds) => setWatcher({ idleSeconds })}
      />
      <NumberField
        label="Simpan berkala selama terus mengetik"
        suffix="detik"
        min={5}
        max={600}
        value={watcher.intervalSeconds}
        error={form.errors['watcher.intervalSeconds']}
        hint="5 sampai 600 detik. Menjaga draft tetap baru saat Anda menulis tanpa jeda."
        onChange={(intervalSeconds) => setWatcher({ intervalSeconds })}
      />
    </FormPage>
  );
}
