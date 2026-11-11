import { useMemo, useState } from 'react';
import { analyzeSeo } from '@blogs/core/seo-analysis';
import { ChevronDown } from 'lucide-react';

const DOT = { good: 'bg-success', warn: 'bg-warning', bad: 'bg-error' };
const ORDER = { bad: 0, warn: 1, good: 2 };

const scoreTone = (score) => (score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-error');

// Ringkasan analisis SEO: skor, lalu daftar pemeriksaan (yang bermasalah
// di atas). Dihitung ulang setiap dokumen berubah.
export function SeoAnalysis({ doc }) {
  const { score, checks } = useMemo(() => analyzeSeo(doc), [doc]);
  const [open, setOpen] = useState(true);
  const sorted = [...checks].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const issues = checks.filter((check) => check.status !== 'good').length;

  return (
    <div className="rounded-field border border-base-300">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left"
      >
        <span className={`text-2xl font-semibold tabular-nums ${scoreTone(score)}`}>{score}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Analisis SEO</span>
          <span className="block text-xs text-base-content/60">
            {issues ? `${issues} hal bisa diperbaiki` : 'Semua pemeriksaan lolos'}
          </span>
        </span>
        <ChevronDown className={`size-4 text-base-content/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="flex flex-col gap-2 border-t border-base-300 px-3 py-3">
          {sorted.map((check) => (
            <li key={check.id} className="flex gap-2 text-xs">
              <span className={`mt-1 size-2 shrink-0 rounded-full ${DOT[check.status]}`} aria-hidden="true" />
              <span>
                <span className="font-medium">{check.label}.</span>{' '}
                <span className="text-base-content/70">{check.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
