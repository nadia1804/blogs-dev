import { footer } from './components/footer.js';
import { navbar } from './components/navbar.js';

// Satu-satunya JavaScript di situs: mengubah menu menjadi hamburger saat
// item menu tidak muat di navbar. Tanpa skrip ini pun situs tetap berfungsi
// (di layar kecil hamburger diatur CSS).
const NAV_SCRIPT = `(()=>{const h=document.querySelector('[data-header]'),n=h&&h.querySelector('[data-nav]');if(!n||!n.querySelector('li'))return;const c=()=>{h.classList.remove('is-compact');const l=n.querySelector('ul').lastElementChild;h.classList.toggle('is-compact',l.getBoundingClientRect().right>n.getBoundingClientRect().right+1)};c();new ResizeObserver(c).observe(h)})()`;

// Skrip kecil untuk tombol di halaman: salin tautan, cetak, bagikan (mengisi
// alamat halaman bila belum diketahui saat build), dan tombol kembali ke atas
// yang baru muncul setelah halaman digulir.
const PAGE_SCRIPT = `(()=>{const u=encodeURIComponent(location.href);document.querySelectorAll('a[data-share]').forEach(a=>{a.href=a.href.replace('__URL__',u)});document.addEventListener('click',e=>{const c=e.target.closest('[data-copy]');if(c&&navigator.clipboard)navigator.clipboard.writeText(location.href).then(()=>{c.dataset.done=1;setTimeout(()=>delete c.dataset.done,2000)});if(e.target.closest('[data-print]'))print()});const t=document.querySelector('[data-top]');if(t){const f=()=>t.classList.toggle('is-visible',scrollY>600);addEventListener('scroll',f,{passive:true});f()}})()`;

export function layout(ctx, content) {
  const { html, raw, site, mode, options, icon } = ctx;

  return html`<!doctype html>
<html lang="${site.language}" data-theme="blogs">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${ctx.head}
    <link rel="preload" href="${ctx.asset('fonts/nunito-latin.woff2')}" as="font" type="font/woff2" crossorigin />
    ${ctx.stylesheet ? html`<link rel="stylesheet" href="${ctx.stylesheet}" />` : ''}
  </head>
  <body id="atas" class="flex min-h-screen flex-col bg-base-100 font-sans text-base-content antialiased">
    <a
      href="#konten"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:font-bold focus:text-primary-content"
      >Langsung ke konten</a
    >
    ${navbar(ctx)}
    <main id="konten" class="flex-1">${content}</main>
    ${footer(ctx)}
    ${mode === 'preview'
      ? html`<p
          class="fixed bottom-4 left-4 z-50 rounded-full bg-neutral px-4 py-2 text-xs font-bold text-neutral-content shadow-lg"
        >
          Preview · belum dipublikasikan
        </p>`
      : ''}
    ${options.showTop !== false
      ? html`<a
          href="#atas"
          data-top
          class="to-top no-print fixed bottom-5 right-5 z-40 grid size-11 place-items-center rounded-full bg-primary text-primary-content shadow-lg shadow-primary/30"
          aria-label="Kembali ke atas"
          >${icon('arrow-up', 'size-5')}</a
        >`
      : ''}
    <script>${raw(NAV_SCRIPT)};${raw(PAGE_SCRIPT)}</script>
    ${ctx.bodyEnd}
  </body>
</html>`;
}
