import { useEffect, useState } from 'react';
import { File, FileText, Users } from 'lucide-react';
import { useData } from '../app/data.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { api } from '../lib/api.js';
import { formatDateTime } from '../lib/format.js';
import { Link } from '../lib/router.jsx';

const RECENT_LIMIT = 8;

function StatCard({ to, icon: Icon, label, count }) {
  return (
    <Link to={to} className="card card-border bg-base-100 transition-colors hover:border-primary">
      <div className="card-body flex-row items-center gap-3 p-4">
        <span className="grid size-11 place-items-center rounded-box bg-primary/10 text-primary">
          <Icon className="size-6" />
        </span>
        <span>
          <span className="block text-2xl font-semibold leading-tight">{count ?? '–'}</span>
          <span className="block text-sm text-base-content/70">{label}</span>
        </span>
      </div>
    </Link>
  );
}

// Muat semua daftar yang diringkas di Home dalam satu kali jalan.
async function loadOverview(postTypes) {
  const sources = [
    ...postTypes.map((type) => ({ key: `posts/${type.id}`, path: `/posts/${type.id}`, kind: type.label })),
    { key: 'pages', path: '/pages', kind: 'Page' },
    { key: 'authors', path: '/authors' },
  ];
  const lists = await Promise.all(sources.map((source) => api.get(source.path).catch(() => null)));

  const counts = {};
  const recent = [];
  sources.forEach((source, index) => {
    const items = lists[index];
    counts[source.key] = items ? items.length : null;
    if (items && source.kind) {
      for (const item of items) recent.push({ ...item, kind: source.kind, to: `${source.path}/${item.id}` });
    }
  });
  recent.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return { counts, recent: recent.slice(0, RECENT_LIMIT) };
}

export function Home() {
  const { settings, postTypes } = useData();
  const [overview, setOverview] = useState({ counts: {}, recent: null });

  useEffect(() => {
    let cancelled = false;
    loadOverview(postTypes).then((result) => !cancelled && setOverview(result));
    return () => {
      cancelled = true;
    };
  }, [postTypes]);

  const { counts, recent } = overview;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-semibold">{settings.site.title}</h1>
      <p className="mb-5 text-sm text-base-content/70">{settings.site.tagline}</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {postTypes.map((type) => (
          <StatCard
            key={type.id}
            to={`/posts/${type.id}`}
            icon={FileText}
            label={`Post ${type.label}`}
            count={counts[`posts/${type.id}`]}
          />
        ))}
        <StatCard to="/pages" icon={File} label="Page" count={counts.pages} />
        <StatCard to="/authors" icon={Users} label="Authors" count={counts.authors} />
      </div>

      <h2 className="mb-2 mt-8 text-sm font-semibold text-base-content/70">Terakhir diubah</h2>
      <div className="card card-border bg-base-100">
        {recent === null ? (
          <div className="grid h-24 place-items-center">
            <span className="loading loading-spinner text-primary" aria-label="Memuat" />
          </div>
        ) : recent.length === 0 ? (
          <p className="p-6 text-center text-sm text-base-content/60">Belum ada konten. Mulai dari menu Post atau Page.</p>
        ) : (
          <ul className="divide-y divide-base-300">
            {recent.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="flex items-center gap-3 px-4 py-3 hover:bg-base-200/50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.title || '(Tanpa judul)'}</span>
                    <span className="block text-xs text-base-content/60">
                      {item.kind} · {formatDateTime(item.updatedAt)}
                    </span>
                  </span>
                  <StatusBadge status={item.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
