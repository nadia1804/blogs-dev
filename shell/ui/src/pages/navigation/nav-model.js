// Model penyusun menu. Di layar, menu berupa daftar datar dengan tingkat:
//   depth 0 = item utama, depth 1 = submenu dari item utama di atasnya.
// Di penyimpanan, menu berupa pohon (items[].children[]). Semua fungsi di
// sini murni: menerima daftar, mengembalikan daftar baru.

export const newItem = () => ({
  id: crypto.randomUUID().slice(0, 8),
  label: '',
  icon: '',
  target: { kind: 'home' },
  depth: 0,
});

// Pohon -> daftar datar.
export const flatten = (items) =>
  items.flatMap(({ children = [], ...item }) => [
    { ...item, depth: 0 },
    ...children.map((child) => ({ ...child, depth: 1 })),
  ]);

// Jaga aturan: item pertama selalu utama, dan submenu hanya satu tingkat.
export const normalize = (flat) =>
  flat.map((item, index) => ({ ...item, depth: index === 0 ? 0 : Math.min(item.depth, 1) }));

// Daftar datar -> pohon.
export function toTree(flat) {
  const tree = [];
  for (const { depth, ...item } of normalize(flat)) {
    if (depth === 0) tree.push({ ...item, children: [] });
    else tree.at(-1).children.push(item);
  }
  return tree;
}

// Panjang "blok" di posisi index: item utama beserta seluruh submenunya,
// atau 1 untuk item submenu.
export function blockLength(flat, index) {
  if (flat[index].depth !== 0) return 1;
  let length = 1;
  while (flat[index + length]?.depth === 1) length += 1;
  return length;
}

// Pindahkan blok di `from` ke depan posisi `to` (0..flat.length, dihitung
// pada daftar sebelum dipindah). Item utama membawa submenunya.
export function move(flat, from, to) {
  const length = blockLength(flat, from);
  if (to >= from && to <= from + length) return flat;
  const block = flat.slice(from, from + length);
  const rest = [...flat.slice(0, from), ...flat.slice(from + length)];
  const at = to > from ? to - length : to;
  return normalize([...rest.slice(0, at), ...block, ...rest.slice(at)]);
}

// Geser satu langkah. Item utama melompati blok tetangganya.
export function moveBy(flat, index, direction) {
  if (direction < 0) {
    if (index === 0) return flat;
    if (flat[index].depth === 1) return move(flat, index, index - 1);
    let previous = index - 1;
    while (flat[previous].depth !== 0) previous -= 1;
    return move(flat, index, previous);
  }
  const next = index + blockLength(flat, index);
  if (next >= flat.length) return flat;
  return move(flat, index, next + blockLength(flat, next));
}

export const setDepth = (flat, index, depth) =>
  normalize(flat.map((item, i) => (i === index ? { ...item, depth } : item)));

export const update = (flat, index, patch) => flat.map((item, i) => (i === index ? { ...item, ...patch } : item));

// Hapus satu item. Submenu milik item utama yang dihapus naik menjadi item
// utama, supaya tidak ikut hilang diam-diam.
export function remove(flat, index) {
  const length = blockLength(flat, index);
  return normalize([
    ...flat.slice(0, index),
    ...flat.slice(index + 1, index + length).map((child) => ({ ...child, depth: 0 })),
    ...flat.slice(index + length),
  ]);
}

// Tujuan sudah lengkap untuk disimpan?
export function isComplete(target) {
  switch (target.kind) {
    case 'home':
      return true;
    case 'url':
      return Boolean(target.url?.trim());
    case 'postType':
      return Boolean(target.postType);
    case 'page':
      return Boolean(target.id);
    default:
      return Boolean(target.postType && target.id); // post, category
  }
}
