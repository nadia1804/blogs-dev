import { ChevronRight, FileText, Settings2 } from 'lucide-react';
import { AppIcon } from '../components/AppIcon.jsx';
import { useData } from '../app/data.jsx';
import { Link } from '../lib/router.jsx';

const Fallback = () => <FileText className="size-6" />;

// Post dan Category terisolasi per post type, jadi keduanya memilih
// post type dulu. `base` = "/posts" atau "/categories".
export function PostTypeChooser({ base, heading }) {
  const { postTypes } = useData();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-xl font-semibold">{heading}</h1>
      <p className="mb-5 text-sm text-base-content/70">Pilih post type untuk melanjutkan.</p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {postTypes.map((type) => (
          <li key={type.id}>
            <Link
              to={`${base}/${type.id}`}
              className="card card-border bg-base-100 transition-colors hover:border-primary"
            >
              <div className="card-body flex-row items-center gap-3 p-4">
                <span className="grid size-11 place-items-center rounded-box bg-primary/10 text-primary">
                  <AppIcon name={type.icon} className="size-6" fallback={Fallback} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{type.label}</span>
                  <span className="block truncate text-xs text-base-content/60">/{type.id}</span>
                </span>
                <ChevronRight className="size-4 text-base-content/40" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/settings/post-types" className="btn btn-ghost btn-sm mt-4">
        <Settings2 className="size-4" /> Kelola post type
      </Link>
    </div>
  );
}
