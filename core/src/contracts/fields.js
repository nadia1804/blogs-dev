import { z } from 'zod';

// Definisi field pengaturan untuk tema dan plugin. Shell membuat form dari
// definisi ini, jadi tema dan plugin tidak membawa kode antarmuka sendiri.
//
// Jenis field:
//   text | textarea | number | url | boolean
//   select      pilihan tunggal dari `options`
//   list        daftar teks, satu per baris
//   image       unggah gambar; nilainya path media
//   postTypes   pilih beberapa post type; nilainya daftar ID (kosong = semua)
//   template    teks dengan variabel sisipan dari `variables`, mis. [YYYY]
export const field = z.object({
  key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/),
  label: z.string().min(1),
  type: z.enum(['text', 'textarea', 'number', 'url', 'boolean', 'select', 'list', 'image', 'postTypes', 'template']),
  hint: z.string().optional(),
  default: z.unknown().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  suffix: z.string().optional(),
  variables: z.array(z.object({ token: z.string(), label: z.string() })).optional(),
  // Field hanya tampil bila field lain bernilai tertentu: { key, equals }.
  showIf: z.object({ key: z.string(), equals: z.unknown() }).optional(),
});

// Kelompok field dengan judul (satu kartu di form).
export const section = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  label: z.string().min(1),
  fields: z.array(field).min(1),
});

// Nilai pengaturan: default dari definisi, ditimpa isian admin.
export function resolveOptions(fields, saved = {}) {
  return {
    ...Object.fromEntries(fields.filter((item) => item.default !== undefined).map((item) => [item.key, item.default])),
    ...saved,
  };
}
