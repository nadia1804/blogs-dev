// Kartu post dalam tiga ukuran: 'big', 'medium', 'small'.
//
// Kartu adalah "container": ikon dan tag di dalamnya memakai satuan cqw
// (persen lebar kartu), sehingga ikut mengecil saat kartu sempit, mis.
// lima kartu per baris di layar lebar.

// `sizes` = lebar tampil gambar kartu, supaya browser mengambil varian yang pas.
const SIZES = {
  big: {
    media: 'aspect-[16/10] sm:aspect-[16/9]',
    title: 'text-xl sm:text-3xl',
    body: 'p-4 sm:p-6',
    excerpt: true,
    sizes: '(min-width: 1024px) 660px, 100vw',
  },
  // Di layar lebar kartu sedang sejajar dengan kartu besar: gambarnya yang
  // memanjang mengisi sisa tinggi, bukan ruang kosong di bawah teks.
  medium: {
    media: 'aspect-[4/3] lg:aspect-auto lg:min-h-40 lg:flex-1',
    title: 'text-base sm:text-xl',
    body: 'p-3 sm:p-5 lg:flex-none',
    excerpt: true,
    sizes: '(min-width: 1024px) 470px, 50vw',
  },
  small: {
    media: 'aspect-[4/3]',
    title: 'text-sm sm:text-base',
    body: 'p-3 sm:p-4',
    excerpt: false,
    sizes: '(min-width: 1024px) 280px, 50vw',
  },
};

// Gambar membesar sedikit saat kartu diarahkan kursor.
const ZOOM = 'transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100';

// Angka tetap dari sebuah ID, untuk memilih warna yang sama setiap build.
const hash = (text) => [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);

// Tag kategori. `fluid` = ukurannya mengikuti lebar kartu.
export function tag(ctx, category, { fluid = false } = {}) {
  const { html, pastels, url } = ctx;
  const pastel = pastels[category.color] ?? pastels.sky;
  const size = fluid
    ? 'px-[clamp(0.45rem,3.2cqw,0.75rem)] py-[clamp(0.15rem,1.2cqw,0.25rem)] text-[clamp(0.625rem,4cqw,0.75rem)]'
    : 'px-3 py-1 text-xs';
  return html`<a
    href="${url(category.path)}"
    class="relative z-10 inline-flex rounded-full font-extrabold ${size}"
    style="background:${pastel.bg};color:${pastel.text}"
    >${category.name}</a
  >`;
}

// Gambar cover, atau blok warna pastel dari post type bila post tanpa gambar.
function media(ctx, post, size, priority) {
  const { html, picture, icon, pastels } = ctx;
  if (post.cover?.src) {
    return picture(post.cover.src, {
      alt: post.cover.alt,
      sizes: SIZES[size].sizes,
      className: `absolute inset-0 h-full w-full object-cover ${ZOOM}`,
      priority,
    });
  }
  const colors = post.postType.fallbackColors;
  const pastel = pastels[colors[hash(post.id) % colors.length]] ?? pastels.sky;
  return html`<div class="absolute inset-0 grid place-items-center ${ZOOM}" style="background:${pastel.bg};color:${pastel.text}">
    ${icon(post.postType.icon, 'size-[18cqw] min-h-7 min-w-7 max-h-20 max-w-20 opacity-50')}
  </div>`;
}

export function card(ctx, post, size = 'small', { priority = false } = {}) {
  const { html, url, formatDate } = ctx;
  const style = SIZES[size];

  return html`<article
    class="@container group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-base-300 bg-base-100 transition-shadow hover:shadow-lg hover:shadow-primary/10"
  >
    <div class="${style.media} relative overflow-hidden bg-base-200">${media(ctx, post, size, priority)}</div>
    <div class="flex flex-1 flex-col gap-2 ${style.body}">
      ${post.categories.length
        ? html`<div class="flex flex-wrap gap-1.5">
            ${post.categories.slice(0, 2).map((category) => tag(ctx, category, { fluid: true }))}
          </div>`
        : ''}
      <h3 class="${style.title} font-extrabold leading-snug">
        <a href="${url(post.path)}" class="after:absolute after:inset-0 group-hover:text-primary">
          ${post.title || 'Tanpa judul'}
        </a>
      </h3>
      ${style.excerpt && post.excerpt
        ? html`<p class="line-clamp-2 text-sm text-base-content/70 max-sm:hidden">${post.excerpt}</p>`
        : ''}
      <p class="mt-auto pt-1 text-xs font-semibold text-base-content/60">
        ${formatDate(post.date)}<span class="max-sm:hidden"> · ${post.readingMinutes} menit baca</span>
      </p>
    </div>
  </article>`;
}

// Jumlah kartu per baris diatur di Pengaturan tema > Kartu:
//   ponsel  (< 640 px), tablet (640-1023 px), desktop (>= 1024 px).
// Nama class ditulis lengkap supaya terbaca saat CSS dikompilasi.
const COLUMNS = {
  mobile: { 1: 'grid-cols-1', 2: 'grid-cols-2' },
  tablet: { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' },
  desktop: { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' },
};

export function gridClass(options) {
  const pick = (map, value, fallback) => map[Number(value)] ?? map[fallback];
  return `grid gap-3 sm:gap-5 ${pick(COLUMNS.mobile, options.colsMobile, 2)} ${pick(COLUMNS.tablet, options.colsTablet, 3)} ${pick(COLUMNS.desktop, options.colsDesktop, 4)}`;
}

// Grid kartu seukuran, dipakai beranda, arsip, dan "tulisan lainnya".
export const cardGrid = (ctx, posts) =>
  ctx.html`<div class="${gridClass(ctx.options)}">${posts.map((post) => card(ctx, post, 'small'))}</div>`;
