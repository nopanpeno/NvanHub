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
    sectionWatch2 = watch(bottomEls);
    bottomEls = [];
  }
  let sectionWatch2 = null;

  // Dipakai main.js. animate=false (mengetik di kolom cari): kartu ganti tanpa gerak.
  function revealCards(cards, animate = true) {
    cardWatch?.disconnect();
    cardWatch = animate ? enter(cards, cardFrom) : null;
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

  // Pecah teks jadi kata saja (tanpa huruf). Teks tetap terbaca pembaca layar apa adanya.
  function splitWords(el) {
    const words = [];
    for (const node of [...el.childNodes]) {
      if (node.nodeType !== Node.TEXT_NODE) continue;
      const frag = document.createDocumentFragment();
      for (const part of node.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { frag.append(' '); continue; }
        const w = document.createElement('span');
        w.className = 'word';
        w.textContent = part;
        frag.append(w);
        words.push(w);
      }
      node.replaceWith(frag);
    }
    return words;
  }

  // Hero masuk: huruf judul satu per satu, lalu teks. Tombol tampil langsung, tanpa animasi masuk.
  function heroIntro() {
    const h1 = document.querySelector('.hero h1');
    const lead = document.querySelector('.hero .lead');
    if (!h1 || !lead) return null;

    const chars = splitChars(h1);
    gsap.set(chars, { opacity: 0, y: 12 });
    gsap.set(h1, { opacity: 1 });

    const tl = gsap.timeline({ defaults: { ease: ease.out } })
      .to(chars, { opacity: 1, y: 0, duration: dur.slow, stagger: STAGGER })
      .fromTo(lead, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: dur.slow }, '-=0.15');
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

  // Latar dan penanda scroll: grid bergeser 25% kecepatan scroll (kotak 32px, jadi mulus),
  // garis di atas layar memanjang sesuai posisi. Bukan loop: bergerak hanya saat user scroll.
  const gridBg = document.querySelector('.bg-grid');
  const starsFar = document.querySelector('.bg-stars-far');
  const starsNear = document.querySelector('.bg-stars-near');
  const heroEl = document.querySelector('.hero');
  // Kata hero menuju putih satu per satu, urut baca: judul dulu, lalu lead.
  const heroWords = heroEl
    ? [...heroEl.querySelectorAll('h1 .word'), ...splitWords(heroEl.querySelector('.lead') || document.createElement('p'))]
    : [];
  const lastW = new Array(heroWords.length).fill(-1);
  const bar = document.createElement('div');
  bar.className = 'progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.append(bar);
  let scrollQueued = false;
  const paintScroll = () => {
    scrollQueued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    gsap.set(bar, { scaleX: max > 0 ? Math.min(1, window.scrollY / max) : 0 });
    if (gridBg) gsap.set(gridBg, { y: -((window.scrollY * 0.25) % 32) });
    // Dua lapis bintang: jauh pelan (10%), dekat lebih cepat (40%). Modulo = ukuran ubin.
    if (starsFar) gsap.set(starsFar, { y: -((window.scrollY * 0.1) % 288) });
    if (starsNear) gsap.set(starsNear, { y: -((window.scrollY * 0.4) % 400) });
    // Kata hero menuju putih satu per satu. Semua kata putih saat 60% tinggi hero terlewat.
    // Tiap kata punya jendela 30% dari total, mulai berurutan (kata pertama duluan).
    if (heroEl && heroWords.length) {
      const t = Math.min(1, Math.max(0, window.scrollY / Math.max(heroEl.offsetHeight * 0.6, 1)));
      const n = heroWords.length;
      heroWords.forEach((w, i) => {
        const v = Math.round(Math.min(1, Math.max(0, (t - (i / n) * 0.7) / 0.3)) * 100) / 100;
        if (v === lastW[i]) return;
        lastW[i] = v;
        w.style.setProperty('--w', v);
      });
    }
  };
  const onScrollPaint = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(paintScroll);
  };
  window.addEventListener('scroll', onScrollPaint, { passive: true });
  window.addEventListener('resize', onScrollPaint);
  paintScroll();

  // Mata maskot menoleh ke kursor, selangkah piksel. Hanya untuk mouse. Bukan loop.
  let lookX = 0;
  let lookY = 0;
  const lookAt = (ev) => {
    if (!bot || ev.pointerType === 'touch') return;
    const r = bot.getBoundingClientRect();
    const dx = ev.clientX - (r.left + r.width / 2);
    const dy = ev.clientY - (r.top + r.height / 2);
    const x = Math.abs(dx) < 48 ? 0 : Math.sign(dx);
    const y = Math.abs(dy) < 48 ? 0 : Math.sign(dy);
    if (x === lookX && y === lookY) return;
    lookX = x;
    lookY = y;
    gsap.set(eyes, { x, y });
  };
  if (bot) window.addEventListener('pointermove', lookAt, { passive: true });

  // User nyalakan reduced-motion saat animasi jalan: hentikan semua, tampilkan langsung.
  reduce.addEventListener('change', () => {
    if (!reduce.matches) return;
    if (intro) intro.progress(1).kill();
    loop?.kill();
    hop?.kill();
    stopScroll();
    window.removeEventListener('pointermove', lookAt);
    window.removeEventListener('scroll', onScrollPaint);
    window.removeEventListener('resize', onScrollPaint);
    bar.remove();
    gsap.set([gridBg, starsFar, starsNear].filter(Boolean), { clearProps: 'all' });
    heroWords.forEach((w) => w.style.removeProperty('--w'));
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
