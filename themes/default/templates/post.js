import { cardGrid, tag } from '../components/card.js';
import { articleLayout, hasToc, shareBar, tocInline } from '../components/article.js';
import { breadcrumb } from '../components/pagination.js';

function authorBox(ctx, author) {
  const { html, url, picture } = ctx;
  return html`<a
    href="${url(author.path)}"
    class="flex items-center gap-4 rounded-[1.75rem] border border-base-300 p-4 transition-colors hover:border-primary"
  >
    ${author.avatar?.src
      ? picture(author.avatar.src, { sizes: '56px', className: 'size-14 shrink-0 rounded-full object-cover' })
      : html`<span class="grid size-14 shrink-0 place-items-center rounded-full bg-primary/10 text-xl font-black text-primary"
          >${author.name.slice(0, 1).toUpperCase()}</span
        >`}
    <span class="min-w-0">
      <span class="block font-extrabold">${author.name}</span>
      ${author.bio ? html`<span class="line-clamp-2 text-sm text-base-content/70">${author.bio}</span>` : ''}
    </span>
  </a>`;
}

export function post(ctx) {
  const { html, route, picture, formatDate, renderArticle } = ctx;
  const { post: doc, related } = route;
  const { intro, body, toc } = renderArticle(doc.content);
  const withToc = hasToc(ctx, toc);
  const byline = doc.authors.map((author) => author.name).join(', ');

  const article = html`<article class="min-w-0">
      ${breadcrumb(ctx)}
      ${doc.categories.length
        ? html`<div class="mt-5 flex flex-wrap gap-2">${doc.categories.map((category) => tag(ctx, category))}</div>`
        : ''}
      <h1 class="mt-4 text-3xl font-black leading-tight sm:text-5xl">${doc.title || 'Tanpa judul'}</h1>
      <p class="mt-4 text-sm font-semibold text-base-content/60">
        ${byline ? html`${byline} · ` : ''}<time datetime="${doc.date}">${formatDate(doc.date)}</time> ·
        ${doc.readingMinutes} menit baca
      </p>
      ${doc.cover?.src
        ? picture(doc.cover.src, {
            alt: doc.cover.alt,
            sizes: '(min-width: 768px) 736px, 100vw',
            className: 'mt-7 h-auto w-full rounded-[2rem]',
            priority: true,
          })
        : ''}
      <div class="prose-content mt-8">${intro}${withToc ? tocInline(ctx, toc) : ''}${body}</div>
      ${doc.tags.length
        ? html`<ul class="mt-10 flex flex-wrap gap-2">
            ${doc.tags.map(
              (name) => html`<li class="rounded-full bg-base-200 px-3 py-1 text-xs font-bold text-base-content/70">#${name}</li>`,
            )}
          </ul>`
        : ''}
      ${doc.authors.length
        ? html`<div class="mt-10 grid gap-3 sm:grid-cols-2">${doc.authors.map((author) => authorBox(ctx, author))}</div>`
        : ''}
      ${shareBar(ctx, doc.title)}
    </article>`;

  return html`${articleLayout(ctx, toc, article)}
    ${related.length
      ? html`<section class="mx-auto max-w-6xl px-4 pt-14">
          <h2 class="mb-5 text-xl font-black sm:text-2xl">${doc.postType.label} lainnya</h2>
          ${cardGrid(ctx, related)}
        </section>`
      : ''}`;
}
