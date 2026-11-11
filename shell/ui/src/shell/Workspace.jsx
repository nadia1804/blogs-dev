import { useEffect, useLayoutEffect, useRef } from 'react';
import { session } from '../lib/storage.js';

// Panel 3: workspace. Menampilkan layer teratas dan mengingat posisi scroll
// tiap layer, sehingga "back" kembali ke posisi semula.
//
// Rute dengan `fullBleed: true` (editor) mengisi seluruh workspace dan
// mengatur area scroll-nya sendiri.
export function Workspace({ layer }) {
  const container = useRef(null);
  const { component: Component, props, fullBleed = false } = layer.route;

  useLayoutEffect(() => {
    if (fullBleed) return;
    const positions = session.get('scroll', {});
    container.current.scrollTop = positions[layer.path] ?? 0;
  }, [layer.path, fullBleed]);

  useEffect(() => {
    if (fullBleed) return undefined;
    const element = container.current;
    let timer;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        session.set('scroll', { ...session.get('scroll', {}), [layer.path]: element.scrollTop });
      }, 150);
    };
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      element.removeEventListener('scroll', onScroll);
    };
  }, [layer.path, fullBleed]);

  return (
    <main
      ref={container}
      className={`min-h-0 flex-1 bg-base-200 ${fullBleed ? 'overflow-hidden' : 'overflow-y-auto p-4 md:p-6'}`}
    >
      <Component key={layer.path} {...props} params={layer.params} path={layer.path} />
    </main>
  );
}
