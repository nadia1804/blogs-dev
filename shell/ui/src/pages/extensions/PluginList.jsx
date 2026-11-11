import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { useData } from '../../app/data.jsx';
import { ExtensionList } from '../../components/ExtensionList.jsx';
import { Link } from '../../lib/router.jsx';
import { useCollection } from '../../lib/useCollection.js';

// Daftar plugin: sakelar aktif/nonaktif tersimpan langsung; pengaturan
// tiap plugin ada di layer berikutnya.
export function PluginList({ path }) {
  const { settings, saveSettings, reload } = useData();
  const collection = useCollection('/plugins');
  const [error, setError] = useState(null);

  const toggle = async (item, enabled) => {
    setError(null);
    const current = settings.plugins[item.id] ?? { options: {} };
    try {
      await saveSettings({ ...settings, plugins: { ...settings.plugins, [item.id]: { ...current, enabled } } });
      await collection.reload();
    } catch (failure) {
      setError(failure.message);
    }
  };

  return (
    <>
      {error && <div role="alert" className="alert alert-error alert-soft mx-auto mb-4 max-w-4xl text-sm">{error}</div>}
      <ExtensionList
        title="Plugin"
        description="Plugin menambah fitur ke situs. Semuanya nonaktif sampai Anda menyalakannya."
        endpoint="/plugins"
        noun="plugin"
        collection={collection}
        onChanged={reload}
        renderActions={(item) => (
          <>
            {item.settings.length > 0 && (
              <Link to={`${path}/${item.id}`} className="btn btn-ghost btn-sm" aria-label={`Pengaturan ${item.name}`}>
                <Settings2 className="size-4" /> <span className="max-sm:hidden">Pengaturan</span>
              </Link>
            )}
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              aria-label={`Aktifkan ${item.name}`}
              checked={item.enabled}
              onChange={(event) => toggle(item, event.target.checked)}
            />
          </>
        )}
      />
    </>
  );
}
