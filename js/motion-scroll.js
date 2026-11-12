// Efek saat scroll: grid dan bintang bergeser (parallax), garis kemajuan di atas layar,
// kata hero dan Tentang menuju putih, kotak nama di hero. Semuanya hanya cat ulang saat scroll, bukan loop.
(() => {
  const M = window.NvanMotion;
  if (!M || !M.canMotion()) return; // tanpa GSAP atau gerak dikurangi: tidak ada animasi
  const { ease, dur, clamp01 } = M;

  // Latar dan penanda scroll: grid bergeser 25% kecepatan scroll (kotak 32px, jadi mulus),
  // garis di atas layar memanjang sesuai posisi. Bukan loop: bergerak hanya saat user scroll.
  const gridBg = document.querySelector('.bg-grid');
  const starsFar = document.querySelector('.bg-stars-far');
  const starsNear = document.querySelector('.bg-stars-near');
  const heroEl = document.querySelector('.hero');
  // Kata hero menuju putih satu per satu, urut baca: judul dulu, lalu lead.
  // Kata di .accent (nama) dilewati: tetap biru.
  const heroWords = heroEl
    ? [...heroEl.querySelectorAll('h1 .word')].filter((w) => !w.closest('.accent')).concat(M.splitWords(heroEl.querySelector('.lead') || document.createElement('p')))
    : [];
  const lastW = new Array(heroWords.length).fill(-1);
  // Kata di Tentang: tiap paragraf punya progres sendiri, dari posisinya di layar.
  const aboutGroups = [...document.querySelectorAll('.about p')].map((p) => {
    const words = M.splitWords(p);
    return { p, words, last: new Array(words.length).fill(-1) };
  });
  // t (0 sampai 1) dibagi ke semua kata: tiap kata punya jendela 30%, mulai berurutan.
  // Nilai dibulatkan 2 desimal dan hanya ditulis kalau berubah.
  const paintWords = (words, last, t) => {
    const n = words.length;
    words.forEach((w, i) => {
      const v = Math.round(clamp01((t - (i / n) * 0.7) / 0.3) * 100) / 100;
      if (v === last[i]) return;
      last[i] = v;
      w.style.setProperty('--w', v);
    });
  };
  // Nama di hero: kotak putih di belakang teks. Saat scroll, biru menyapu dari kiri ke kanan
  // (scaleX), dan tiap huruf berganti putih tepat di tepi sapuan lewat variabel --c (0 sampai 1).
  // Hanya jalan kalau gerak boleh. Tanpa ini nama tampil biru muda seperti biasa.
  const accent = heroEl?.querySelector('h1 .accent');
  const accentChars = accent ? [...accent.querySelectorAll('.char')] : [];
  const lastC = new Array(accentChars.length).fill(-1);
  let plate = null;
  let fill = null;
  let lastP = -1;
  if (accent && accentChars.length) {
    plate = document.createElement('span');
    plate.className = 'plate';
    plate.setAttribute('aria-hidden', 'true');
    fill = document.createElement('span');
    fill.className = 'plate-fill';
    plate.append(fill);
    accent.prepend(plate);
    accent.classList.add('accent-plate');
    // Kotak muncul bersama huruf pertama.
    M.intro?.fromTo(plate, { opacity: 0 }, { opacity: 1, duration: dur.slow, ease: ease.out }, 0);
  }
  const paintAccent = (t) => {
    if (!plate) return;
    const p = Math.round(clamp01(t) * 1000) / 1000;
    const edge = p * accent.offsetWidth; // tepi sapuan, dari sisi kiri kotak
    // Baca semua ukuran dulu, baru tulis.
    const cs = accentChars.map((ch) => Math.round(clamp01((edge - ch.offsetLeft) / Math.max(ch.offsetWidth, 1)) * 100) / 100);
    if (p !== lastP) {
      lastP = p;
      gsap.set(fill, { scaleX: p });
    }
    cs.forEach((c, i) => {
      if (c === lastC[i]) return;
      lastC[i] = c;
      accentChars[i].style.setProperty('--c', c);
    });
  };
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
      paintWords(heroWords, lastW, clamp01(window.scrollY / Math.max(heroEl.offsetHeight * 0.6, 1)));
    }
    // Sapuan biru di nama: selesai di titik yang sama dengan kata hero (60% tinggi hero).
    if (heroEl) paintAccent(window.scrollY / Math.max(heroEl.offsetHeight * 0.6, 1));
    // Kata di Tentang: paragraf mulai menyala saat ujung atasnya naik dari 92% tinggi layar,
    // penuh putih di 37%. Di dasar halaman semua putih, supaya paragraf terakhir tidak
    // tertahan kalau halaman tidak bisa digulung lebih jauh.
    if (aboutGroups.length) {
      const vh = window.innerHeight;
      const atEnd = max > 0 && window.scrollY >= max - 2;
      for (const g of aboutGroups) {
        const top = g.p.getBoundingClientRect().top;
        paintWords(g.words, g.last, atEnd ? 1 : clamp01((vh * 0.92 - top) / (vh * 0.55)));
      }
    }
  };
  const onScrollPaint = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(paintScroll);
  };
  window.addEventListener('scroll', onScrollPaint, { passive: true });
  window.addEventListener('resize', onScrollPaint);
  // Tinggi halaman berubah tanpa scroll (kartu selesai dimuat, filter): hitung ulang posisi.
  const pageSize = 'ResizeObserver' in window ? new ResizeObserver(onScrollPaint) : null;
  pageSize?.observe(document.body);
  paintScroll();

  M.onReduce(() => {
    window.removeEventListener('scroll', onScrollPaint);
    window.removeEventListener('resize', onScrollPaint);
    bar.remove();
    gsap.set([gridBg, starsFar, starsNear].filter(Boolean), { clearProps: 'all' });
    pageSize?.disconnect();
    [...heroWords, ...aboutGroups.flatMap((g) => g.words)].forEach((w) => w.style.removeProperty('--w'));
    if (plate) {
      gsap.killTweensOf([plate, fill]);
      plate.remove();
      plate = null;
      accent.classList.remove('accent-plate');
      accentChars.forEach((c) => c.style.removeProperty('--c'));
    }
  });
})();
