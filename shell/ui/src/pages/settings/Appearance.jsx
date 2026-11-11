import { useState } from 'react';
import { Check } from 'lucide-react';
import { useData } from '../../app/data.jsx';
import { DEFAULT_THEME, THEME_GROUPS, themeLabel } from '../../app/themes.js';

// Kartu pratinjau: atribut data-theme membuat isi kartu memakai warna
// tema tersebut, apa pun tema shell yang sedang aktif.
function ThemeCard({ name, active, onSelect }) {
  return (
    <button
      type="button"
      data-theme={name}
      aria-pressed={active}
      onClick={() => onSelect(name)}
      className={`rounded-box border bg-base-100 p-3 text-left text-base-content transition-shadow hover:shadow-md ${
        active ? 'border-primary ring-2 ring-primary' : 'border-base-300'
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{themeLabel(name)}</span>
        {active ? (
          <Check className="size-4 shrink-0 text-primary" />
        ) : (
          name === DEFAULT_THEME && <span className="badge badge-ghost badge-xs">Default</span>
        )}
      </span>
      <span className="mt-2 flex gap-1">
        <span className="h-6 flex-1 rounded-selector bg-primary" />
        <span className="h-6 flex-1 rounded-selector bg-secondary" />
        <span className="h-6 flex-1 rounded-selector bg-accent" />
        <span className="h-6 flex-1 rounded-selector bg-neutral" />
      </span>
      <span className="mt-2 flex items-center gap-1 rounded-field bg-base-200 p-1.5">
        <span className="btn btn-primary btn-xs pointer-events-none">Aa</span>
        <span className="badge badge-success badge-xs" />
        <span className="badge badge-warning badge-xs" />
        <span className="badge badge-error badge-xs" />
      </span>
    </button>
  );
}

export function Appearance() {
  const { settings, saveSettings } = useData();
  const [error, setError] = useState(null);
  const current = settings.shell.theme;

  const select = async (theme) => {
    if (theme === current) return;
    setError(null);
    try {
      await saveSettings({ ...settings, shell: { ...settings.shell, theme } });
    } catch (failure) {
      setError(failure.message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold">Tampilan</h1>
      <p className="mb-5 text-sm text-base-content/70">
        Preset tema untuk backend. Klik untuk langsung menerapkan; pilihan tersimpan otomatis dan tidak
        memengaruhi tampilan situs.
      </p>

      {error && (
        <div role="alert" className="alert alert-error alert-soft mb-4 text-sm">Gagal menyimpan tema: {error}</div>
      )}

      {THEME_GROUPS.map((group) => (
        <section key={group.label} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-base-content/70">{group.label}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {group.themes.map((name) => (
              <ThemeCard key={name} name={name} active={name === current} onSelect={select} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
