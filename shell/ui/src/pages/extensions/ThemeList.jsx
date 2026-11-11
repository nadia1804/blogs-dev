import { useState } from 'react';
import { useData } from '../../app/data.jsx';
import { ExtensionList } from '../../components/ExtensionList.jsx';
import { Settings2 } from 'lucide-react';
import { Link } from '../../lib/router.jsx';
import { useCollection } from '../../lib/useCollection.js';

// Tema situs (front end). Tema backend diatur di Settings > Tampilan.
export function ThemeList({ path }) {
  const { settings, saveSettings } = useData();
  const collection = useCollection('/themes');
  const [error, setError] = useState(null);

  const activate = async (id) => {
    setError(null);
    try {
      await saveSettings({ ...settings, theme: { ...settings.theme, active: id } });
      await collection.reload();
    } catch (failure) {
      setError(failure.message);
    }
  };

  return (
    <>
      {error && <div role="alert" className="alert alert-error alert-soft mx-auto mb-4 max-w-4xl text-sm">{error}</div>}
      <ExtensionList
        title="Themes"
        description="Tema menentukan tampilan situs. Gunakan Preview untuk melihat hasilnya sebelum publish."
        endpoint="/themes"
        noun="tema"
        collection={collection}
        renderMeta={(item) => item.active && <span className="badge badge-success badge-soft badge-xs">Aktif</span>}
        renderActions={(item) => (
          <>
            {item.settings.length > 0 && (
              <Link to={`${path}/${item.id}`} className="btn btn-ghost btn-sm" aria-label={`Pengaturan ${item.name}`}>
                <Settings2 className="size-4" /> <span className="max-sm:hidden">Pengaturan</span>
              </Link>
            )}
            {!item.active && (
              <button type="button" className="btn btn-sm btn-primary" onClick={() => activate(item.id)}>
                Aktifkan
              </button>
            )}
          </>
        )}
      />
    </>
  );
}
