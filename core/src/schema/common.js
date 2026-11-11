import { z } from 'zod';
import * as locales from 'zod/locales';
import { PASTEL_KEYS } from '../defaults/palette.js';

// Pesan validasi dalam bahasa Indonesia (tampil di form shell).
z.config(locales.id());

// ID entitas: dibuat oleh newId(), huruf kecil + angka.
export const id = z.string().regex(/^[a-z0-9]{8,32}$/, 'ID tidak valid');

export const slug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung');

export const timestamp = z.iso.datetime();

export const pastel = z.enum(PASTEL_KEYS);

export const imageRef = z.object({
  src: z.string().default(''),
  alt: z.string().default(''),
});

// SEO per dokumen. Nilai kosong berarti "pakai fallback" (judul, excerpt, SEO global).
export const seo = z
  .object({
    title: z.string().max(120).default(''),
    description: z.string().max(320).default(''),
    canonical: z.string().default(''),
    focusKeyword: z.string().default(''),
    robots: z
      .object({
        index: z.boolean().default(true),
        follow: z.boolean().default(true),
      })
      .prefault({}),
    og: z
      .object({
        title: z.string().default(''),
        description: z.string().default(''),
        image: z.string().default(''),
      })
      .prefault({}),
  })
  .prefault({});

// Content schema (JSON-LD). `type: 'auto'` mengikuti defaultSchema milik post type.
export const schemaMarkup = z
  .object({
    type: z.string().default('auto'),
    data: z.record(z.string(), z.unknown()).default({}),
  })
  .prefault({});

// Block editor. Bentuk detailnya milik editor, jadi field lain diloloskan apa adanya.
export const block = z.looseObject({
  id: z.string(),
  type: z.string(),
});
