// Fun fact di bagian Tentang. Baca data/facts.json, tombol mengganti fakta tanpa mengulang yang sama.
// Fakta pertama juga tertulis di index.html, jadi tetap terbaca kalau JS atau JSON gagal dimuat.
(() => {
  const live = document.getElementById('fact-text');
  const stack = document.getElementById('fact-stack');
  const btn = document.getElementById('fact-next');
  const count = document.getElementById('fact-count');
  if (!live || !stack || !btn || !count) return;

  let facts = [];
  let current = 0;

  function show(i, animate) {
    current = i;
    live.textContent = facts[i];
    count.textContent = `${i + 1} dari ${facts.length}`;
    if (animate) window.NvanMotion?.fadeIn(live); // opacity saja, mati sendiri saat reduced-motion
  }

  // Acak, tapi tidak pernah fakta yang sama dua kali berturut-turut.
  function next() {
    let i = Math.floor(Math.random() * (facts.length - 1));
    if (i >= current) i += 1;
    show(i, true);
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
      // Gagal: fakta bawaan di HTML tetap tampil, tombol tetap tersembunyi.
    });
})();
