import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { persistent } from '../../../lib/storage.js';

// Bagian panel properti yang bisa dilipat. Keadaan buka/tutup diingat
// per bagian, jadi panel kembali seperti terakhir ditinggalkan.
export function Section({ id, title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(() => persistent.get(`section.${id}`, defaultOpen));
  const toggle = () =>
    setOpen((value) => {
      persistent.set(`section.${id}`, !value);
      return !value;
    });

  return (
    <section id={`prop-${id}`} className="border-b border-base-300">
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-base-content/5"
      >
        <Icon className="size-4 text-base-content/60" />
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown className={`size-4 text-base-content/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="flex flex-col gap-4 px-4 pb-5 pt-1">{children}</div>}
    </section>
  );
}
