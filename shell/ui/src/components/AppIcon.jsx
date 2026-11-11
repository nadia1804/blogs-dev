import { useEffect, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';
import { isTabler, loadTablerIcon, TABLER_PREFIX } from '../lib/tabler-icons.js';

const SVG_PROPS = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

// Ikon dari isi SVG mentah. Isinya berasal dari paket ikon di server
// sendiri (bukan masukan pengguna), jadi aman disisipkan langsung.
export const RawIcon = ({ body, className }) => (
  <svg {...SVG_PROPS} className={className} dangerouslySetInnerHTML={{ __html: body }} />
);

const Unknown = ({ className }) => <CircleHelp className={`${className} text-warning`} />;

// Ikon berdasarkan nama tersimpan, dari pack mana pun:
//   "house"          Lucide
//   "tabler:school"  Tabler
export function AppIcon({ name, className = 'size-5', fallback: Fallback = Unknown }) {
  const tabler = isTabler(name);
  const [body, setBody] = useState(null);

  useEffect(() => {
    if (!tabler) return undefined;
    let cancelled = false;
    setBody(null);
    loadTablerIcon(name.slice(TABLER_PREFIX.length)).then((value) => !cancelled && setBody(value));
    return () => {
      cancelled = true;
    };
  }, [name, tabler]);

  if (!name) return <Fallback className={className} />;
  if (!tabler) return <DynamicIcon key={name} name={name} className={className} fallback={() => <Fallback className={className} />} />;
  if (body === null) return <span className={`${className} inline-block`} />; // sedang dimuat
  return body ? <RawIcon body={body} className={className} /> : <Fallback className={className} />;
}
