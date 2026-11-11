import { useEffect, useMemo, useState } from 'react';
import { Ban, ChevronDown, Search, X } from 'lucide-react';
import { isEducation, loadTablerCatalog, LUCIDE_EDUCATION, TABLER_PREFIX } from '../lib/tabler-icons.js';
import { AppIcon, RawIcon } from './AppIcon.jsx';
import { Field } from './fields.jsx';

const VISIBLE_LIMIT = 240; // jumlah ikon yang digambar sekaligus

const TABS = [
  { id: 'education', label: 'Pendidikan' },
  { id: 'lucide', label: 'Lucide' },
  { id: 'tabler', label: 'Tabler' },
];

// Muat kedua pack saat popup dibuka, dan susun satu daftar seragam:
//   { value, name, search, education, pack, render(className) }
// `value` adalah yang disimpan: nama Lucide, atau "tabler:nama".
function useIconSets() {
  const [state, setState] = useState({ status: 'loading', icons: [] });

  useEffect(() => {
    let cancelled = false;
    Promise.all([import('../lib/all-icons.js'), loadTablerCatalog()]).then(
      ([lucide, tabler]) => {
        if (cancelled) return;
        const education = new Set(LUCIDE_EDUCATION);
        const icons = [
          ...lucide.ICONS.map(({ name, Component }) => ({
            value: name,
            name,
            search: name,
            pack: 'lucide',
            education: education.has(name),
            render: (className) => <Component className={className} />,
          })),
          ...tabler.map((entry) => ({
            value: `${TABLER_PREFIX}${entry.name}`,
            name: entry.name,
            search: `${entry.name} ${entry.tags}`.toLowerCase(),
            pack: 'tabler',
            education: isEducation(entry),
            render: (className) => <RawIcon body={entry.body} className={className} />,
          })),
        ];
        setState({ status: 'ready', icons });
      },
      () => !cancelled && setState({ status: 'error', icons: [] }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function IconDialog({ value, allowEmpty, onSelect, onClose }) {
  const { status, icons } = useIconSets();
  const [tab, setTab] = useState('education');
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const words = query.toLowerCase().split(/[\s-]+/).filter(Boolean);
    return icons.filter(
      (icon) => (tab === 'education' ? icon.education : icon.pack === tab) && words.every((word) => icon.search.includes(word)),
    );
  }, [icons, tab, query]);

  const visible = matches.slice(0, VISIBLE_LIMIT);

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="Pilih ikon">
      <div className="modal-box flex h-[34rem] max-w-2xl flex-col p-0">
        <div className="flex items-center gap-2 border-b border-base-300 p-3">
          <label className="input input-sm flex-1">
            <Search className="size-4 text-base-content/50" />
            <input
              type="search"
              className="grow"
              placeholder="Cari ikon (bahasa Inggris, mis. book, math, school)"
              aria-label="Cari ikon"
              value={query}
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Escape' && onClose()}
            />
          </label>
          <button type="button" className="btn btn-ghost btn-sm btn-square" aria-label="Tutup" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>

        <div role="tablist" className="tabs tabs-border flex-none px-3">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`tab ${tab === item.id ? 'tab-active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {status === 'error' ? (
            <p className="p-6 text-center text-sm text-error">Daftar ikon gagal dimuat.</p>
          ) : status === 'loading' ? (
            <div className="grid h-full place-items-center">
              <span className="loading loading-spinner text-primary" aria-label="Memuat ikon" />
            </div>
          ) : matches.length === 0 ? (
            <p className="p-6 text-center text-sm text-base-content/60">
              Tidak ada ikon yang cocok dengan "{query}" di tab ini. Coba tab lain.
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1">
              {allowEmpty && !query && (
                <button
                  type="button"
                  title="Tanpa ikon"
                  aria-label="Tanpa ikon"
                  aria-pressed={!value}
                  onClick={() => onSelect('')}
                  className={`btn btn-square btn-ghost ${!value ? 'btn-active' : ''}`}
                >
                  <Ban className="size-5 text-base-content/40" />
                </button>
              )}
              {visible.map((icon) => (
                <button
                  key={icon.value}
                  type="button"
                  title={icon.name}
                  aria-label={icon.name}
                  aria-pressed={icon.value === value}
                  onClick={() => onSelect(icon.value)}
                  className={`btn btn-square ${icon.value === value ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {icon.render('size-5')}
                </button>
              ))}
            </div>
          )}
        </div>

        {status === 'ready' && (
          <p className="flex-none border-t border-base-300 px-3 py-2 text-xs text-base-content/60">
            {matches.length > VISIBLE_LIMIT
              ? `Menampilkan ${VISIBLE_LIMIT} dari ${matches.length} ikon. Ketik kata kunci untuk mempersempit.`
              : `${matches.length} ikon`}
          </p>
        )}
      </div>
      <button type="button" className="modal-backdrop" aria-label="Tutup" onClick={onClose} />
    </div>
  );
}

// Field pemilih ikon: tombol yang membuka popup berisi ikon dari dua pack
// (Lucide dan Tabler), dengan tab khusus ikon pendidikan.
// Nilainya nama ikon (mis. "gamepad-2" atau "tabler:school");
// `allowEmpty` mengizinkan tanpa ikon.
export function IconPickerField({ label, hint, error, value, onChange, allowEmpty = false }) {
  const [open, setOpen] = useState(false);

  return (
    <Field label={label} hint={hint} error={error}>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`btn justify-start gap-3 font-normal ${error ? 'btn-outline btn-error' : ''}`}
      >
        {value ? <AppIcon name={value} className="size-5" /> : <Ban className="size-5 text-base-content/40" />}
        <span className="flex-1 truncate text-left">{value ? value.replace(TABLER_PREFIX, '') : 'Tanpa ikon'}</span>
        <ChevronDown className="size-4 text-base-content/50" />
      </button>
      {open && (
        <IconDialog
          value={value}
          allowEmpty={allowEmpty}
          onClose={() => setOpen(false)}
          onSelect={(name) => {
            onChange(name);
            setOpen(false);
          }}
        />
      )}
    </Field>
  );
}
