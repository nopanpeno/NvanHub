// Fun fact: kartu di bagian Tentang dan balon ucapan maskot di hero. Dua-duanya baca data/facts.json.
// Fakta pertama juga tertulis di index.html, jadi tetap terbaca kalau JS atau JSON gagal dimuat.
(() => {
  const live = document.getElementById('fact-text');
  const stack = document.getElementById('fact-stack');
  const btn = document.getElementById('fact-next');
  const count = document.getElementById('fact-count');
  if (!live || !stack || !btn || !count) return;

  const mascot = document.getElementById('mascot');
  const bubble = document.getElementById('bubble');
  const bubbleLive = document.getElementById('bubble-live');

  let facts = [];
  let current = 0; // fakta yang tampil di kartu
  let said = -1;   // fakta terakhir yang diucapkan maskot (-1: belum pernah)

  // Acak, tapi tidak pernah sama dengan yang sebelumnya.
  function pick(prev, n) {
    if (n < 2) return 0;
    if (prev < 0) return Math.floor(Math.random() * n);
    const i = Math.floor(Math.random() * (n - 1));
    return i >= prev ? i + 1 : i;
  }

  function show(i, animate) {
    current = i;
    live.textContent = facts[i];
    count.textContent = `${i + 1} dari ${facts.length}`;
    if (animate) window.NvanMotion?.fadeIn(live); // opacity saja, mati sendiri saat reduced-motion
  }

  function next() {
    show(pick(current, facts.length), true);
  }

  // Maskot tetap bisa bicara walau JSON belum atau gagal dimuat: pakai fakta bawaan di HTML.
  const pool = () => (facts.length ? facts : [live.textContent.trim()]);

  function say() {
    const list = pool();
    said = pick(said, list.length);
    const text = list[said];
    bubble.textContent = text;
    bubble.hidden = false;
    window.NvanMotion?.fadeIn(bubble);
    // Balon disembunyikan dari pembaca layar. Fakta dikabarkan lewat wilayah live yang selalu ada.
    // Dikosongkan dulu supaya fakta yang sama tetap terbaca ulang.
    bubbleLive.textContent = '';
    setTimeout(() => { bubbleLive.textContent = text; }, 50);
  }

  function hide() {
    bubble.hidden = true;
  }

  if (mascot && bubble && bubbleLive) {
    mascot.addEventListener('click', say);
    // Balon menutup saat klik di luar maskot, atau tekan Escape. Tidak ada timer yang menutupnya sendiri.
    document.addEventListener('click', (ev) => {
      if (!bubble.hidden && !ev.target.closest('.mascot-wrap')) hide();
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && !bubble.hidden) hide();
    });
  }

  fetch('data/facts.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((list) => {
      facts = list.filter((t) => typeof t === 'string' && t.trim());
      if (facts.length === 0) return;

      // Tiap fakta dipasang tak terlihat di sel grid yang sama. Tinggi kartu ikut fakta terpanjang,
      // jadi ganti fakta tidak menggeser tombol atau bagian di bawahnya.
      for (const text of facts) {
        const sizer = document.createElement('p');
        sizer.className = 'sizer';
        sizer.setAttribute('aria-hidden', 'true');
        sizer.textContent = text;
        stack.append(sizer);
      }

      show(0, false);
      if (facts.length > 1) {
        btn.hidden = false;
        count.hidden = false;
        btn.addEventListener('click', next);
      }
    })
    .catch(() => {
      // Gagal: fakta bawaan di HTML tetap tampil, tombol kartu tetap tersembunyi.
    });
})();
