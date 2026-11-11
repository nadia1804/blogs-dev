import { lazy, Suspense, useState } from 'react';
import { History } from 'lucide-react';
import { useData } from '../../app/data.jsx';
import { isDarkTheme } from '../../app/themes.js';
import { formatDateTime } from '../../lib/format.js';
import { persistent } from '../../lib/storage.js';
import { useDocEditor } from '../../lib/useDocEditor.js';
import { NotFound } from '../Placeholder.jsx';
import { PropertiesPanel } from './PropertiesPanel.jsx';

const BlockEditor = lazy(() => import('./BlockEditor.jsx'));

const Spinner = () => (
  <div className="grid h-40 place-items-center">
    <span className="loading loading-spinner text-primary" aria-label="Memuat" />
  </div>
);

function DraftNotice({ editor }) {
  if (editor.staleDraft) {
    return (
      <div role="status" className="alert alert-warning alert-soft mb-4 text-sm">
        <History className="size-4" />
        <span>
          Ada draft otomatis dari {formatDateTime(editor.staleDraft.savedAt)}, dibuat sebelum dokumen ini terakhir
          disimpan.
        </span>
        <div className="flex gap-2">
          <button type="button" className="btn btn-xs" onClick={editor.applyStaleDraft}>Pakai draft</button>
          <button type="button" className="btn btn-xs btn-ghost" onClick={editor.discardDraft}>Buang</button>
        </div>
      </div>
    );
  }
  if (editor.restoredAt) {
    return (
      <div role="status" className="alert alert-info alert-soft mb-4 text-sm">
        <History className="size-4" />
        <span>Draft otomatis dari {formatDateTime(editor.restoredAt)} dipulihkan. Tekan Save untuk menyimpannya.</span>
        <button type="button" className="btn btn-xs btn-ghost" onClick={editor.discardDraft}>Buang draft</button>
      </div>
    );
  }
  return null;
}

// Layer editor untuk post dan page.
//   kind = 'posts' | 'pages'
export function DocEditor({ kind, params, path }) {
  const { settings, postTypes } = useData();
  const isPost = kind === 'posts';
  const type = isPost ? postTypes.find((item) => item.id === params.type) : null;

  const editor = useDocEditor({
    endpoint: isPost ? `/posts/${params.type}` : '/pages',
    draftEndpoint: isPost ? `/drafts/posts/${params.type}` : '/drafts/pages',
    id: params.id,
    path,
    kind: isPost ? 'post' : 'page',
  });

  const [panelOpen, setPanelOpen] = useState(() => persistent.get('propertiesOpen', window.innerWidth >= 1024));
  const togglePanel = () =>
    setPanelOpen((open) => {
      persistent.set('propertiesOpen', !open);
      return !open;
    });

  if ((isPost && !type) || editor.loadError?.status === 404) return <NotFound />;
  if (editor.loadError) return <p className="p-10 text-center text-sm text-error">{editor.loadError.message}</p>;
  const { doc } = editor;
  if (!doc) return <Spinner />;

  const messages = Object.values(editor.errors);

  return (
    <div className="relative flex h-full min-h-0">
      <div className="min-w-0 flex-1 overflow-y-auto bg-base-100">
        <div className="mx-auto max-w-3xl px-2 pb-24 pt-8 sm:px-6">
          <div className="px-[54px]">
            <DraftNotice editor={editor} />
            {messages.length > 0 && (
              <div role="alert" className="alert alert-error alert-soft mb-4 text-sm">
                <ul>{messages.map((message) => <li key={message}>{message}</li>)}</ul>
              </div>
            )}
            <textarea
              rows={1}
              value={doc.title}
              placeholder="Judul"
              aria-label="Judul"
              onChange={(event) => editor.set({ title: event.target.value.replace(/\n/g, ' ') })}
              className="field-sizing-content mb-4 w-full resize-none overflow-hidden bg-transparent text-3xl font-bold leading-tight outline-none placeholder:text-base-content/30"
            />
          </div>
          <Suspense fallback={<Spinner />}>
            <BlockEditor
              key={editor.contentKey}
              initialContent={doc.content}
              dark={isDarkTheme(settings.shell.theme)}
              onChange={(content) => editor.set({ content })}
            />
          </Suspense>
        </div>
      </div>

      <PropertiesPanel editor={editor} isPost={isPost} type={type} open={panelOpen} onToggle={togglePanel} />
    </div>
  );
}
