import { ArrowRight, Construction, SearchX } from 'lucide-react';
import { Link } from '../lib/router.jsx';

// Halaman sementara untuk bagian yang dikerjakan di tahap berikutnya.
export function Placeholder({ stage, note, demo, path }) {
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 text-center">
      <Construction className="size-10 text-base-content/40" />
      <h2 className="text-lg font-semibold">Belum tersedia</h2>
      <p className="text-sm text-base-content/70">{note}</p>
      <span className="badge badge-soft badge-info">Dikerjakan di tahap {stage}</span>
      {demo && (
        <Link to={`${path}/contoh`} className="btn btn-sm btn-ghost mt-2">
          {demo} <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 text-center">
      <SearchX className="size-10 text-base-content/40" />
      <h2 className="text-lg font-semibold">Halaman tidak ditemukan</h2>
      <Link to="/" className="btn btn-sm btn-primary">Ke Home</Link>
    </div>
  );
}
