// Navbar sticky: logo di kiri, menu di kanan. Menu berubah menjadi hamburger
// di layar kecil, atau saat item menu tidak muat (lihat skrip di layout.js).

const linkClass = (active) =>
  `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors ${
    active ? 'bg-primary/10 text-primary' : 'hover:bg-base-200'
  }`;

function link(ctx, item, extra = '') {
  const { html, raw, icon } = ctx;
  return html`<a
    href="${item.href}"
    class="${linkClass(item.active)} ${extra}"
    ${raw(item.active ? 'aria-current="page"' : '')}
    ${raw(item.newTab ? 'target="_blank" rel="noopener"' : '')}
    >${item.icon ? icon(item.icon, 'size-4 shrink-0') : ''}${item.label}</a
  >`;
}

// Menu layar lebar. Submenu muncul saat diarahkan kursor atau difokus keyboard.
function desktopItem(ctx, item) {
  const { html, icon } = ctx;
  if (!item.children.length) return html`<li>${link(ctx, item)}</li>`;
  return html`<li class="group relative">
    <span class="flex items-center">${link(ctx, item)}${icon('chevron-down', '-ml-3 mr-1 size-4 opacity-60')}</span>
    <ul
      class="invisible absolute right-0 top-full z-20 min-w-48 rounded-3xl border border-base-300 bg-base-100 p-2 opacity-0 shadow-xl shadow-primary/10 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
    >
      ${item.children.map((child) => html`<li>${link(ctx, child, 'w-full')}</li>`)}
    </ul>
  </li>`;
}

function mobileItem(ctx, item) {
  const { html } = ctx;
  return html`<li>
    ${link(ctx, item, 'w-full')}
    ${item.children.length
      ? html`<ul class="ml-4 mt-1 flex flex-col gap-1 border-l-2 border-base-300 pl-2">
          ${item.children.map((child) => html`<li>${link(ctx, child, 'w-full')}</li>`)}
        </ul>`
      : ''}
  </li>`;
}

// Dua gaya navbar (Pengaturan tema > Navbar):
//   bar      bilah penuh menempel di atas
//   capsule  kapsul melayang dengan sudut bulat penuh
const PRESETS = {
  bar: {
    header: 'sticky top-0 z-40 border-b border-base-300 bg-base-100/90 backdrop-blur supports-[backdrop-filter]:bg-base-100/75',
    inner: 'relative mx-auto flex h-14 max-w-6xl items-center gap-4 px-4',
    drawer: 'absolute inset-x-0 top-full border-b border-base-300 bg-base-100 p-4 shadow-xl shadow-primary/10',
  },
  capsule: {
    header: 'sticky top-3 z-40 px-3',
    inner:
      'relative mx-auto flex h-14 max-w-6xl items-center gap-4 rounded-full border border-base-300 bg-base-100/90 px-4 shadow-lg shadow-primary/10 backdrop-blur supports-[backdrop-filter]:bg-base-100/75 sm:px-6',
    drawer: 'absolute inset-x-0 top-full mt-2 rounded-3xl border border-base-300 bg-base-100 p-4 shadow-xl shadow-primary/10',
  },
};

export function navbar(ctx) {
  const { html, site, url, icon, options } = ctx;
  const items = ctx.menu('header');
  const preset = PRESETS[options.navPreset] ?? PRESETS.bar;
  const logo = options.logo || site.logoSrc; // logo khusus navbar, atau logo situs
  const height = Math.min(64, Math.max(16, Number(options.logoHeight) || 28));
  const text = options.brandText || site.title;
  const showText = options.showBrandText || !logo;

  return html`<header data-header class="${preset.header}">
    <div class="${preset.inner}">
      <a href="${url('/')}" class="flex shrink-0 items-center gap-2 text-lg font-black" aria-label="${site.title}, beranda">
        ${logo
          ? html`<span class="flex" style="height:${height}px">
              ${ctx.picture(logo, { alt: showText ? '' : site.title, sizes: '160px', className: 'h-full w-auto', lazy: false })}
            </span>`
          : ''}
        ${showText ? html`<span>${text}</span>` : ''}
      </a>

      <nav data-nav class="nav-desktop flex min-w-0 flex-1" aria-label="Menu utama">
        <ul class="ml-auto flex items-center gap-1">
          ${items.map((item) => desktopItem(ctx, item))}
        </ul>
      </nav>

      <div class="nav-actions flex shrink-0 items-center gap-1">
        ${ctx.features.search
          ? html`<button
              type="button"
              data-search-open
              class="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-base-200"
              aria-label="Cari"
            >
              ${icon('search', 'size-5')}
            </button>`
          : ''}
        ${items.length
          ? html`<details class="nav-toggle">
              <summary
                class="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-base-200"
                aria-label="Buka menu"
              >
                ${icon('menu', 'size-6')}
              </summary>
              <nav class="${preset.drawer}" aria-label="Menu utama">
                <ul class="mx-auto flex max-w-6xl flex-col gap-1">
                  ${items.map((item) => mobileItem(ctx, item))}
                </ul>
              </nav>
            </details>`
          : ''}
      </div>
    </div>
  </header>`;
}