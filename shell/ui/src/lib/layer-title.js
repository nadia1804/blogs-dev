import { useEffect, useSyncExternalStore } from 'react';

// Judul layer yang ditentukan isi layer itu sendiri (mis. nama author),
// menggantikan judul statis rute di breadcrumb.
let titles = {};
const listeners = new Set();

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function setTitle(path, title) {
  if (titles[path] === title) return;
  titles = { ...titles };
  if (title) titles[path] = title;
  else delete titles[path];
  listeners.forEach((listener) => listener());
}

export function useLayerTitle(path, title) {
  useEffect(() => {
    setTitle(path, title);
    return () => setTitle(path, null);
  }, [path, title]);
}

export const useLayerTitles = () => useSyncExternalStore(subscribe, () => titles);
