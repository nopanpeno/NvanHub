// Maskot robot di hero: klik, balon ucapan memuat sapaan acak dari data/mascot.json.
// Satu sapaan juga tertulis di sini, jadi maskot tetap bisa bicara kalau JSON gagal dimuat.
(() => {
  const mascot = document.getElementById('mascot');
  const bubble = document.getElementById('bubble');
  const bubbleLive = document.getElementById('bubble-live');
  if (!mascot || !bubble || !bubbleLive) return;

  const FALLBACK = 'Halo! Aku robot penjaga NvanHub.';

  let lines = [];
  let said = -1; // sapaan terakhir yang diucapkan (-1: belum pernah)

  // Acak, tapi tidak pernah sama dengan yang sebelumnya.
  function pick(prev, n) {
    if (n < 2) return 0;
    if (prev < 0) return Math.floor(Math.random() * n);
    const i = Math.floor(Math.random() * (n - 1));
    return i >= prev ? i + 1 : i;
  }

  const pool = () => (lines.length ? lines : [FALLBACK]);

  function say() {
    const list = pool();
    said = pick(said, list.length);
    const text = list[said];
    bubble.textContent = text;
    bubble.hidden = false;
    hinting = false;
    window.NvanMotion?.fadeIn(bubble);
    // Balon disembunyikan dari pembaca layar. Ucapan dikabarkan lewat wilayah live yang selalu ada.
    // Dikosongkan dulu supaya sapaan yang sama tetap terbaca ulang.
    bubbleLive.textContent = '';
    setTimeout(() => { bubbleLive.textContent = text; }, 50);
  }

  function hide() {
    bubble.hidden = true;
    hinting = false;
  }

  // Petunjuk tombol: kursor atau fokus keyboard di tombol hero, robot memberi tahu fungsinya.
  // Hilang saat kursor atau fokus pergi. Hanya tampilan: tombolnya sendiri sudah punya nama untuk pembaca layar.
  const HINT = 'Klik ini, nanti aku antar ke daftar proyek.';
  let hinting = false;
  function hint(text = HINT) {
    bubble.textContent = text;
    bubble.hidden = false;
    hinting = true;
    window.NvanMotion?.fadeIn(bubble);
  }
  const cta = document.querySelector('.hero .btn');
  if (cta) {
    cta.addEventListener('pointerenter', (ev) => { if (ev.pointerType === 'mouse') hint(); });
    cta.addEventListener('pointerleave', () => { if (hinting) hide(); });
    cta.addEventListener('focus', () => { if (cta.matches(':focus-visible')) hint(); });
    cta.addEventListener('blur', () => { if (hinting) hide(); });
  }

  // Petunjuk tombol "Buka website" di kartu. Robot hero sudah di luar layar saat user melihat kartu,
  // jadi robot yang sama muncul di pojok kanan bawah (salinan gambar, hero sudah tidak terlihat).
  // Kalau robot hero masih terlihat, balon hero yang dipakai. Hanya tampilan: tombol sudah punya
  // nama untuk pembaca layar. Muncul saat mouse atau fokus keyboard, hilang saat pergi atau Escape.
  const SITE_HINT = 'Website-nya jalan langsung di browser. Dibuka di tab baru.';
  const wrap = mascot.closest('.mascot-wrap');
  const dock = document.createElement('div');
  dock.className = 'dock';
  dock.hidden = true;
  dock.setAttribute('aria-hidden', 'true');
  const dockBot = document.createElement('div');
  dockBot.className = 'mascot';
  dockBot.append(mascot.querySelector('svg').cloneNode(true));
  const dockBubble = document.createElement('p');
  dockBubble.className = 'bubble';
  dock.append(dockBot, dockBubble);
  document.body.append(dock);

  function heroInView() {
    const r = wrap.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }
  function showSite() {
    if (heroInView()) return hint(SITE_HINT);
    dockBubble.textContent = SITE_HINT;
    dock.hidden = false;
    window.NvanMotion?.fadeIn(dock);
  }
  function hideSite() {
    dock.hidden = true;
    if (hinting) hide();
  }
  const siteLink = (el) => el.closest?.('.links a[aria-label^="Buka website"]');
  const grid = document.getElementById('grid');
  if (grid) {
    grid.addEventListener('pointerover', (ev) => { if (ev.pointerType === 'mouse' && siteLink(ev.target)) showSite(); });
    grid.addEventListener('pointerout', (ev) => { if (siteLink(ev.target)) hideSite(); });
    grid.addEventListener('focusin', (ev) => { const a = siteLink(ev.target); if (a?.matches(':focus-visible')) showSite(); });
    grid.addEventListener('focusout', (ev) => { if (siteLink(ev.target)) hideSite(); });
  }

  // Sekali klik, sapaan awal tidak muncul lagi.
  let touched = false;
  mascot.addEventListener('click', () => {
    touched = true;
    say();
  });
  // Balon menutup saat klik di luar maskot, atau tekan Escape. Tidak ada timer yang menutupnya sendiri.
  document.addEventListener('click', (ev) => {
    if (!bubble.hidden && !ev.target.closest('.mascot-wrap')) hide();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    dock.hidden = true;
    if (!bubble.hidden) hide();
  });

  fetch('data/mascot.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((list) => {
      lines = list.filter((t) => typeof t === 'string' && t.trim());
    })
    .catch(() => {
      // Gagal: sapaan bawaan di atas tetap dipakai.
    })
    .finally(() => {
      // Sapaan pertama: balon muncul sendiri sekali saat halaman siap. Tidak menutup sendiri,
      // dan dilewati kalau user sudah klik maskot lebih dulu.
      if (!touched && bubble.hidden) say();
    });
})();
