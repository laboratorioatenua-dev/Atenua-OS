// Atenua OS: deixa o app abrir sem internet. A página é buscada na rede primeiro
// (para receber atualizações) e as bibliotecas do PDF ficam guardadas no aparelho.
const CACHE = 'atenua-os-v7';
const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
];
const BASE = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all([
    c.addAll(BASE),
    // bibliotecas do PDF: guardadas já na instalação para gerar a OS sem internet
    ...LIBS.map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && c.put(u, r)).catch(() => {})),
  ])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // envio para a nuvem passa direto
  const url = new URL(req.url);
  const local = url.origin === location.origin;
  const biblioteca = url.hostname === 'cdnjs.cloudflare.com';
  if (!local && !biblioteca) return;

  if (req.mode === 'navigate' || (local && url.pathname.endsWith('/index.html'))) {
    e.respondWith(fetch(req).then(r => {
      const copia = r.clone();
      caches.open(CACHE).then(c => c.put('./', copia));
      return r;
    }).catch(() => caches.match('./')));
    return;
  }

  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') {
      const copia = r.clone();
      caches.open(CACHE).then(c => c.put(req, copia));
    }
    return r;
  })));
});
