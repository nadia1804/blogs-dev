// Set warna pastel bersama: dipakai tag kategori dan fallback kartu tanpa gambar.
// Setiap pasangan bg/text punya kontras >= 4.5:1 (lolos audit aksesibilitas PageSpeed).
export const PASTELS = {
  rose: { label: 'Rose', bg: '#FFE4E9', text: '#9F1239' },
  peach: { label: 'Peach', bg: '#FFE8D6', text: '#9A3412' },
  lemon: { label: 'Lemon', bg: '#FEF6C3', text: '#854D0E' },
  mint: { label: 'Mint', bg: '#DCFCE7', text: '#166534' },
  aqua: { label: 'Aqua', bg: '#D5F5F6', text: '#155E75' },
  sky: { label: 'Sky', bg: '#DBEAFE', text: '#1E40AF' },
  lavender: { label: 'Lavender', bg: '#E6E4FF', text: '#3730A3' },
  lilac: { label: 'Lilac', bg: '#F3E1FF', text: '#6B21A8' },
  blush: { label: 'Blush', bg: '#FCE1F1', text: '#9D174D' },
  sand: { label: 'Sand', bg: '#F3EDE3', text: '#5C4A2E' },
};

export const PASTEL_KEYS = Object.keys(PASTELS);
