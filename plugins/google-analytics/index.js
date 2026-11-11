// GOOGLE ANALYTICS 4
// Hanya aktif di situs produksi; preview tidak ikut tercatat.

const ID = /^G-[A-Z0-9]{6,}$/;

// Jalankan `fn` saat pengunjung pertama kali berinteraksi, atau setelah
// beberapa detik, mana yang lebih dulu.
export const onFirstInteraction = (fn) =>
  `(function(){var d=0;function go(){if(d)return;d=1;${fn}}['scroll','pointerdown','keydown','touchstart'].forEach(function(e){addEventListener(e,go,{once:true,passive:true})});setTimeout(go,5000)})()`;

export default {
  setup(api) {
    if (api.mode !== 'production') return;
    const id = String(api.options.measurementId ?? '').trim().toUpperCase();
    if (!ID.test(id)) return api.warn('ID pengukuran belum diisi atau formatnya salah (harus berawalan G-), jadi Analytics tidak dipasang.');

    const start = `var s=document.createElement('script');s.async=1;s.src='https://www.googletagmanager.com/gtag/js?id=${id}';document.head.appendChild(s);window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${id}')`;
    const script = api.options.load === 'immediate' ? `(function(){${start}})()` : onFirstInteraction(start);
    api.on('bodyEnd', () => `<script>${script}</script>`);
  },
};
