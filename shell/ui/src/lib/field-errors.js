// Ubah error API menjadi { namaField: pesan }. Kunci "_" = pesan umum.
// Path bersarang digabung titik, mis. "seo.title" atau "links.0.url".
export function toFieldErrors(error) {
  if (error.code === 'INVALID' && Array.isArray(error.details)) {
    const errors = {};
    for (const issue of error.details) errors[issue.path.join('.') || '_'] ??= issue.message;
    return errors;
  }
  if (error.code === 'CONFLICT' && /slug/i.test(error.message)) return { slug: error.message };
  return { _: error.message };
}
