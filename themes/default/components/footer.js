// Footer. Dua isi (Pengaturan tema > Footer):
//   brand   logo, tagline, dan baris hak cipta
//   custom  teks sendiri dengan variabel sisipan

// Variabel yang bisa disisipkan admin ke teks footer.
function fillTemplate(ctx, text) {
  const { html, raw, site } = ctx;
  const replacements = {
    '[YYYY]': String(new Date().getFullYear()),
    '[SITE]': String(html`${site.title}`),
    '[HEART]': '<span class="heartbeat" role="img" aria-label="cinta">♥</span>',
  };
  // Teks di-escape dulu; baru setelah itu variabel diganti dengan HTML tepercaya.
  let out = String(html`${text}`).replace(/\n/g, '<br>');
  for (const [token, value] of Object.entries(replacements)) out = out.split(token).join(value);
  return raw(out);
}

function menu(ctx) {
  const { html, raw } = ctx;
  const items = ctx.menu('footer');
  if (!items.length) return '';
  return html`<nav aria-label="Menu kaki">
    <ul class="flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
      ${items.map(
        (item) =>
          html`<li>
            <a href="${item.href}" class="hover:text-primary" ${raw(item.newTab ? 'target="_blank" rel="noopener"' : '')}
              >${item.label}</a
            >
          </li>`,
      )}
    </ul>
  </nav>`;
}

export function footer(ctx) {
  const { html, site, options } = ctx;
  const year = new Date().getFullYear();

  if (options.footerPreset === 'custom') {
    return html`<footer class="mt-16 border-t border-base-300 bg-base-200">
      <div class="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center">
        ${menu(ctx)}
        <p class="text-sm text-base-content/70">${fillTemplate(ctx, options.footerText || '')}</p>
      </div>
    </footer>`;
  }

  return html`<footer class="mt-16 border-t border-base-300 bg-base-200">
    <div class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
      <div class="max-w-sm">
        ${site.logoSrc
          ? html`<span class="flex h-8">
              ${ctx.picture(site.logoSrc, { alt: site.title, sizes: '160px', className: 'h-full w-auto' })}
            </span>`
          : html`<p class="text-lg font-black">${site.title}</p>`}
        ${site.tagline ? html`<p class="mt-2 text-sm text-base-content/70">${site.tagline}</p>` : ''}
      </div>
      ${menu(ctx)}
    </div>
    <p class="border-t border-base-300 px-4 py-4 text-center text-xs text-base-content/60">© ${year} ${site.title}</p>
  </footer>`;
}
