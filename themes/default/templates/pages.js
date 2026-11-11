import { articleLayout, hasToc, shareBar, tocInline } from '../components/article.js';
import { cardGrid } from '../components/card.js';
import { breadcrumb, pagination } from '../components/pagination.js';

// Page umum (Tentang, Kontak, ...).
export function page(ctx) {
  const { html, route, renderArticle } = ctx;
  const { intro, body, toc } = renderArticle(route.page.content);
  const article = html`<article class="min-w-0">
    ${breadcrumb(ctx)}
    <h1 class="mt-4 text-3xl font-black leading-tight sm:text-5xl">${route.page.title || 'Tanpa judul'}</h1>
    <div class="prose-content mt-8">${intro}${hasToc(ctx, toc) ? tocInline(ctx, toc) : ''}${body}</div>
    ${shareBar(ctx, route.page.title)}
  </article>`;
  return articleLayout(ctx, toc, article);
}

// Profil author di atas daftar tulisannya.
function authorProfile(ctx, author, total) {
  const { html, picture } = ctx;
  return html`<header class="mt-5 mb-10 flex flex-col items-center gap-5 rounded-[2rem] border border-base-300 p-6 text-center sm:flex-row sm:items-start sm:p-8 sm:text-left">
    ${author.avatar?.src
      ? picture(author.avatar.src, { alt: '', sizes: '112px', className: 'size-28 shrink-0 rounded-full object-cover', lazy: false })
      : html`<span class="grid size-28 shrink-0 place-items-center rounded-full bg-primary/10 text-5xl font-black text-primary"
          >${author.name.slice(0, 1).toUpperCase()}</span
        >`}
    <div class="min-w-0">
      <h1 class="text-3xl font-black leading-tight sm:text-4xl">${author.name}</h1>
      <p class="mt-1 text-sm font-semibold text-base-content/60">${total} tulisan</p>
      ${author.bio ? html`<p class="mt-3 max-w-2xl text-base-content/80">${author.bio}</p>` : ''}
      ${author.links.length
        ? html`<ul class="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            ${author.links.map(
              (link) =>
                html`<li>
                  <a
                    href="${link.url}"
                    target="_blank"
                    rel="noopener"
                    class="inline-flex rounded-full border border-base-300 px-4 py-1.5 text-sm font-bold hover:border-primary hover:text-primary"
                    >${link.label || link.url}</a
                  >
                </li>`,
            )}
          </ul>`
        : ''}
    </div>
  </header>`;
}

// Pil kategori untuk menyaring arsip sebuah post type. "Semua" = arsip
// post type; tiap kategori menuju arsip kategorinya.
function categoryFilter(ctx, typeId, activeId) {
  const { html, raw, url, pastels, postTypes, categories } = ctx;
  const type = postTypes.find((item) => item.id === typeId);
  const list = categories.filter((category) => category.postType === typeId);
  if (!type || !list.length) return '';

  const pill = 'inline-flex rounded-full px-4 py-1.5 text-sm font-extrabold transition-opacity';
  return html`<nav aria-label="Saring menurut kategori" class="mb-7">
    <ul class="flex flex-wrap gap-2">
      <li>
        <a
          href="${url(type.path)}"
          class="${pill} ${activeId ? 'border border-base-300 hover:border-primary' : 'bg-neutral text-neutral-content'}"
          ${raw(activeId ? '' : 'aria-current="page"')}
          >Semua</a
        >
      </li>
      ${list.map((category) => {
        const pastel = pastels[category.color] ?? pastels.sky;
        const active = category.id === activeId;
        return html`<li>
          <a
            href="${url(category.path)}"
            class="${pill} ${active ? 'ring-2 ring-current ring-offset-2' : activeId ? 'opacity-70 hover:opacity-100' : ''}"
            style="background:${pastel.bg};color:${pastel.text}"
            ${raw(active ? 'aria-current="page"' : '')}
            >${category.name}</a
          >
        </li>`;
      })}
    </ul>
  </nav>`;
}

// Arsip post type, kategori, atau author.
export function archive(ctx) {
  const { html, route } = ctx;
  const { archive: info, posts } = route;
  const total = route.pagination ? route.pagination.count : posts.length;

  const header =
    info.kindOf === 'author'
      ? authorProfile(ctx, info.subject, total)
      : html`<header class="mt-4 mb-6">
          <h1 class="text-3xl font-black leading-tight sm:text-4xl">${info.heading}</h1>
          ${info.description ? html`<p class="mt-3 max-w-2xl text-base-content/70">${info.description}</p>` : ''}
        </header>`;

  const filter =
    info.kindOf === 'postType'
      ? categoryFilter(ctx, info.subject.id, null)
      : info.kindOf === 'category'
        ? categoryFilter(ctx, info.subject.postType, info.subject.id)
        : '';

  return html`<section class="mx-auto max-w-6xl px-4 pt-8 sm:pt-12">
    ${breadcrumb(ctx)} ${header} ${filter}
    ${info.kindOf === 'author' && posts.length ? html`<h2 class="mb-5 text-xl font-black sm:text-2xl">Tulisan</h2>` : ''}
    ${posts.length
      ? cardGrid(ctx, posts)
      : html`<p class="rounded-[2rem] border border-dashed border-base-300 p-10 text-center text-base-content/60">
          Belum ada tulisan di sini.
        </p>`}
    ${pagination(ctx)}
  </section>`;
}

export function notFound(ctx) {
  const { html, url } = ctx;
  return html`<section class="mx-auto max-w-xl px-4 py-20 text-center">
    <p class="text-7xl font-black text-primary">404</p>
    <h1 class="mt-4 text-2xl font-black">Halaman tidak ditemukan</h1>
    <p class="mt-2 text-base-content/70">Alamatnya mungkin berubah, atau halamannya sudah dipindahkan.</p>
    <a
      href="${url('/')}"
      class="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-extrabold text-primary-content"
      >Kembali ke beranda</a
    >
  </section>`;
}
