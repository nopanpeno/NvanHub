// Reveal bagian saat di-scroll. Kelas "ready" di <html> menyalakan animasi judul dan kartu.
// Reduced-motion: semua konten langsung tampil, tanpa animasi.
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = [...document.querySelectorAll('.reveal')];

  root.classList.add('ready');

  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
    return;
  }

  // Sekali muncul, tidak disembunyikan lagi.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  reveals.forEach((el) => io.observe(el));
})();
