import { card, cardGrid, gridClass } from '../components/card.js';

// Alamat di situs ini (diawali "/") diberi awalan situs; alamat lain dipakai apa adanya.
const linkTo = (ctx, target) => (String(target).startsWith('/') ? ctx.url(target) : target);

// Hero beranda. Dua gaya (Pengaturan tema > Hero):
//   boxed  judul di dalam kotak berwarna
//   plain  judul langsung di atas latar halaman
function hero(ctx) {
  const { html, site, postTypes, pastels, url, icon, options } = ctx;
  const boxed = options.heroPreset !== 'plain';
  const box = boxed
    ? 'rounded-[2rem] bg-gradient-to-br from-[#f1edff] via-[#fdf2f8] to-[#e8f7f1] px-6 py-10 sm:rounded-[3rem] sm:px-12 sm:py-16'
    : 'px-2 py-8 sm:py-14';

  return html`<section class="mx-auto max-w-6xl px-4 pt-6 sm:pt-10">
    <div class="text-center ${box}">
      <h1 class="mx-auto max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
        ${site.hero.title || site.title}
      </h1>
      ${site.hero.subtitle
        ? html`<p class="mx-auto mt-4 max-w-xl text-base text-base-content/75 sm:text-lg">${site.hero.subtitle}</p>`
        : ''}
      ${options.heroButton && options.heroButtonLabel
        ? html`<p class="mt-7">
            <a
              href="${linkTo(ctx, options.heroButtonLink || '/')}"
              class="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-extrabold text-primary-content transition-transform hover:-translate-y-0.5"
              >${options.heroButtonLabel}${icon('arrow-right', 'size-4')}</a
            >
          </p>`
        : ''}
      ${options.heroTypeLinks
        ? html`<ul class="mt-6 flex flex-wrap justify-center gap-2">
            ${postTypes.map((type) => {
              const pastel = pastels[type.fallbackColors[0]] ?? pastels.sky;
              return html`<li>
                <a
                  href="${url(type.path)}"
                  class="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-extrabold transition-transform hover:-translate-y-0.5 ${boxed
                    ? 'bg-base-100 shadow-sm'
                    : 'border border-base-300'}"
                  style="color:${pastel.text}"
                  >${icon(type.icon, 'size-4')}${type.labelPlural || type.label}</a
                >
              </li>`;
            })}
          </ul>`
        : ''}
    </div>
  </section>`;
}

// Post untuk beranda: hanya post type yang dipilih (kosong = semua),
// sebanyak yang diatur.
function homePosts(ctx) {
  const { options, posts } = ctx;
  const chosen = Array.isArray(options.homePostTypes) ? options.homePostTypes : [];
  const count = Math.max(1, Number(options.homeCount) || 13);
  return posts.filter((post) => !chosen.length || chosen.includes(post.type)).slice(0, count);
}

// Dua susunan kartu (Pengaturan tema > Kartu):
//   featured  1 besar, 1 sedang, sisanya kecil. Di ponsel dan tablet,
//             kartu sedang ikut berbaris bersama kartu kecil.
//   uniform   semua kartu seukuran
function latest(ctx) {
  const { html, options } = ctx;
  const posts = homePosts(ctx);

  if (!posts.length) {
    return html`<p class="rounded-[2rem] border border-dashed border-base-300 p-10 text-center text-base-content/60">
      Belum ada tulisan yang diterbitkan.
    </p>`;
  }
  if (options.cardPreset === 'uniform') return cardGrid(ctx, posts);

  const [big, medium, ...rest] = posts;
  return html`<div class="${gridClass(options)}">
    <div class="contents lg:col-span-full lg:grid lg:grid-cols-12 lg:gap-5">
      <div class="col-span-full lg:col-span-7">${card(ctx, big, 'big', { priority: true })}</div>
      ${medium ? html`<div class="lg:col-span-5">${card(ctx, medium, 'medium')}</div>` : ''}
    </div>
    ${rest.map((post) => card(ctx, post, 'small'))}
  </div>`;
}

export function home(ctx) {
  const { html } = ctx;
  return html`${hero(ctx)}
    <section class="mx-auto max-w-6xl px-4 pt-10 sm:pt-14">
      <h2 class="mb-5 text-xl font-black sm:text-2xl">Terbaru</h2>
      ${latest(ctx)}
    </section>`;
}
