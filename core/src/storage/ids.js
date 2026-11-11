import { randomBytes } from 'node:crypto';

export { slugify } from '../util/slug.js';

// ID urut waktu: prefiks timestamp base36 + 8 karakter acak.
export function newId() {
  return Date.now().toString(36).padStart(9, '0') + randomBytes(4).toString('hex');
}
