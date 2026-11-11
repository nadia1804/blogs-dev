import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ServerCrash } from 'lucide-react';
import { useLayerTitles } from '../lib/layer-title.js';
import { resolveLayers, usePathname } from '../lib/router.jsx';
import { useShortcuts } from '../lib/shortcuts.js';
import { persistent } from '../lib/storage.js';
import { ActionsProvider, useActions } from '../shell/actions.jsx';
import { Header } from '../shell/Header.jsx';
import { Sidebar } from '../shell/Sidebar.jsx';
import { Workspace } from '../shell/Workspace.jsx';
import { DataProvider, useData } from './data.jsx';
import { layerTitle, notFoundRoute, routes } from './routes.js';
import { applyTheme } from './themes.js';

function Shell() {
  const data = useData();
  const pathname = usePathname();
  const actions = useActions();
  const titles = useLayerTitles();
  useShortcuts(actions);

  const [collapsed, setCollapsed] = useState(() => persistent.get('sidebarCollapsed', window.innerWidth < 1024));
  const toggleSidebar = () =>
    setCollapsed((value) => {
      persistent.set('sidebarCollapsed', !value);
      return !value;
    });

  const layers = useMemo(() => resolveLayers(routes, pathname, notFoundRoute), [pathname]);
  const top = layers.at(-1);

  // Ingat layer terakhir, untuk dipulihkan saat shell dibuka lagi.
  useEffect(() => {
    persistent.set('lastPath', pathname);
  }, [pathname]);

  const theme = data.settings?.shell.theme;
  useEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);

  const ready = data.status === 'ready' || data.settings;
  useEffect(() => {
    if (ready) document.title = `${layerTitle(top, data, titles)} · Blogs CMS`;
  }, [ready, top, data, titles]);

  if (!ready) {
    return (
      <div className="grid h-screen place-items-center bg-base-200">
        {data.status === 'error' ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <ServerCrash className="size-10 text-error" />
            <p className="font-medium">{data.error.message}</p>
            <button type="button" className="btn btn-sm btn-primary" onClick={data.reload}>
              <RefreshCw className="size-4" /> Coba lagi
            </button>
          </div>
        ) : (
          <span className="loading loading-spinner loading-lg text-primary" aria-label="Memuat" />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden text-base-content">
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header layers={layers} />
        <Workspace layer={top} />
      </div>
    </div>
  );
}

export function App() {
  return (
    <DataProvider>
      <ActionsProvider>
        <Shell />
      </ActionsProvider>
    </DataProvider>
  );
}
