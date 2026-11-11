import { persistent } from '../lib/storage.js';

export const DEFAULT_THEME = 'github';

// Preset tema backend (tema bawaan daisyUI), dikelompokkan terang/gelap.
export const THEME_GROUPS = [
  // Preset buatan sendiri, didefinisikan di styles.css.
  { label: 'Custom', themes: ['github', 'githubdark'] },
  {
    label: 'Terang',
    themes: [
      'corporate', 'light', 'winter', 'nord', 'silk', 'emerald', 'lofi', 'wireframe', 'cmyk', 'fantasy',
      'pastel', 'cupcake', 'garden', 'autumn', 'bumblebee', 'lemonade', 'caramellatte', 'retro',
      'valentine', 'acid', 'cyberpunk',
    ],
  },
  {
    label: 'Gelap',
    themes: [
      'business', 'dark', 'dim', 'night', 'abyss', 'dracula', 'sunset', 'forest', 'aqua', 'coffee',
      'luxury', 'black', 'synthwave', 'halloween',
    ],
  },
];

const LABELS = { github: 'GitHub Light', githubdark: 'GitHub Dark' };

export const themeLabel = (name) => LABELS[name] ?? name[0].toUpperCase() + name.slice(1);

const DARK = new Set(['githubdark', ...THEME_GROUPS.find((group) => group.label === 'Gelap').themes]);

export const isDarkTheme = (name) => DARK.has(name);

const KNOWN = new Set(THEME_GROUPS.flatMap((group) => group.themes));

// Pasang tema ke <html>, dan simpan salinannya di browser supaya saat
// shell dibuka lagi tema langsung benar sebelum settings selesai dimuat.
export function applyTheme(theme) {
  const name = KNOWN.has(theme) ? theme : DEFAULT_THEME;
  document.documentElement.dataset.theme = name;
  persistent.set('theme', name);
}

export const applyCachedTheme = () => applyTheme(persistent.get('theme', DEFAULT_THEME));
