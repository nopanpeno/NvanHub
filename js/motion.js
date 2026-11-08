// Fondasi animasi. Butuh GSAP dari CDN.
// Tanpa GSAP, atau saat user minta gerak dikurangi, halaman tampil biasa tanpa gerak.
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canMotion = () => Boolean(window.gsap) && !reduce.matches;
  const ease = { out: 'power2.out', in: 'power2.in' }; // tanpa bounce atau elastic
  const dur = { fast: 0.15, base: 0.2, slow: 0.3 };
  const STAGGER = 0.03; // batas 30ms per item

  let intro = null;
  let cardWatch = null;
  let sectionWatch = null;

  const clear = (els) => {
    gsap.set(els, { clearProps: 'opacity,transform' });
    els.forEach((e) => e.classList.remove('revealing'));
  };

  // Muncul: fade + geser kecil, stagger 30ms. Setelah selesai, style GSAP dibersihkan
  // supaya hover CSS jalan normal lagi.
  // Stagger 30ms per item, tapi total dibatasi 200ms supaya daftar panjang tidak jadi teatrikal.
  const show = (els) => gsap.to(els, {
    opacity: 1,
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
  function enter(els, y = 12) {
    if (!canMotion() || els.length === 0) return null;
    gsap.set(els, { opacity: 0, y });
    els.forEach((e) => e.classList.add('revealing'));
    return watch(els);
  }

  // Bagian bawah (tentang, footer) disembunyikan di awal, tapi baru dipantau setelah kartu
  // pertama dirender. Sebelum itu halaman masih pendek dan semuanya terhitung "sudah terlihat".
  let bottomEls = [];
  function startBottom() {
    if (!bottomEls.length) return;
    sectionWatch2 = watch(bottomEls);
    bottomEls = [];
  }
  let sectionWatch2 = null;

  // Dipakai main.js. animate=false (mengetik di kolom cari): kartu ganti tanpa gerak.
  function revealCards(cards, animate = true) {
    cardWatch?.disconnect();
    cardWatch = animate ? enter(cards) : null;
    startBottom();
    sectionWatch2?.check(); // tinggi halaman berubah, bagian bawah mungkin kini terlihat
  }

  function fadeIn(el) {
    if (!canMotion()) return;
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: dur.fast, ease: ease.out, clearProps: 'opacity' });
  }

  window.NvanMotion = { canMotion, ease, dur, revealCards, fadeIn };

  if (!canMotion()) {
    root.classList.remove('motion'); // GSAP gagal dimuat: jangan sembunyikan apa pun
    return;
  }

  // Pecah teks jadi kata lalu huruf. Teks asli tetap terbaca lewat aria-label.
  function splitChars(el) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const chars = [];
    const walk = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.ELEMENT_NODE) { walk(child); continue; }
        if (child.nodeType !== Node.TEXT_NODE) continue;
        const frag = document.createDocumentFragment();
        for (const part of child.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.append(' '); continue; }
          const word = document.createElement('span');
          word.className = 'word';
          word.setAttribute('aria-hidden', 'true');
          for (const ch of part) {
            const c = document.createElement('span');
            c.className = 'char';
            c.textContent = ch;
            word.append(c);
            chars.push(c);
          }
          frag.append(word);
        }
        child.replaceWith(frag);
      }
    };
    walk(el);
    return chars;
  }

  // Hero masuk: huruf judul satu per satu, lalu teks dan tombol.
  function heroIntro() {
    const h1 = document.querySelector('.hero h1');
    const lead = document.querySelector('.hero .lead');
    const btn = document.querySelector('.hero .btn');
    if (!h1 || !lead || !btn) return null;

    const chars = splitChars(h1);
    gsap.set(chars, { opacity: 0, y: 12 });
    gsap.set(h1, { opacity: 1 });

    // Tombol hanya fade. Transformnya dipakai transisi hover di CSS.
    const tl = gsap.timeline({ defaults: { ease: ease.out } })
      .to(chars, { opacity: 1, y: 0, duration: dur.slow, stagger: STAGGER })
      .fromTo(lead, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: dur.slow }, '-=0.15')
      .fromTo(btn, { opacity: 0 }, { opacity: 1, duration: dur.slow }, '-=0.15');
    // Maskot turun dan muncul bersama huruf pertama.
    if (mascot) tl.fromTo(mascot, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: dur.slow }, 0);
    return tl;
  }

  // Maskot: satu loop utama (cincin holo naik turun per piksel, segmen cincin menyala
  // searah jarum jam, kedip), plus lompat kecil saat disentuh. Ini satu-satunya loop di layar.
  const mascot = document.querySelector('.hero .mascot');
  const bot = mascot?.querySelector('svg');
  const ring = mascot?.querySelector('.m-ring');
  const segs = mascot ? [...mascot.querySelectorAll('.seg')] : [];
  const eyes = mascot ? [...mascot.querySelectorAll('.eye')] : [];
  let loop = null;
  let hop = null;

  function mascotLoop() {
    if (!ring || !segs.length) return null;
    gsap.set(segs, { opacity: 0.45 });
    const tl = gsap.timeline({ repeat: -1 });
    tl.set(ring, { y: 0 }, 0).set(ring, { y: -1 }, 1.6);
    // Satu segmen menyala tiap 250ms. Dipasang lewat call: dua set di properti sama saling timpa.
    segs.forEach((_, i) => {
      tl.call(() => gsap.set(segs, { opacity: (j) => (j === i ? 1 : 0.45) }), null, i * 0.25);
    });
    tl.call(() => gsap.set(segs, { opacity: 0.45 }), null, segs.length * 0.25);
    tl.set(eyes, { scaleY: 0.15, transformOrigin: '50% 50%' }, 2.6).set(eyes, { scaleY: 1 }, 2.75);
    tl.set({}, {}, 3.2); // panjang loop 3.2 detik
    return tl;
  }

  function mascotHop() {
    if (!bot || (hop && hop.isActive())) return;
    hop = gsap.timeline()
      .to(bot, { y: -8, duration: dur.fast, ease: ease.out })
      .to(bot, { y: 0, duration: dur.fast, ease: ease.in });
  }
  mascot?.addEventListener('pointerenter', mascotHop);
  mascot?.addEventListener('click', mascotHop);

  intro = heroIntro();
  loop = mascotLoop();

  // Bagian halaman di bawah hero muncul saat di-scroll.
  const SECTIONS = '.projects > .label, .controls, .about > *, .site-footer > *';
  sectionWatch = enter([...document.querySelectorAll('.projects > .label, .controls')], 8);
  bottomEls = [...document.querySelectorAll('.about > *, .site-footer > *')];
  gsap.set(bottomEls, { opacity: 0, y: 8 });
  bottomEls.forEach((e) => e.classList.add('revealing'));
  setTimeout(startBottom, 2500); // jaring pengaman kalau kartu tak pernah dirender

  // User nyalakan reduced-motion saat animasi jalan: hentikan semua, tampilkan langsung.
  reduce.addEventListener('change', () => {
    if (!reduce.matches) return;
    if (intro) intro.progress(1).kill();
    loop?.kill();
    hop?.kill();
    gsap.killTweensOf([bot, ring, ...segs, ...eyes].filter(Boolean));
    gsap.set([bot, ring, ...segs, ...eyes].filter(Boolean), { clearProps: 'all' });
    cardWatch?.disconnect();
    sectionWatch?.disconnect();
    sectionWatch2?.disconnect();
    bottomEls = [];
    const all = [...document.querySelectorAll(`.card, ${SECTIONS}`)];
    gsap.killTweensOf(all);
    clear(all);
  });
})();
