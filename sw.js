// Service worker NvanHub: supaya web bisa dipasang di layar utama dan tetap terbuka saat offline.
// Strategi: jaringan dulu, cache cadangan. Online selalu dapat versi terbaru (tidak perlu ganti
// nomor versi tiap deploy). Offline, halaman diambil dari cache. Hanya file milik sendiri.
const CACHE = 'nvanhub-v1';
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/main.js',
  'js/mascot.js',
  'js/motion.js',
  'js/motion-glow.js',
  'js/motion-hero.js',
  'js/motion-scroll.js',
  'data/projects.json',
  'data/mascot.json',
  'assets/vendor/gsap.min.js',
  'assets/fonts/jersey-10-latin-400-normal.woff2',
  'assets/bg/grid-dot.svg',
  'assets/bg/stars-far.svg',
  'assets/bg/stars-near.svg',
  'assets/icons/arrow.svg',
  'assets/icons/arrow-up.svg',
  'assets/icons/external.svg',
  'assets/icons/icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('index.html')))
  );
});
