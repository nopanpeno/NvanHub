// Kotak grid di bawah mouse menyala sebentar. Hanya mouse, bukan loop.
(() => {
  const M = window.NvanMotion;
  if (!M || !M.canMotion()) return; // tanpa GSAP atau gerak dikurangi: tidak ada animasi
  const { ease } = M;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const gridBg = document.querySelector('.bg-grid');

  // Kotak grid di bawah mouse menyala sebentar lalu pudar (opacity 0.22 ke 0, 600ms). Sepuluh kotak
  // dipakai bergantian. Hanya mouse. Bukan loop: tidak ada gerak kalau mouse diam.
  // Kotak anak .bg-grid, jadi koordinatnya ruang grid: x = 32k + 2 dan y = 32j + 2 (garis grid ada di
  // 32k + 1, digeser 1px), dan y layar + geseran grid (scrollY * 0.25 mod 32) = y grid.
  const GLOW_MAX = 0.22;
  const glowCells = [];
  if (gridBg) {
    for (let i = 0; i < 10; i++) {
      const c = document.createElement('div');
      c.className = 'grid-glow';
      gridBg.append(c);
      glowCells.push(c);
    }
  }
  let glowNext = 0;
  let glowCol = -1;
  let glowRow = -1;
  const glowAt = (ev) => {
    if (ev.pointerType !== 'mouse' || reduce.matches || !glowCells.length) return;
    const shift = (window.scrollY * 0.25) % 32;
    const col = Math.floor((ev.clientX - 1) / 32);
    const row = Math.floor((ev.clientY + shift - 1) / 32);
    if (col === glowCol && row === glowRow) return; // masih di kotak yang sama
    glowCol = col;
    glowRow = row;
    const cell = glowCells[glowNext];
    glowNext = (glowNext + 1) % glowCells.length;
    gsap.killTweensOf(cell);
    gsap.set(cell, { x: col * 32 + 2, y: row * 32 + 2, opacity: GLOW_MAX });
    gsap.to(cell, { opacity: 0, duration: 0.6, ease: ease.in });
  };
  window.addEventListener('pointermove', glowAt, { passive: true });

  M.onReduce(() => {
    window.removeEventListener('pointermove', glowAt);
    glowCells.forEach((c) => { gsap.killTweensOf(c); c.remove(); });
  });
})();
