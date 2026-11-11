import { createHash } from 'node:crypto';

// SAFELINK
// Setiap tautan ke situs luar diganti menjadi /go/?id=KODE dan dibuka di
// tab baru. Halaman /go/ menampilkan hitung mundur dan captcha, lalu
// meneruskan ke alamat tujuan.
//
// Keamanan: halaman /go/ hanya meneruskan KODE yang ada di daftar
// links.json buatan build ini. Alamat tujuan tidak pernah dibaca dari URL,
// jadi halaman ini tidak bisa disalahgunakan untuk mengalihkan ke situs
// sembarang (open redirect).

const ANCHOR = /<a\b([^>]*?)\bhref="(https?:\/\/[^"]+)"([^>]*)>/g;
const decode = (value) => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const hostOf = (address) => {
  try {
    return new URL(address).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export default {
  setup(api) {
    const { options, escapeHtml } = api;
    const links = {}; // kode -> alamat tujuan
    const own = hostOf(api.siteUrl);
    const excluded = (options.exclude ?? []).map((domain) => String(domain).trim().toLowerCase().replace(/^www\./, '')).filter(Boolean);
    const skip = (host) => !host || host === own || excluded.some((domain) => host === domain || host.endsWith(`.${domain}`));

    api.on('page', (page, ctx) => {
      if (ctx.route.path === '/go/') return page;
      return page.replace(ANCHOR, (tag, before, href, after) => {
        const target = decode(href);
        // Tautan bertanda data-no-safelink (mis. tombol bagikan) tidak dialihkan.
        if (tag.includes('data-no-safelink') || skip(hostOf(target))) return tag;
        const code = createHash('sha256').update(target).digest('hex').slice(0, 12);
        links[code] = target;
        const rest = `${before}${after}`.replace(/\s(?:target|rel)="[^"]*"/g, '');
        return `<a${rest} href="${escapeHtml(api.url('/go/'))}?id=${code}" target="_blank" rel="noopener nofollow">`;
      });
    });

    api.addRoute({
      path: '/go/',
      title: 'Menuju situs tujuan',
      index: false,
      render: () => safelinkPage({ seconds: Math.max(0, Number(options.seconds) || 0), captcha: Boolean(options.captcha) }),
    });

    api.on('done', ({ write }) => write('go/links.json', JSON.stringify(links)));
  },
};

// Isi halaman /go/. Gayanya ditulis sendiri (dengan warna tema sebagai
// dasar bila tersedia) supaya tampil benar di tema apa pun.
function safelinkPage({ seconds, captcha }) {
  return `<style>
.sl{max-width:30rem;margin:3rem auto;padding:0 1rem;text-align:center}
.sl-card{border:1px solid var(--color-base-300,#e5e5e5);border-radius:1.75rem;padding:2rem 1.5rem}
.sl h1{font-size:1.5rem;font-weight:800;line-height:1.3}
.sl-host{display:inline-block;margin-top:.75rem;padding:.35rem 1rem;border-radius:9999px;background:var(--color-base-200,#f5f5f5);font-weight:700;word-break:break-all}
.sl-count{font-size:3rem;font-weight:900;color:var(--color-primary,#6a58d6);margin:1rem 0 .25rem}
.sl p{color:color-mix(in oklab,currentColor 70%,transparent);margin-top:.5rem}
.sl form{display:flex;gap:.5rem;justify-content:center;align-items:center;margin-top:1rem;flex-wrap:wrap}
.sl input{width:5.5rem;padding:.6rem .9rem;border:1px solid var(--color-base-300,#ccc);border-radius:9999px;text-align:center;font:inherit}
.sl button,.sl-go{display:inline-block;padding:.7rem 1.5rem;border:0;border-radius:9999px;background:var(--color-primary,#6a58d6);color:var(--color-primary-content,#fff);font:inherit;font-weight:800;cursor:pointer;text-decoration:none}
.sl-error{color:var(--color-error,#d64b5a)!important;font-weight:700}
.sl [hidden]{display:none}
</style>
<section class="sl"><div class="sl-card">
<h1>Anda akan meninggalkan situs ini</h1>
<span class="sl-host" id="sl-host">…</span>
<div id="sl-wait"><div class="sl-count" id="sl-count" aria-live="polite">${seconds}</div><p>Mohon tunggu sebentar.</p></div>
<form id="sl-captcha" hidden><label for="sl-answer" id="sl-question"></label><input id="sl-answer" inputmode="numeric" autocomplete="off" required><button type="submit">Periksa</button></form>
<p id="sl-message" class="sl-error" role="alert" hidden></p>
<p id="sl-ready" hidden><a class="sl-go" id="sl-go" rel="noopener nofollow">Lanjutkan ke situs tujuan</a></p>
<noscript><p class="sl-error">Halaman ini membutuhkan JavaScript untuk meneruskan Anda.</p></noscript>
</div></section>
<script>(async()=>{const $=i=>document.getElementById(i),show=(e,v)=>{e.hidden=!v},fail=t=>{show($('sl-wait'),0);$('sl-host').textContent='Tautan tidak dikenali';$('sl-message').textContent=t;show($('sl-message'),1)};
let url;try{url=(await(await fetch('links.json')).json())[new URLSearchParams(location.search).get('id')]}catch(e){}
if(!url)return fail('Tautan ini tidak ada di daftar situs ini, jadi tidak diteruskan.');
$('sl-host').textContent=new URL(url).hostname;
const ready=()=>{show($('sl-captcha'),0);show($('sl-message'),0);$('sl-go').href=url;show($('sl-ready'),1);$('sl-go').focus()};
const ask=()=>{const a=2+Math.floor(Math.random()*8),b=1+Math.floor(Math.random()*9);$('sl-question').textContent='Berapa '+a+' + '+b+'?';show($('sl-captcha'),1);$('sl-answer').focus();
$('sl-captcha').onsubmit=e=>{e.preventDefault();if(+$('sl-answer').value===a+b)return ready();$('sl-message').textContent='Jawaban belum tepat, coba lagi.';show($('sl-message'),1);$('sl-answer').value='';ask()}};
let t=${seconds};const tick=()=>{$('sl-count').textContent=t;if(t-->0)return setTimeout(tick,1000);show($('sl-wait'),0);${captcha ? 'ask()' : 'ready()'}};tick()})()</script>`;
}
