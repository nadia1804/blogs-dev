import { useEffect, useState } from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { persistent } from '../../lib/storage.js';
import { SchemaSection, meta as schemaMeta } from './properties/SchemaSection.jsx';
import { SeoSection, meta as seoMeta } from './properties/SeoSection.jsx';
import { SocialSection, meta as socialMeta } from './properties/SocialSection.jsx';
import { StatusSection, meta as statusMeta } from './properties/StatusSection.jsx';
import { TaxonomySection, meta as taxonomyMeta } from './properties/TaxonomySection.jsx';

const railButton =
  'flex size-10 cursor-pointer items-center justify-center rounded-field text-base-content/80 transition-colors hover:bg-base-content/10';

// Panel properti di sebelah editor, bisa dilipat seperti sidebar:
//   terbuka : semua bagian properti
//   dilipat : rel ikon 1x1; klik ikon membuka panel langsung di bagian itu
// Di layar sempit, panel yang terbuka menumpuk di atas editor.
export function PropertiesPanel({ editor, isPost, type, open, onToggle }) {
  const { doc, set, errors } = editor;
  const sections = [statusMeta, isPost && taxonomyMeta, seoMeta, socialMeta, schemaMeta].filter(Boolean);

  // Bagian yang dipilih dari rel ikon: digulir ke tampilan setelah panel terbuka.
  const [focus, setFocus] = useState(null);
  useEffect(() => {
    if (!open || !focus) return;
    document.getElementById(`prop-${focus}`)?.scrollIntoView({ block: 'start' });
    setFocus(null);
  }, [open, focus]);

  if (!open) {
    const openAt = (id) => {
      persistent.set(`section.${id}`, true); // bagian itu terbuka saat panel muncul
      setFocus(id);
      onToggle();
    };
    return (
      <aside aria-label="Properti" className="flex w-14 shrink-0 flex-col items-center gap-1 border-l border-base-300 bg-base-100 p-2">
        <div className="tooltip tooltip-left" data-tip="Buka properti">
          <button type="button" className={railButton} aria-label="Buka panel properti" aria-expanded={false} onClick={onToggle}>
            <PanelRightOpen className="size-5" />
          </button>
        </div>
        <div className="my-1 w-full border-t border-base-300" />
        {sections.map(({ id, title, icon: Icon }) => (
          <div key={id} className="tooltip tooltip-left" data-tip={title}>
            <button type="button" className={railButton} aria-label={title} onClick={() => openAt(id)}>
              <Icon className="size-5" />
            </button>
          </div>
        ))}
      </aside>
    );
  }

  return (
    <aside
      aria-label="Properti"
      className="flex w-80 shrink-0 flex-col border-l border-base-300 bg-base-100 max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-10 max-lg:shadow-xl"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-base-300 py-2 pl-4 pr-2">
        <h2 className="flex-1 text-sm font-semibold">Properti</h2>
        <div className="tooltip tooltip-left" data-tip="Lipat properti">
          <button type="button" className={railButton} aria-label="Lipat panel properti" aria-expanded onClick={onToggle}>
            <PanelRightClose className="size-5" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <StatusSection doc={doc} set={set} errors={errors} />
        {isPost && <TaxonomySection doc={doc} set={set} type={type} />}
        <SeoSection doc={doc} set={set} errors={errors} pathPrefix={isPost ? `/${type.id}` : ''} />
        <SocialSection doc={doc} set={set} />
        <SchemaSection doc={doc} set={set} type={type} />
      </div>
    </aside>
  );
}
