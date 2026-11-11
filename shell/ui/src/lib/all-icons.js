// Seluruh pack Lucide. Berat, jadi modul ini hanya dimuat (dynamic import)
// saat popup pemilih ikon dibuka.
import { icons } from 'lucide-react';
import { iconNames } from 'lucide-react/dynamic';

const toPascal = (name) => name.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('');

// Satu entri per ikon: nama alias lama dibuang.
const seen = new Set();
export const ICONS = iconNames.flatMap((name) => {
  const Component = icons[toPascal(name)];
  if (!Component || seen.has(Component)) return [];
  seen.add(Component);
  return [{ name, Component }];
});
