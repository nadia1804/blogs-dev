import { api } from './api.js';

// Pack ikon kedua (Tabler). Nama ikonnya disimpan dengan awalan "tabler:".
export const TABLER_PREFIX = 'tabler:';
export const isTabler = (name) => typeof name === 'string' && name.startsWith(TABLER_PREFIX);

// Katalog lengkap, dimuat sekali saat pemilih ikon pertama kali membutuhkannya.
let catalog = null;
export function loadTablerCatalog() {
  catalog ??= api.get('/icons/tabler').catch((error) => {
    catalog = null;
    throw error;
  });
  return catalog;
}

// Isi SVG satu ikon, untuk menampilkan ikon yang sudah dipilih.
const bodies = new Map();
export function loadTablerIcon(name) {
  if (!bodies.has(name)) {
    bodies.set(
      name,
      fetch(`/api/icons/tabler/${encodeURIComponent(name)}`)
        .then((response) => (response.ok ? response.text() : ''))
        .then((svg) => svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>')))
        .catch(() => ''),
    );
  }
  return bodies.get(name);
}

// Ikon Tabler bertema pendidikan: dikenali dari kata kunci dan kategorinya.
const EDUCATION_WORDS = [
  'education', 'school', 'learning', 'study', 'student', 'teacher', 'university', 'college', 'academic',
  'classroom', 'lesson', 'book', 'library', 'math', 'science', 'chemistry', 'physics', 'biology', 'laboratory',
  'graduation', 'exam', 'homework', 'knowledge', 'alphabet', 'abacus', 'calculator', 'geometry', 'pencil',
  'notebook', 'chalkboard', 'blackboard', 'certificate', 'diploma', 'microscope', 'atom', 'globe', 'language',
  'reading', 'writing', 'quiz', 'puzzle', 'brain', 'idea',
];
const EDUCATION = new RegExp(`\\b(${EDUCATION_WORDS.join('|')})`, 'i');

export const isEducation = (entry) => entry.category === 'Math' || EDUCATION.test(`${entry.name} ${entry.tags}`);

// Ikon Lucide bertema pendidikan. Lucide tidak menyertakan kata kunci,
// jadi daftarnya ditulis tangan; nama yang tidak ada di pack diabaikan.
export const LUCIDE_EDUCATION = [
  'graduation-cap', 'school', 'university', 'book', 'book-open', 'book-open-text', 'book-open-check', 'book-a',
  'book-marked', 'book-text', 'books', 'library', 'library-big', 'notebook', 'notebook-pen', 'notebook-text',
  'notepad-text', 'pencil', 'pencil-line', 'pencil-ruler', 'pen', 'pen-tool', 'highlighter', 'eraser', 'ruler',
  'calculator', 'sigma', 'pi', 'percent', 'divide', 'plus', 'minus', 'equal', 'infinity', 'square-function',
  'triangle', 'shapes', 'atom', 'flask-conical', 'flask-round', 'test-tube', 'test-tubes', 'microscope', 'dna',
  'telescope', 'magnet', 'orbit', 'globe', 'earth', 'map', 'languages', 'spell-check', 'whole-word', 'baseline',
  'brain', 'lightbulb', 'puzzle', 'blocks', 'gamepad-2', 'dices', 'trophy', 'award', 'medal', 'star', 'target',
  'presentation', 'projector', 'backpack', 'apple', 'clipboard-list', 'clipboard-check', 'list-checks',
  'file-question', 'circle-help', 'message-circle-question', 'users', 'user-round-check', 'calendar-days',
  'clock', 'timer', 'music', 'palette', 'paintbrush', 'drama', 'video', 'headphones', 'mic', 'laptop', 'tablet',
];
