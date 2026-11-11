export { PASTELS, PASTEL_KEYS } from './palette.js';

// Aset brand bawaan. Path relatif terhadap folder data.
export const BRAND_ASSETS = {
  logo: 'media/brand/logo.png',
  icon: 'media/brand/icon.png',
  ogImage: 'media/brand/og-default.png',
};

// Nilai awal settings.json. Sisanya diisi default dari skema.
export const DEFAULT_SETTINGS = {
  site: {
    title: 'Blogs',
    tagline: 'Ruang baca & Media belajar',
    description: 'Kumpulan tulisan, modul pelajaran, dan dokumentasi.',
    language: 'id',
    logo: BRAND_ASSETS.logo,
    icon: BRAND_ASSETS.icon,
    ogImage: BRAND_ASSETS.ogImage,
  },
  hero: {
    title: 'Ruang baca & Media belajar',
    subtitle: 'Kumpulan tulisan, modul pelajaran, dan dokumentasi.',
  },
};

// Content schema (JSON-LD) yang bisa dipilih admin, beserta field-nya.
// Definisinya ada di schema-types/index.js.
export { CONTENT_SCHEMAS } from '../schema-types/index.js';

// Menu bawaan. Tema default memakai 'header' dan 'footer'.
export const DEFAULT_NAVIGATION = [
  {
    id: 'header',
    label: 'Header',
    items: [{ id: 'home', label: 'Beranda', icon: 'house', target: { kind: 'home' } }],
  },
  { id: 'footer', label: 'Footer', items: [] },
];

// Post type bawaan. `system: true` berarti tidak bisa dihapus.
export const DEFAULT_POST_TYPES = [
  {
    id: 'blog',
    label: 'Blog',
    labelPlural: 'Blog',
    icon: 'newspaper',
    system: true,
    defaultSchema: 'BlogPosting',
    fallbackColors: ['sky', 'mint', 'lavender', 'peach', 'rose'],
  },
];
