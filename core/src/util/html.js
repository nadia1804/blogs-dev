// Templating HTML yang aman secara default. Dipakai builder dan tema.
//
//   html`<h1>${judul}</h1>`   nilai sisipan otomatis di-escape
//   raw(string)               tandai string sebagai HTML tepercaya
//
// Hasil html`` bertipe Safe, sehingga template bisa disusun bertingkat
// tanpa escape ganda. Array digabung; null, undefined, dan false diabaikan.

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ENTITIES[char]);

class Safe {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

export const raw = (value) => (value instanceof Safe ? value : new Safe(String(value ?? '')));

function render(value) {
  if (value instanceof Safe) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  if (value === null || value === undefined || value === false) return '';
  return escapeHtml(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return new Safe(out);
}

// Gabungkan nama class, mengabaikan nilai kosong.
export const cx = (...names) => names.filter(Boolean).join(' ');
