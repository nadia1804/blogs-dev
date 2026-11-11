import { DynamicField } from '../../components/DynamicField.jsx';
import { ToggleField } from '../../components/fields.jsx';
import { FormPage } from '../../components/FormPage.jsx';
import { useLayerTitle } from '../../lib/layer-title.js';
import { useCollection } from '../../lib/useCollection.js';
import { useSettingsForm } from '../../lib/useSettingsForm.js';
import { NotFound } from '../Placeholder.jsx';

// Pengaturan satu plugin. Form-nya dibuat dari daftar `settings` di manifest
// plugin, jadi tidak ada kode plugin yang berjalan di shell.
export function PluginSettings({ params, path }) {
  const plugins = useCollection('/plugins');
  const form = useSettingsForm();
  const plugin = plugins.items.find((item) => item.id === params.id);
  useLayerTitle(path, plugin?.name ?? '');

  if (plugins.status === 'ready' && !plugin) return <NotFound />;
  if (!plugin) {
    return (
      <div className="grid h-40 place-items-center">
        <span className="loading loading-spinner text-primary" aria-label="Memuat" />
      </div>
    );
  }

  const state = form.values.plugins[plugin.id] ?? { enabled: false, options: {} };
  const setState = (patch) => form.setIn('plugins', { [plugin.id]: { ...state, ...patch } });
  // Nilai yang belum pernah diisi memakai default dari manifest.
  const valueOf = (field) => (field.key in state.options ? state.options[field.key] : field.default);

  return (
    <FormPage title={plugin.name} form={form}>
      <p className="text-sm text-base-content/70">{plugin.description}</p>
      <ToggleField
        label="Aktifkan plugin"
        hint="Berlaku pada build berikutnya (Preview atau publish)."
        value={state.enabled}
        onChange={(enabled) => setState({ enabled })}
      />
      {plugin.settings.map((field) => (
        <DynamicField
          key={field.key}
          field={field}
          value={valueOf(field)}
          onChange={(value) => setState({ options: { ...state.options, [field.key]: value } })}
        />
      ))}
    </FormPage>
  );
}
