import { z } from 'zod';

const optionalUrl = z.union([z.literal(''), z.url()]);

const site = z
  .object({
    title: z.string().default('Blogs'),
    tagline: z.string().default(''),
    description: z.string().default(''),
    language: z.string().default('id'),
    url: optionalUrl.default(''), // wajib diisi sebelum publish (canonical, sitemap)
    logo: z.string().default(''),
    icon: z.string().default(''),
    ogImage: z.string().default(''),
  })
  .prefault({});

const hero = z
  .object({
    title: z.string().default(''),
    subtitle: z.string().default(''),
  })
  .prefault({});

const seoGlobal = z
  .object({
    titleTemplate: z.string().default('%title% | %site%'),
    indexSite: z.boolean().default(true),
    twitterHandle: z.string().default(''),
    organizationName: z.string().default(''),
    socialProfiles: z.array(z.string()).default([]), // alamat profil resmi (sameAs)
    verification: z
      .object({
        google: z.string().default(''),
        bing: z.string().default(''),
      })
      .prefault({}),
  })
  .prefault({});

// Bilangan bulat dalam rentang, dengan pesan yang langsung menyebut batasnya.
const range = (min, max, unit = '') =>
  z
    .number('Isi dengan angka')
    .int('Harus bilangan bulat')
    .min(min, `Minimal ${min}${unit}`)
    .max(max, `Maksimal ${max}${unit}`);

const quality = range(1, 100);

const images = z
  .object({
    webpQuality: quality.default(78),
    avif: z.boolean().default(false),
    avifQuality: quality.default(55),
    breakpoints: z
      .array(range(160, 3840, ' px'))
      .min(1, 'Isi minimal satu lebar')
      .default([360, 640, 960, 1280]),
    maxWidth: range(320, 3840, ' px').default(1600),
  })
  .prefault({});

const caching = z
  .object({
    prefetch: z.boolean().default(true),
    serviceWorker: z.boolean().default(false),
  })
  .prefault({});

const watcher = z
  .object({
    idleSeconds: range(1, 60, ' detik').default(3),
    intervalSeconds: range(5, 600, ' detik').default(30),
  })
  .prefault({});

// Token deploy TIDAK disimpan di sini, melainkan di data/.secrets.json.
const publish = z
  .object({
    // 'manual' = bangun saja, lalu folder dist diunggah sendiri ke host mana pun.
    target: z.enum(['none', 'manual', 'netlify', 'vercel', 'github-pages', 'cloudflare-pages']).default('none'),
    siteId: z.string().default(''), // Netlify: Site ID; Vercel: nama proyek
    teamId: z.string().default(''), // Vercel, hanya untuk akun tim
  })
  .prefault({});

const github = z
  .object({
    enabled: z.boolean().default(false), // on = shell kedua (/admin) ikut aktif
    repository: z.string().default(''), // "owner/nama-repo"
    branch: z.string().default('main'),
  })
  .prefault({});

const pluginState = z.object({
  enabled: z.boolean().default(false), // semua plugin nonaktif secara default
  options: z.record(z.string(), z.unknown()).default({}),
});

// Tampilan shell (backend). Tidak memengaruhi situs; itu urusan `theme`.
const shell = z
  .object({
    theme: z.string().regex(/^[a-z]+$/).default('github'), // nama tema daisyUI atau preset custom
  })
  .prefault({});

export const settings = z.object({
  shell,
  site,
  hero,
  seo: seoGlobal,
  images,
  caching,
  watcher,
  publish,
  github,
  theme: z
    .object({
      active: z.string().default('default'),
      options: z.record(z.string(), z.unknown()).default({}),
    })
    .prefault({}),
  plugins: z.record(z.string(), pluginState).default({}),
});
