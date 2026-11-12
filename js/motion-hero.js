// Hero: judul masuk huruf per huruf, lalu maskot (loop, lompat saat disentuh, mata mengikuti kursor).
(() => {
  const M = window.NvanMotion;
  if (!M || !M.canMotion()) return; // tanpa GSAP atau gerak dikurangi: tidak ada animasi
  const { ease, dur } = M;
  const STAGGER = M.stagger;

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
  let intro = null;
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
  M.intro = intro; // dipakai motion-scroll.js untuk kotak nama
  loop = mascotLoop();

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

  M.splitWords = splitWords;

  M.onReduce(() => {
    if (intro) intro.progress(1).kill();
    loop?.kill();
    hop?.kill();
    window.removeEventListener('pointermove', lookAt);
    gsap.killTweensOf([bot, ring, ...segs, ...eyes].filter(Boolean));
    gsap.set([bot, ring, ...segs, ...eyes].filter(Boolean), { clearProps: 'all' });
  });
})();
