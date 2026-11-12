// Inti animasi: token gerak, elemen muncul saat scroll, scroll mulus, dan pembersihan.
// Butuh GSAP (assets/vendor/gsap.min.js). Bagian lain dimuat setelah file ini dan memakai
// window.NvanMotion: motion-hero.js (judul dan maskot), motion-scroll.js (efek saat scroll),
// motion-glow.js (kotak grid menyala).
// Tanpa GSAP, atau saat user minta gerak dikurangi, halaman tampil biasa tanpa gerak.
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canMotion = () => Boolean(window.gsap) && !reduce.matches;
  const ease = { out: 'power2.out', in: 'power2.in' }; // tanpa bounce atau elastic
  const dur = { fast: 0.15, base: 0.2, slow: 0.3 };
  const STAGGER = 0.03; // batas 30ms per item
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  // Bagian lain (hero, scroll, glow) mendaftarkan pembersihan di sini. Dijalankan saat user
  // menyalakan reduced-motion ketika animasi sedang jalan.
  const cleanups = [];
  const onReduce = (fn) => cleanups.push(fn);

  let cardWatch = null;
  let sectionWatch = null;
  let bottomWatch = null; // pemantau bagian bawah (tentang, footer)

  const clear = (els) => {
    gsap.set(els, { clearProps: 'opacity,transform' });
    els.forEach((e) => e.classList.remove('revealing'));
  };

  // Muncul: fade + geser kecil, stagger 30ms. Setelah selesai, style GSAP dibersihkan
  // supaya hover CSS jalan normal lagi.
  // Stagger 30ms per item, tapi total dibatasi 200ms supaya daftar panjang tidak jadi teatrikal.
  const show = (els) => gsap.to(els, {
    opacity: 1,
    x: 0,
    y: 0,
    duration: dur.slow,
    stagger: Math.min(STAGGER, 0.2 / Math.max(els.length - 1, 1)),
    ease: ease.out,
    onComplete: () => clear(els),
  });

  // Pantau posisi elemen saat scroll (satu cek per frame). Elemen muncul begitu ujung atasnya
  // lewat tepi bawah layar. Elemen yang sudah terlihat, atau terlewat karena scroll melompat
  // (tombol End), juga muncul. IntersectionObserver tidak dipakai: ia diam kalau elemen
  // berpindah dari bawah layar ke atas layar dalam satu lompatan.
  // Mengembalikan { check, disconnect }.
  function watch(els) {
    let pending = [...els];
    let queued = false;
    const check = () => {
      queued = false;
      const hit = pending.filter((e) => e.getBoundingClientRect().top < window.innerHeight);
      if (!hit.length) return;
      pending = pending.filter((e) => !hit.includes(e));
      show(hit);
      if (!pending.length) disconnect();
    };
    const onMove = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(check);
    };
    const disconnect = () => {
      window.removeEventListener('scroll', onMove);
      window.removeEventListener('resize', onMove);
    };
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);
    check();
    return { check, disconnect };
  }

  // Sembunyikan dulu, lalu muncul saat terlihat. class revealing mematikan transisi CSS
  // selama GSAP jalan, supaya keduanya tidak saling tarik.
  // from: { x, y } untuk semua elemen, atau fungsi (el, i) yang memberi { x, y } per elemen.
  function enter(els, from = { y: 12 }) {
    if (!canMotion() || els.length === 0) return null;
    els.forEach((e, i) => {
      gsap.set(e, { opacity: 0, ...(typeof from === 'function' ? from(e, i) : from) });
      e.classList.add('revealing');
    });
    return watch(els);
  }

  // Arah masuk kartu tergantung posisinya di grid: kolom kiri dari kiri, kolom kanan dari kanan,
  // kolom tengah dari bawah (baris ganjil dari atas). Satu kolom: kiri dan kanan bergantian.
  // Posisi dibaca dari layout, jadi ikut berubah saat jumlah kolom berubah.
  const SLIDE = 24; // sama dengan gutter halaman, jadi kartu tidak pernah melewati tepi layar
  function cardFrom(card, i) {
    const g = card.parentElement.getBoundingClientRect();
    const r = card.getBoundingClientRect();
    const gap = 24;
    const cols = Math.max(1, Math.round((g.width + gap) / (r.width + gap)));
    if (cols === 1) return { x: i % 2 ? SLIDE : -SLIDE };
    const col = Math.round((r.left - g.left) / (r.width + gap));
    const row = Math.floor(i / cols);
    if (col === 0) return { x: -SLIDE };
    if (col === cols - 1) return { x: SLIDE };
    return { y: row % 2 ? -24 : 24 };
  }

  // Judul bagian masuk dari kiri, yang lain naik sedikit.
  const sectionFrom = (e) => (e.matches('.label') ? { x: -24 } : { y: 12 });

  // Bagian bawah (tentang, footer) disembunyikan di awal, tapi baru dipantau setelah kartu
  // pertama dirender. Sebelum itu halaman masih pendek dan semuanya terhitung "sudah terlihat".
  let bottomEls = [];
  function startBottom() {
    if (!bottomEls.length) return;
    bottomWatch = watch(bottomEls);
    bottomEls = [];
  }

  // Dipakai main.js. animate=false: kartu ganti tanpa gerak.
  function revealCards(cards, animate = true) {
    cardWatch?.disconnect();
    cardWatch = animate ? enter(cards, cardFrom) : null;
    startBottom();
    bottomWatch?.check(); // tinggi halaman berubah, bagian bawah mungkin kini terlihat
  }

  function fadeIn(el) {
    if (!canMotion()) return;
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: dur.fast, ease: ease.out, clearProps: 'opacity' });
  }

  // Dipakai main.js saat topik ganti: kartu lama pudar dulu (opacity saja, 150ms, ease-in), baru
  // diganti. done selalu dipanggil, juga saat gerak mati atau tidak ada kartu.
  function fadeOut(els, done) {
    cardWatch?.disconnect(); // kartu lama tidak boleh dimunculkan lagi oleh pemantau scroll
    cardWatch = null;
    if (!canMotion() || els.length === 0) { done(); return; }
    gsap.killTweensOf(els);
    gsap.to(els, { opacity: 0, duration: dur.fast, ease: ease.in, onComplete: done });
  }

  window.NvanMotion = { canMotion, ease, dur, stagger: STAGGER, clamp01, onReduce, revealCards, fadeIn, fadeOut };

  if (!canMotion()) {
    root.classList.remove('motion'); // GSAP gagal dimuat: jangan sembunyikan apa pun
    return;
  }

  // Bagian halaman di bawah hero muncul saat di-scroll.
  const SECTIONS = '.projects > .label, .controls, .about > *, .site-footer > *';
  sectionWatch = enter([...document.querySelectorAll('.projects > .label, .controls')], sectionFrom);
  bottomEls = [...document.querySelectorAll('.about > *, .site-footer > *')];
  bottomEls.forEach((e) => {
    gsap.set(e, { opacity: 0, ...sectionFrom(e) });
    e.classList.add('revealing');
  });
  setTimeout(startBottom, 2500); // jaring pengaman kalau kartu tak pernah dirender

  // Scroll mulus untuk tautan #bagian (tombol Lihat proyek, menu). Tween GSAP, tanpa plugin.
  // Skip link dibiarkan: ia harus memindah fokus, bukan menggulung.
  let scrollTween = null;
  function smoothTo(target) {
    const startY = window.scrollY;
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const endY = Math.min(maxY, Math.max(0, target.getBoundingClientRect().top + startY - 16));
    const proxy = { y: startY };
    scrollTween?.kill();
    scrollTween = gsap.to(proxy, {
      y: endY,
      duration: Math.min(0.6, Math.max(0.3, Math.abs(endY - startY) / 2000)),
      ease: 'power2.inOut',
      onUpdate: () => window.scrollTo(0, proxy.y),
      onComplete: () => { scrollTween = null; },
    });
  }
  const stopScroll = () => { scrollTween?.kill(); scrollTween = null; };
  // User menggulung sendiri: berhenti, jangan lawan.
  ['wheel', 'touchstart', 'keydown'].forEach((t) => window.addEventListener(t, stopScroll, { passive: true }));
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest?.('a[href^="#"]');
    if (!a || a.classList.contains('skip-link') || !canMotion()) return;
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    const target = a.hash.length > 1 && document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (!target) return;
    ev.preventDefault();
    smoothTo(target);
    history.pushState(null, '', a.hash);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  // Cerita kartu terbuka: isi naik 8px sambil muncul (transform dan opacity saja, 200ms).
  // Tinggi kartu tetap berubah langsung (bawaan <details>), tidak dianimasi.
  document.addEventListener('toggle', (ev) => {
    const box = ev.target;
    if (!(box instanceof HTMLDetailsElement) || !box.open || !box.classList.contains('story') || reduce.matches) return;
    const text = box.querySelector('p');
    if (text) gsap.fromTo(text, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: dur.base, ease: ease.out, clearProps: 'opacity,transform' });
  }, true);

  // User nyalakan reduced-motion saat animasi jalan: hentikan semua, tampilkan langsung.
  reduce.addEventListener('change', () => {
    if (!reduce.matches) return;
    cleanups.forEach((fn) => fn());
    stopScroll();
    cardWatch?.disconnect();
    sectionWatch?.disconnect();
    bottomWatch?.disconnect();
    bottomEls = [];
    const all = [...document.querySelectorAll(`.card, ${SECTIONS}`)];
    gsap.killTweensOf(all);
    clear(all);
  });
})();
