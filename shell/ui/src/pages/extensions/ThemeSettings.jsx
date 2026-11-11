import { Save } from 'lucide-react';
import { DynamicField } from '../../components/DynamicField.jsx';
import { useLayerTitle } from '../../lib/layer-title.js';
import { SHORTCUTS } from '../../lib/shortcuts.js';
import { useCollection } from '../../lib/useCollection.js';
import { useSettingsForm } from '../../lib/useSettingsForm.js';
import { NotFound } from '../Placeholder.jsx';

// Pengaturan satu tema. Form-nya dibuat dari `settings` di theme.json:
// satu kartu per bagian. Nilai disimpan per tema di settings.theme.options.
export function ThemeSettings({ params, path }) {
  const themes = useCollection('/themes');
  const form = useSettingsForm();
  const theme = themes.items.find((item) => item.id === params.id);
  useLayerTitle(path, theme?.name ?? '');

  if (themes.status === 'ready' && !theme) return <NotFound />;
  if (!theme) {
    return (
      <div className="grid h-40 place-items-center">
        <span className="loading loading-spinner text-primary" aria-label="Memuat" />
      </div>
    );
  }

  const all = form.values.theme.options;
  const saved = all[theme.id] ?? {};
  // Nilai yang belum pernah diisi memakai default dari manifest.
  const valueOf = (field) => (field.key in saved ? saved[field.key] : field.default);
  const setValue = (key, value) => form.setIn('theme', { options: { ...all, [theme.id]: { ...saved, [key]: value } } });
  const fields = theme.settings.flatMap((group) => group.fields);
  const visible = (field) =>
    !field.showIf || valueOf(fields.find((item) => item.key === field.showIf.key)) === field.showIf.equals;

  return (
    <form
      className="mx-auto max-w-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        form.save();
      }}
    >
      <h1 className="truncate text-xl font-semibold">{theme.name}</h1>
      <p className="mb-5 text-sm text-base-content/70">
        Perubahan berlaku pada build berikutnya. Tekan Save, lalu Preview untuk melihat hasilnya.
      </p>
      {form.errors._ && <div role="alert" className="alert alert-error alert-soft mb-4 text-sm">{form.errors._}</div>}

      {theme.settings.length === 0 ? (
        <p className="rounded-box border border-dashed border-base-300 p-8 text-center text-sm text-base-content/60">
          Tema ini tidak punya pengaturan.
        </p>
      ) : (
        theme.settings.map((group) => (
          <section key={group.id} className="card card-border mb-4 bg-base-100">
            <div className="card-body gap-4">
              <h2 className="border-b border-base-300 pb-2 font-semibold">{group.label}</h2>
              {group.fields.filter(visible).map((field) => (
                <DynamicField
                  key={field.key}
                  field={field}
                  value={valueOf(field)}
                  onChange={(value) => setValue(field.key, value)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <div className="flex items-center justify-end gap-3">
        <span className="text-xs text-base-content/60">{SHORTCUTS.save.label}</span>
        <button type="submit" className="btn btn-primary btn-sm" disabled={form.saving || !form.dirty}>
          {form.saving ? <span className="loading loading-spinner loading-xs" /> : <Save className="size-4" />}
          Simpan
        </button>
      </div>
    </form>
  );
}
