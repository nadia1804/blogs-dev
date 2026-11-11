const pill = 'inline-flex h-10 min-w-10 items-center justify-center rounded-full px-4 text-sm font-bold';

export function pagination(ctx) {
  const { html, url, icon } = ctx;
  const info = ctx.route.pagination;
  if (!info || info.total <= 1) return '';

  return html`<nav class="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Halaman arsip">
    ${info.prev
      ? html`<a href="${url(info.prev)}" class="${pill} border border-base-300 hover:bg-base-200" rel="prev">
          ${icon('chevron-left', 'size-4')} Sebelumnya
        </a>`
      : ''}
    ${info.pages.map((entry) =>
      entry.page === info.page
        ? html`<span class="${pill} bg-primary text-primary-content" aria-current="page">${entry.page}</span>`
        : html`<a href="${url(entry.path)}" class="${pill} hover:bg-base-200">${entry.page}</a>`,
    )}
    ${info.next
      ? html`<a href="${url(info.next)}" class="${pill} border border-base-300 hover:bg-base-200" rel="next">
          Berikutnya ${icon('chevron-right', 'size-4')}
        </a>`
      : ''}
  </nav>`;
}

// Jejak navigasi di atas judul.
export function breadcrumb(ctx) {
  const { html, url, route } = ctx;
  const trail = route.breadcrumb ?? [];
  if (!trail.length) return '';
  return html`<nav aria-label="Jejak navigasi" class="text-sm font-semibold text-base-content/60">
    <ol class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <li><a href="${url('/')}" class="hover:text-primary">Beranda</a></li>
      ${trail.map((item, index) =>
        index === trail.length - 1
          ? html`<li class="flex items-center gap-2 before:content-['/']">
              <span class="line-clamp-1" aria-current="page">${item.label}</span>
            </li>`
          : html`<li class="flex items-center gap-2 before:content-['/']">
              <a href="${url(item.path)}" class="hover:text-primary">${item.label}</a>
            </li>`,
      )}
    </ol>
  </nav>`;
}
