// GOOGLE ADSENSE (Auto ads)
// Hanya aktif di situs produksi. Unit iklan manual belum didukung.

const ID = /^ca-pub-\d{10,}$/;

const onFirstInteraction = (fn) =>
  `(function(){var d=0;function go(){if(d)return;d=1;${fn}}['scroll','pointerdown','keydown','touchstart'].forEach(function(e){addEventListener(e,go,{once:true,passive:true})});setTimeout(go,5000)})()`;

export default {
  setup(api) {
    if (api.mode !== 'production') return;
    const id = String(api.options.publisherId ?? '').trim().toLowerCase();
    if (!ID.test(id)) return api.warn('ID penerbit belum diisi atau formatnya salah (harus berawalan ca-pub-), jadi AdSense tidak dipasang.');

    const start = `var s=document.createElement('script');s.async=1;s.crossOrigin='anonymous';s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${id}';document.head.appendChild(s)`;
    const script = api.options.load === 'immediate' ? `(function(){${start}})()` : onFirstInteraction(start);

    // Halaman antara dan halaman 404 tidak boleh memuat iklan.
    api.on('bodyEnd', (ctx) => (['custom', 'notFound'].includes(ctx.route.kind) ? '' : `<script>${script}</script>`));
    api.on('head', () => `<meta name="google-adsense-account" content="${id}">\n`);
    if (api.options.adsTxt) {
      api.on('done', ({ write }) => write('ads.txt', `google.com, ${id.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`));
    }
  },
};
