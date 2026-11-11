// Bagian-bagian halaman tulisan: daftar isi, tombol bagikan dan cetak.

const MIN_HEADINGS = 2; // daftar isi baru berguna bila ada beberapa bagian

// Daftar isi dari heading konten. Subjudul tingkat 3 menjorok.
function tocList(ctx, items) {
  const { html } = ctx;
  return html`<ol class="flex flex-col gap-1.5 text-sm">
    ${items.map(
      (item) =>
        html`<li class="${item.level > 2 ? 'pl-4' : ''}">
          <a href="#${item.id}" class="block rounded-lg py-0.5 text-base-content/70 hover:text-primary">${item.text}</a>
        </li>`,
    )}
  </ol>`;
}

export const hasToc = (ctx, toc) => ctx.options.showToc !== false && toc.length >= MIN_HEADINGS;

// Daftar isi di sidebar, untuk layar lebar. Ikut bergulir bersama halaman.
export function tocSidebar(ctx, toc) {
  const { html } = ctx;
  return html`<aside class="no-print hidden lg:block">
    <nav aria-label="Daftar isi" class="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[1.75rem] border border-base-300 p-5">
      <p class="mb-3 text-sm font-extrabold">Daftar isi</p>
      ${tocList(ctx, toc)}
    </nav>
  </aside>`;
}

// Daftar isi di dalam tulisan, untuk ponsel dan tablet. Bisa dilipat.
export function tocInline(ctx, toc) {
  const { html, icon } = ctx;
  return html`<details class="no-print my-6 rounded-[1.75rem] border border-base-300 p-5 lg:hidden" open>
    <summary class="flex cursor-pointer list-none items-center justify-between text-sm font-extrabold [&::-webkit-details-marker]:hidden">
      Daftar isi ${icon('chevron-down', 'size-4 opacity-60')}
    </summary>
    <nav aria-label="Daftar isi" class="mt-3">${tocList(ctx, toc)}</nav>
  </details>`;
}

// Tautan bagikan. Alamat halaman diambil dari canonical; bila alamat situs
// belum diisi (mis. di preview), penanda __URL__ diganti skrip di layout.
const SHARE = [
  { label: 'WhatsApp', icon: 'tabler:brand-whatsapp', href: (u, t) => `https://wa.me/?text=${t}%20${u}` },
  { label: 'Facebook', icon: 'tabler:brand-facebook', href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  { label: 'X', icon: 'tabler:brand-x', href: (u, t) => `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
  { label: 'Telegram', icon: 'tabler:brand-telegram', href: (u, t) => `https://t.me/share/url?url=${u}&text=${t}` },
];

const round = 'grid size-10 cursor-pointer place-items-center rounded-full border border-base-300 transition-colors hover:border-primary hover:text-primary';

export function shareBar(ctx, title) {
  const { html, icon, meta, options } = ctx;
  const share = options.showShare !== false;
  const print = options.showPrint !== false;
  if (!share && !print) return '';

  const address = meta.canonical ? encodeURIComponent(meta.canonical) : '__URL__';
  const text = encodeURIComponent(title);

  return html`<div class="no-print mt-10 flex flex-wrap items-center gap-2 border-t border-base-300 pt-6">
    ${share
      ? html`<span class="mr-1 text-sm font-extrabold">Bagikan</span>
          ${SHARE.map(
            (item) =>
              html`<a
                href="${item.href(address, text)}"
                target="_blank"
                rel="noopener"
                data-share
                data-no-safelink
                class="${round}"
                aria-label="Bagikan ke ${item.label}"
                title="${item.label}"
                >${icon(item.icon, 'size-5')}</a
              >`,
          )}
          <button type="button" data-copy class="${round}" aria-label="Salin tautan" title="Salin tautan">
            <span class="when-idle">${icon('link', 'size-5')}</span>
            <span class="when-done text-success">${icon('check', 'size-5')}</span>
          </button>`
      : ''}
    ${print
      ? html`<button type="button" data-print class="${round} ${share ? 'ml-auto' : ''}" aria-label="Cetak halaman" title="Cetak">
          ${icon('printer', 'size-5')}
        </button>`
      : ''}
  </div>`;
}

// Tata letak halaman tulisan: satu kolom, atau dua kolom dengan daftar isi
// di kanan bila tulisan punya cukup subjudul.
export function articleLayout(ctx, toc, content) {
  const { html } = ctx;
  if (!hasToc(ctx, toc)) return html`<div class="mx-auto max-w-3xl px-4 pt-8 sm:pt-12">${content}</div>`;
  return html`<div class="mx-auto max-w-6xl px-4 pt-8 sm:pt-12 lg:grid lg:grid-cols-[minmax(0,48rem)_16rem] lg:justify-center lg:gap-10">
    <div class="mx-auto w-full max-w-3xl lg:mx-0">${content}</div>
    ${tocSidebar(ctx, toc)}
  </div>`;
}
