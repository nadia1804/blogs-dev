import { useSyncExternalStore } from 'react';

// Router layer. URL adalah tumpukan layer workspace:
//   /posts/blog/abc  ->  [Post] > [Blog] > [dokumen abc]
// Setiap awalan path yang cocok dengan sebuah rute menjadi satu layer.
// "Back" berarti turun satu layer, bukan mundur di riwayat browser.

const listeners = new Set();
const notify = () => listeners.forEach((listener) => listener());
window.addEventListener('popstate', notify);

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Penjaga navigasi: form yang punya perubahan belum tersimpan memasang
// fungsi yang mengembalikan false untuk membatalkan perpindahan layer.
let guard = null;

export function setNavigationGuard(check) {
  guard = check;
  return () => {
    if (guard === check) guard = null;
  };
}

export function navigate(to, { replace = false, force = false } = {}) {
  if (to === window.location.pathname) return;
  if (!force && guard && !guard()) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', to);
  notify();
}

export const usePathname = () => useSyncExternalStore(subscribe, () => window.location.pathname);

// Cocokkan "/posts/:type" dengan "/posts/blog" -> { type: 'blog' } atau null.
export function matchPattern(pattern, path) {
  const want = pattern.split('/').filter(Boolean);
  const have = path.split('/').filter(Boolean);
  if (want.length !== have.length) return null;
  const params = {};
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(':')) params[want[i].slice(1)] = decodeURIComponent(have[i]);
    else if (want[i] !== have[i]) return null;
  }
  return params;
}

// Uraikan pathname menjadi tumpukan layer. Layer teratas adalah yang terakhir.
// Path yang tidak cocok dengan rute mana pun menghasilkan layer `notFound`.
export function resolveLayers(routes, pathname, notFound) {
  const segments = pathname.split('/').filter(Boolean);
  const prefixes = segments.length
    ? segments.map((_, index) => '/' + segments.slice(0, index + 1).join('/'))
    : ['/'];

  const layers = [];
  for (const path of prefixes) {
    for (const route of routes) {
      const params = matchPattern(route.pattern, path);
      if (params) {
        layers.push({ path, route, params });
        break;
      }
    }
  }
  const top = layers.at(-1);
  if (!top || top.path !== prefixes.at(-1)) {
    layers.push({ path: pathname, route: notFound, params: {} });
  }
  return layers;
}

// Hyperlink antar layer. Klik biasa ditangani router; Ctrl/klik-tengah
// tetap membuka tab baru seperti link biasa.
export function Link({ to, onClick, ...props }) {
  return (
    <a
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(to);
      }}
      {...props}
    />
  );
}
