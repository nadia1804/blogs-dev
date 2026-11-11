import { join } from 'node:path';
import * as pagefind from 'pagefind';

// PENCARIAN (Pagefind)
// Setelah semua halaman jadi, Pagefind membuat indeks statis di /pagefind/.
// Tema menampilkan tombol cari (ctx.features.search). Dialog, skrip, dan
// indeksnya tidak dimuat saat halaman dibuka, melainkan baru saat tombol
// cari ditekan, jadi pencarian tidak membebani kecepatan halaman.

export default {
  setup(api) {
    api.provide('search');
    const base = api.url('/pagefind/');
    const placeholder = String(api.options.placeholder || 'Cari tulisan…');

    // Hanya isi post dan page yang diindeks, bukan menu, kartu arsip, atau
    // daftar "tulisan lainnya". Elemen <article> pertama adalah isi halaman;
    // tema tanpa <article> diindeks dari <main>.
    api.on('page', (page, ctx) => {
      if (!['post', 'page'].includes(ctx.route.kind)) return page;
      return page.includes('<article ')
        ? page.replace('<article ', '<article data-pagefind-body ')
        : page.replace('<main ', '<main data-pagefind-body ');
    });

    api.on('bodyEnd', (ctx) =>
      ctx.route.path === '/go/'
        ? ''
        : `<style>
#blogs-search{width:min(42rem,92vw);max-height:80vh;margin:8vh auto auto;border:0;border-radius:1.75rem;padding:1.25rem;background:var(--color-base-100,#fff);color:inherit;overflow:auto;
--pagefind-ui-primary:var(--color-primary,#6a58d6);--pagefind-ui-text:currentColor;--pagefind-ui-background:var(--color-base-100,#fff);--pagefind-ui-border:var(--color-base-300,#ddd);--pagefind-ui-border-radius:1rem;--pagefind-ui-font:inherit}
#blogs-search::backdrop{background:rgb(0 0 0/.45)}
</style>
<dialog id="blogs-search" aria-label="Pencarian"><div id="blogs-search-ui"></div></dialog>
<script>(()=>{const d=document.getElementById('blogs-search');let loaded=0;const focus=()=>{const i=d.querySelector('input');i&&i.focus()};
document.addEventListener('click',e=>{if(!e.target.closest('[data-search-open]'))return;d.showModal();if(loaded)return focus();loaded=1;
const l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(`${base}pagefind-ui.css`)};document.head.append(l);
const s=document.createElement('script');s.src=${JSON.stringify(`${base}pagefind-ui.js`)};s.onload=()=>{new PagefindUI({element:'#blogs-search-ui',showImages:false,resetStyles:false,translations:{placeholder:${JSON.stringify(placeholder)},zero_results:'Tidak ada hasil untuk [SEARCH_TERM]',many_results:'[COUNT] hasil untuk [SEARCH_TERM]',one_result:'[COUNT] hasil untuk [SEARCH_TERM]',searching:'Mencari [SEARCH_TERM]…',load_more:'Tampilkan lebih banyak',clear_search:'Hapus'}});focus()};document.head.append(s)});
d.addEventListener('click',e=>{if(e.target===d)d.close()})})()</script>`,
    );

    api.on('done', async ({ outDir }) => {
      const { index, errors } = await pagefind.createIndex({ forceLanguage: api.settings.site.language || 'id' });
      if (!index) throw new Error(errors.join('; '));
      try {
        await index.addDirectory({ path: outDir });
        await index.writeFiles({ outputPath: join(outDir, 'pagefind') });
      } finally {
        await pagefind.close();
      }
    });
  },
};
