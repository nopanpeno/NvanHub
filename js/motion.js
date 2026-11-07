// Fondasi animasi. Butuh GSAP dari CDN.
// Tanpa GSAP, atau saat user minta gerak dikurangi, halaman tampil biasa tanpa gerak.
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Dipakai tahap berikutnya (kartu, filter).
  window.NvanMotion = {
    canMotion: () => Boolean(window.gsap) && !reduce.matches,
    ease: { out: 'power2.out', in: 'power2.in' }, // tanpa bounce atau elastic
    dur: { fast: 0.15, base: 0.2, slow: 0.3 },
  };

  if (!NvanMotion.canMotion()) {
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
    return gsap.timeline({ defaults: { ease: NvanMotion.ease.out } })
      .to(chars, { opacity: 1, y: 0, duration: NvanMotion.dur.slow, stagger: 0.025 })
      .fromTo(lead, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: NvanMotion.dur.slow }, '-=0.15')
      .fromTo(btn, { opacity: 0 }, { opacity: 1, duration: NvanMotion.dur.slow }, '-=0.15');
  }

  const intro = heroIntro();

  // User nyalakan reduced-motion saat animasi jalan: lompat ke akhir, semua langsung tampil.
  reduce.addEventListener('change', () => {
    if (reduce.matches && intro) intro.progress(1).kill();
  });
})();
