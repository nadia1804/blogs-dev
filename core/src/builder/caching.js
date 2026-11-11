// Caching dan prefetch untuk situs produksi (Settings > Caching).

// Prefetch: halaman tujuan dimuat diam-diam saat pengunjung mengarahkan
// kursor atau menyentuh tautan, sehingga perpindahan terasa instan.
// Browser berbasis Chromium memakai Speculation Rules (tanpa JavaScript);
// browser lain memakai skrip kecil dengan <link rel="prefetch">.
const PREFETCH_FALLBACK = `(()=>{if(HTMLScriptElement.supports&&HTMLScriptElement.supports('speculationrules'))return;const s=new Set,p=e=>{const a=e.target.closest&&e.target.closest('a[href]');if(!a||a.origin!==location.origin||a.target||s.has(a.href))return;s.add(a.href);const l=document.createElement('link');l.rel='prefetch';l.href=a.href;document.head.append(l)};addEventListener('mouseover',p,{passive:true});addEventListener('touchstart',p,{passive:true})})()`;

function prefetch(basePath) {
  const rules = {
    prefetch: [
      {
        where: { and: [{ href_matches: `${basePath}/*` }, { not: { href_matches: '*.xml' } }] },
        eagerness: 'moderate',
      },
    ],
  };
  return `<script type="speculationrules">${JSON.stringify(rules)}</script><script>${PREFETCH_FALLBACK}</script>`;
}

// HTML yang disisipkan core sebelum </body>. Preview tidak memakainya.
export function bodySnippets({ caching, basePath, mode }) {
  if (mode !== 'production') return '';
  let out = '';
  if (caching.prefetch) out += prefetch(basePath);
  if (caching.serviceWorker) {
    out += `<script>if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('${basePath}/sw.js'))</script>`;
  }
  return out;
}

// Service worker ("cache lokal"): halaman yang pernah dibuka tersimpan di
// perangkat pengunjung dan tetap bisa dibaca saat offline.
//   - Aset ber-hash (CSS, gambar olahan): selalu dari cache.
//   - Halaman: tampil dari cache dulu, lalu diperbarui di latar belakang.
// Saat dimatikan, sw.js berisi pencabut, supaya pengunjung lama tidak
// terus dilayani service worker versi sebelumnya.
export function serviceWorker({ enabled, buildId, basePath }) {
  if (!enabled) {
    return `self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister().then(()=>caches.keys()).then(k=>Promise.all(k.map(n=>caches.delete(n))))));\n`;
  }
  return `const V='blogs-${buildId}',IMM=/\\/(assets|media\\/_opt)\\//;
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==V).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
e.respondWith(caches.open(V).then(async c=>{const hit=await c.match(r);if(hit&&IMM.test(r.url))return hit;
const net=fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res});
if(hit){net.catch(()=>{});return hit}
return net.catch(()=>c.match('${basePath}/404.html').then(p=>p||Response.error()))}))});
`;
}

// Aturan cache HTTP untuk host statis. Berkas yang namanya memuat hash isi
// boleh disimpan browser selamanya; halaman HTML selalu diperiksa ulang.
const RULES = [
  { path: '/media/_opt/*', value: 'public, max-age=31536000, immutable' },
  { path: '/assets/*', value: 'public, max-age=2592000' },
];

// Berkas aturan header untuk berbagai host. Semuanya selalu ikut di hasil
// build, jadi folder dist bisa diunggah ke host mana pun tanpa diubah;
// host hanya membaca berkas yang dikenalnya.
export function headerFiles() {
  return {
    // Apache (hosting bersama, cPanel)
    '.htaccess': `ErrorDocument 404 /404.html
Options -Indexes

<IfModule mod_headers.c>
${RULES.map((rule) => `  <If "%{REQUEST_URI} =~ m#^${rule.path.replace('*', '')}#">\n    Header set Cache-Control "${rule.value}"\n  </If>`).join('\n')}
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json application/xml image/svg+xml
</IfModule>
`,
    // Netlify dan Cloudflare Pages
    _headers: RULES.map((rule) => `${rule.path}\n  Cache-Control: ${rule.value}\n`).join('\n'),
    // Vercel
    'vercel.json': `${JSON.stringify(
      {
        cleanUrls: false,
        trailingSlash: true,
        headers: RULES.map((rule) => ({
          source: rule.path.replace('*', '(.*)'),
          headers: [{ key: 'Cache-Control', value: rule.value }],
        })),
      },
      null,
      2,
    )}\n`,
  };
}
