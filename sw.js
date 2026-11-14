// Service worker NvanHub: supaya web bisa dipasang di layar utama dan tetap terbuka saat offline.
// Strategi: jaringan dulu, cache cadangan. Online selalu dapat versi terbaru.
// Tiap tool (folder) punya cache sendiri. Kalau satu tool gagal di-cache, hub dan tool lain
// tetap jalan. Ganti nomor versi tool hanya kalau daftar filenya berubah.
const HUB = {
  cache: 'nvanhub-v1',
  assets: [
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
    'assets/icons/icon-512.png',
    'assets/icons/icon-maskable-512.png',
  ],
};

// Tool: kunci = nama folder. Tambah satu entri tiap tool baru.
const TOOLS = {
  pass: {
    cache: 'nvanhub-pass-v1',
    assets: [
      'pass/',
      'pass/index.html',
      'pass/privacy.html',
      'pass/icon.svg',
      'pass/css/style.css',
      'pass/js/app.js',
      'pass/js/codec.js',
      'pass/js/config.js',
      'pass/js/i18n.js',
      'pass/js/qr.js',
      'pass/js/rtc.js',
      'pass/js/transfer.js',
      'pass/vendor/qrcode.js',
      'pass/vendor/jsQR.js',
    ],
  },
  // Game (games/<id>/) tidak didaftar di sini. Disimpan saat pertama dibuka, lewat fetch di bawah.
  play: {
    cache: 'nvanhub-play-v1',
    assets: [
      'play/',
      'play/index.html',
      'play/player.html',
      'play/data.html',
      'play/cara-main.html',
      'play/games.json',
      'play/css/style.css',
      'play/css/game.css',
      'play/css/how-to-play.css',
      'play/js/app.js',
      'play/js/data.js',
      'play/js/data/bendera.js',
      'play/js/data/ibu-kota.js',
      'play/js/data/tebak-tts.js',
      'play/js/game-loader.js',
      'play/js/game-storage.js',
      'play/js/game-theme.js',
      'play/js/how-to-play.js',
      'play/js/player.js',
      'play/js/theme.js',
      'play/fonts/bricolage-grotesque-latin-wght-normal.woff2',
      'play/fonts/press-start-2p-latin-400-normal.woff2',
      'play/fonts/silkscreen-latin-400-normal.woff2',
      'play/fonts/silkscreen-latin-700-normal.woff2',
    ],
  },
};

const KEEP = [HUB.cache, ...Object.values(TOOLS).map((t) => t.cache)];

// Folder tool dari alamat, atau null kalau milik hub.
function toolOf(url) {
  const rel = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  const dir = rel.split('/')[0];
  return Object.prototype.hasOwnProperty.call(TOOLS, dir) ? dir : null;
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      // Hub wajib berhasil. Tool dicoba terpisah: gagal satu tidak menggagalkan yang lain.
      await caches.open(HUB.cache).then((c) => c.addAll(HUB.assets));
      await Promise.allSettled(
        Object.values(TOOLS).map((t) => caches.open(t.cache).then((c) => c.addAll(t.assets)))
      );
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const tool = toolOf(url);
  const cacheName = tool ? TOOLS[tool].cache : HUB.cache;
  const home = tool ? `${tool}/index.html` : 'index.html';
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(cacheName).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match(home) : undefined))
      )
  );
});
