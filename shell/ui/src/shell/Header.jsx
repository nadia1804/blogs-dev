import { ArrowLeft, Eye, Save, Send } from 'lucide-react';
import { useData } from '../app/data.jsx';
import { layerTitle } from '../app/routes.js';
import { useLayerTitles } from '../lib/layer-title.js';
import { Link, navigate } from '../lib/router.jsx';
import { SHORTCUTS } from '../lib/shortcuts.js';
import { useActions } from './actions.jsx';
import { Watcher } from './Watcher.jsx';

function ActionButton({ icon: Icon, label, shortcut, onClick, className = '' }) {
  return (
    <div className="tooltip tooltip-bottom" data-tip={`${label} (${shortcut})`}>
      <button type="button" className={`btn btn-sm ${className}`} onClick={onClick ?? undefined} disabled={!onClick}>
        <Icon className="size-4" />
        <span className="hidden lg:inline">{label}</span>
      </button>
    </div>
  );
}

// Panel 2: header sticky. Kiri: back + breadcrumb. Kanan: watcher dan aksi dokumen.
export function Header({ layers }) {
  const data = useData();
  const actions = useActions();
  const titles = useLayerTitles();
  const parent = layers.at(-2);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-base-300 bg-base-100 px-3">
      <div className="tooltip tooltip-right" data-tip="Kembali satu layer">
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square"
          aria-label="Kembali"
          disabled={!parent}
          onClick={() => navigate(parent.path)}
        >
          <ArrowLeft className="size-4" />
        </button>
      </div>

      <nav className="breadcrumbs min-w-0 flex-1 py-0 text-sm" aria-label="Breadcrumb">
        <ul>
          {layers.map((layer, index) => {
            const Icon = layer.route.icon;
            const content = (
              <>
                {Icon && <Icon className="size-4" />}
                <span className="max-w-48 truncate">{layerTitle(layer, data, titles)}</span>
              </>
            );
            return (
              <li key={layer.path}>
                {index === layers.length - 1 ? (
                  <span className="inline-flex items-center gap-2 font-medium" aria-current="page">{content}</span>
                ) : (
                  <Link to={layer.path} className="inline-flex items-center gap-2">{content}</Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <Watcher status={actions.status} onRetry={actions.save} />
        <ActionButton icon={Save} label="Save" shortcut={SHORTCUTS.save.label} onClick={actions.save} />
        <ActionButton icon={Send} label="Publish" shortcut={SHORTCUTS.publish.label} onClick={actions.publish} className="btn-primary" />
        <ActionButton icon={Eye} label="Preview" shortcut={SHORTCUTS.preview.label} onClick={actions.preview} />
      </div>
    </header>
  );
}
