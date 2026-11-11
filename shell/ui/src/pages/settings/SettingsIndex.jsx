import { Archive, ChevronRight, GitBranch, Globe, Image, Paintbrush, Rocket, Search, Shapes, Timer, Zap } from 'lucide-react';
import { Link } from '../../lib/router.jsx';

// Bagian pengaturan. Tanpa `to` = belum tersedia; `stage` = tahap pengerjaannya.
const SECTIONS = [
  { to: '/settings/site', icon: Globe, label: 'Identitas situs', note: 'Judul, tagline, logo, ikon, hero' },
  { to: '/settings/seo', icon: Search, label: 'SEO global', note: 'Template judul, indeks, verifikasi' },
  { to: '/settings/post-types', icon: Shapes, label: 'Post type', note: 'Blog, pelajaran, game, dan lainnya' },
  { to: '/settings/images', icon: Image, label: 'Gambar', note: 'Kualitas, breakpoint, lebar maksimum' },
  { to: '/settings/watcher', icon: Timer, label: 'Watcher', note: 'Jeda autosave' },
  { to: '/settings/appearance', icon: Paintbrush, label: 'Tampilan', note: 'Preset tema backend' },
  { to: '/settings/caching', icon: Zap, label: 'Caching', note: 'Prefetch dan cache lokal' },
  { to: '/settings/publish', icon: Rocket, label: 'Publish', note: 'Bangun situs dan unggah ke Netlify atau Vercel' },
  { to: '/settings/backup', icon: Archive, label: 'Backup dan restore', note: 'Unduh atau pulihkan seluruh konten' },
  { stage: '8', icon: GitBranch, label: 'GitHub', note: 'Shell kedua untuk menulis lewat GitHub' },
];

export function SettingsIndex() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-5 text-xl font-semibold">Settings</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map(({ to, stage, icon: Icon, label, note }) => {
          const body = (
            <div className="card-body flex-row items-center gap-3 p-4">
              <span className="grid size-11 place-items-center rounded-box bg-primary/10 text-primary">
                <Icon className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{label}</span>
                <span className="block truncate text-sm text-base-content/70">{note}</span>
              </span>
              {to ? (
                <ChevronRight className="size-4 text-base-content/40" />
              ) : (
                <span className="badge badge-soft badge-info badge-sm">Tahap {stage}</span>
              )}
            </div>
          );
          return (
            <li key={label}>
              {to ? (
                <Link to={to} className="card card-border bg-base-100 transition-colors hover:border-primary">{body}</Link>
              ) : (
                <div className="card card-border bg-base-100 opacity-60">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
